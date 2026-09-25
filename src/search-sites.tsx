import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Image,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { useAccessToken, withMySitesAuth } from "./api/auth-context";
import {
  getAudit,
  getProfile,
  getSite,
  getSitesSummary,
  invalidateCache,
  listAudits,
  listBackups,
  listExtensions,
  listSnapshots,
  listTags,
  triggerAudit,
  triggerBackup,
  triggerSnapshot,
  updateExtensions,
} from "./api/client";
import { errorMessage } from "./api/errors";
import { Extension, Site, SiteSummary } from "./api/types";
import {
  DEFAULT_LIST_SITE_ACTION,
  DEFAULT_PRIMARY_SITE_ACTION,
  DEFAULT_SECONDARY_SITE_ACTION,
  SiteActionPreferences,
  SiteOpenAction,
  isSiteOpenAction,
  siteActionDetails,
  siteManagementUrl,
} from "./site-urls";

function faviconUrl(siteUrl: string): string {
  try {
    const domain = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function yesNo(value?: boolean): string | undefined {
  return value === undefined ? undefined : value ? "Yes" : "No";
}

const ATTENTION_REASON_LABELS: Record<string, string> = {
  updates_available: "Updates available",
  core_update_available: "Core update available",
  vulnerable_extensions: "Vulnerable extensions",
  core_vulnerability: "Core vulnerability",
  core_vulnerabilities: "Core vulnerabilities",
  hacked: "Potential compromise",
  is_hacked: "Potential compromise",
  disconnected: "Disconnected",
  not_connected: "Disconnected",
  stale_snapshot: "Stale snapshot",
  paused: "Paused",
  is_paused: "Paused",
  debug_enabled: "Debug mode enabled",
  cache_disabled: "Caching disabled",
  caching_disabled: "Caching disabled",
  user_registration_enabled: "User registration open",
  offline_mode: "Offline mode",
  non_2fa_admins: "Admins without 2FA",
  malicious_cron_jobs: "Malicious cron jobs",
  ssl_expiring: "SSL expiring soon",
  ssl_expiring_soon: "SSL expiring soon",
  ssl_expired: "SSL certificate expired",
  no_backup: "No backup",
  backup_overdue: "Backup overdue",
};

const REASON_ACRONYMS: Record<string, string> = {
  ssl: "SSL",
  php: "PHP",
  cms: "CMS",
  "2fa": "2FA",
  url: "URL",
  api: "API",
};

function humanizeSlug(slug: string): string {
  return slug
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(
      (word) =>
        REASON_ACRONYMS[word.toLowerCase()] ??
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

// The API returns attention reasons as raw slugs (e.g. "core_update_available").
// Map the ones we know to friendly labels, and title-case anything unmapped so
// new reasons stay readable without a code change.
function formatAttentionReason(reason: string): string {
  return ATTENTION_REASON_LABELS[reason.toLowerCase()] ?? humanizeSlug(reason);
}

function formatAttentionReasons(reasons: string[]): string {
  return reasons.map(formatAttentionReason).join(", ");
}

function markdownValue(value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function markdownTable(
  rows: Array<[label: string, value: string | number | undefined]>,
): string {
  const populatedRows = rows.filter(([, value]) => value !== undefined);
  if (populatedRows.length === 0) return "";

  return [
    "| | |",
    "| --- | --- |",
    ...populatedRows.map(
      ([label, value]) =>
        `| **${markdownValue(label)}** | ${markdownValue(value)} |`,
    ),
  ].join("\n");
}

function siteAccessories(site: SiteSummary): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (site.platform) {
    accessories.push({
      text: site.version ? `${site.platform} ${site.version}` : site.platform,
    });
  }

  if (site.updatesAvailable && site.updatesAvailable > 0) {
    accessories.push({
      icon: {
        source: Icon.Download,
        tintColor: site.coreUpdateAvailable ? Color.Orange : Color.Blue,
      },
      text: String(site.updatesAvailable),
      tooltip: site.coreUpdateAvailable
        ? `${site.updatesAvailable} updates available (includes core)`
        : `${site.updatesAvailable} updates available`,
    });
  }

  const vulnerabilities =
    (site.vulnerableExtensions ?? 0) + (site.coreVulnerabilityCount ?? 0);
  if (vulnerabilities > 0) {
    accessories.push({
      icon: { source: Icon.Bug, tintColor: Color.Red },
      text: String(vulnerabilities),
      tooltip: `${vulnerabilities} known ${
        vulnerabilities === 1 ? "vulnerability" : "vulnerabilities"
      }`,
    });
  }

  if (site.sslDaysRemaining !== undefined && site.sslDaysRemaining <= 14) {
    accessories.push({
      icon: {
        source: Icon.Lock,
        tintColor: site.sslDaysRemaining <= 0 ? Color.Red : Color.Orange,
      },
      tooltip:
        site.sslDaysRemaining <= 0
          ? "SSL certificate expired"
          : `SSL expires in ${site.sslDaysRemaining} day${
              site.sslDaysRemaining === 1 ? "" : "s"
            }`,
    });
  }

  if (site.isHacked) {
    accessories.push({
      icon: { source: Icon.Warning, tintColor: Color.Red },
      tooltip: "Potential compromise detected",
    });
  }

  if (site.needsAttention) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip:
        site.attentionReasons.length > 0
          ? formatAttentionReasons(site.attentionReasons)
          : "Needs attention",
    });
  }

  accessories.push({
    icon: {
      source: site.isConnected ? Icon.CheckCircle : Icon.XMarkCircle,
      tintColor: site.isConnected ? Color.Green : Color.Red,
    },
    tooltip: site.isConnected ? "Connected" : "Disconnected",
  });

  return accessories;
}

function statusIcon(status?: string): List.Item.Accessory["icon"] {
  const normalized = status?.toLowerCase();
  if (normalized === "complete" || normalized === "completed") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (normalized === "failed" || normalized === "error") {
    return { source: Icon.ExclamationMark, tintColor: Color.Red };
  }
  return { source: Icon.Clock, tintColor: Color.Yellow };
}

async function queueSiteAction(options: {
  site: Site;
  actionTitle: string;
  confirmTitle: string;
  confirmMessage: string;
  queuedTitle: string;
  run: () => Promise<void>;
  onQueued?: () => void;
}) {
  const { confirmSiteActions } = getPreferenceValues<SiteActionPreferences>();

  if (confirmSiteActions) {
    const confirmed = await confirmAlert({
      title: options.confirmTitle,
      message: options.confirmMessage,
      icon: Icon.ExclamationMark,
      primaryAction: {
        title: options.actionTitle,
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${options.actionTitle}...`,
  });
  try {
    await options.run();
    toast.style = Toast.Style.Success;
    toast.title = options.queuedTitle;
    toast.message = options.site.name;
    options.onQueued?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to ${options.actionTitle.toLowerCase()}`;
    toast.message = errorMessage(error);
  }
}

function openActionIcon(action: SiteOpenAction): Icon {
  if (action === "manage") return Icon.Window;
  if (action === "admin") return Icon.Lock;
  return Icon.Globe;
}

function SiteActions({
  site,
  token,
  onRefresh,
  context = "list",
}: {
  site: Site;
  token: string;
  onRefresh?: () => void;
  context?: "list" | "detail";
}) {
  const preferences = getPreferenceValues<SiteActionPreferences>();
  const listAction = isSiteOpenAction(preferences.listSiteAction)
    ? preferences.listSiteAction
    : DEFAULT_LIST_SITE_ACTION;
  const primaryAction = isSiteOpenAction(preferences.primarySiteAction)
    ? preferences.primarySiteAction
    : DEFAULT_PRIMARY_SITE_ACTION;
  const secondaryAction = isSiteOpenAction(preferences.secondarySiteAction)
    ? preferences.secondarySiteAction
    : DEFAULT_SECONDARY_SITE_ACTION;

  const usedActions =
    context === "list"
      ? new Set<SiteOpenAction>([listAction])
      : new Set<SiteOpenAction>([primaryAction, secondaryAction]);
  const extraOpenActions = (["manage", "site", "admin"] as SiteOpenAction[]).filter(
    (a) => !usedActions.has(a),
  );

  function openAction(action: SiteOpenAction) {
    const details = siteActionDetails(action, site);
    return (
      <Action.OpenInBrowser
        key={action}
        title={details.title}
        url={details.url}
        icon={openActionIcon(action)}
      />
    );
  }

  return (
    <ActionPanel>
      {context === "list" ? (
        <>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<SiteDetailView site={site} token={token} />}
          />
          {openAction(listAction)}
        </>
      ) : (
        <>
          {openAction(primaryAction)}
          {openAction(secondaryAction)}
        </>
      )}
      {extraOpenActions.length > 0 && (
        <ActionPanel.Section title="Open">
          {extraOpenActions.map(openAction)}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Site URL"
          content={site.url}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Actions">
        <Action
          title="Queue Audit"
          icon={Icon.MagnifyingGlass}
          onAction={() =>
            queueSiteAction({
              site,
              actionTitle: "Queue Audit",
              confirmTitle: `Queue audit for ${site.name}?`,
              confirmMessage: "mySites.guru will run the audit in the background.",
              queuedTitle: "Audit Queued",
              run: () => triggerAudit(token, site.hashId),
              onQueued: onRefresh,
            })
          }
        />
        <Action
          title="Queue Backup"
          icon={Icon.HardDrive}
          onAction={() =>
            queueSiteAction({
              site,
              actionTitle: "Queue Backup",
              confirmTitle: `Queue backup for ${site.name}?`,
              confirmMessage: "mySites.guru will run the backup in the background.",
              queuedTitle: "Backup Queued",
              run: () => triggerBackup(token, site.hashId),
              onQueued: onRefresh,
            })
          }
        />
        <Action
          title="Queue Snapshot"
          icon={Icon.Camera}
          onAction={() =>
            queueSiteAction({
              site,
              actionTitle: "Queue Snapshot",
              confirmTitle: `Queue snapshot for ${site.name}?`,
              confirmMessage: "mySites.guru will run the snapshot check in the background.",
              queuedTitle: "Snapshot Queued",
              run: () => triggerSnapshot(token, site.hashId),
              onQueued: onRefresh,
            })
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="History">
        <Action.Push
          title="Show Audits"
          icon={Icon.Shield}
          target={<AuditsView site={site} token={token} />}
        />
        <Action.Push
          title="Show Backups"
          icon={Icon.HardDrive}
          target={<BackupsView site={site} token={token} />}
        />
        <Action.Push
          title="Show Snapshots"
          icon={Icon.Camera}
          target={<SnapshotsView site={site} token={token} />}
        />
        <Action.Push
          title="Show Extensions"
          icon={Icon.PuzzlePiece}
          target={<ExtensionsView site={site} token={token} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Show Account"
          icon={Icon.Person}
          target={<AccountView token={token} />}
        />
        <Action.CopyToClipboard
          title="Copy Management URL"
          content={siteManagementUrl(site)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        {onRefresh ? (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function SiteDetailView({ site, token }: { site: Site; token: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getSite,
    [token, site.hashId],
    {
      failureToastOptions: { title: "Failed to Fetch Site" },
    },
  );
  const detail = data ?? site;
  const summary: SiteSummary | undefined =
    "attentionReasons" in site ? (site as SiteSummary) : undefined;
  const tags = detail.tags.map((tag) => tag.name).join(", ") || undefined;
  const status = detail.isConnected ? "Connected" : "Disconnected";
  const markdown = [
    `# ${detail.name}`,
    `\`${detail.url}\``,
    summary?.needsAttention && summary.attentionReasons.length > 0
      ? `> ⚠️ **Needs attention:** ${formatAttentionReasons(summary.attentionReasons)}`
      : "",
    "## Site",
    markdownTable([
      ["Connection", status],
      ["Platform", detail.platform],
      ["CMS Version", detail.version],
      ["PHP", detail.phpVersion],
      ["Database", detail.databaseVersion],
      [
        "Connector",
        "connectorVersion" in detail ? detail.connectorVersion : undefined,
      ],
      ["Tags", tags],
    ]),
    "## Activity",
    markdownTable([
      ["Last Audit", formatDate(detail.lastAudit)],
      ["Last Backup", formatDate(detail.lastBackup)],
      [
        "Last Snapshot",
        "lastSnapshot" in detail ? formatDate(detail.lastSnapshot) : undefined,
      ],
      [
        "Updates Available",
        "updatesAvailable" in detail ? detail.updatesAvailable : undefined,
      ],
      [
        "Core Update",
        "coreUpdateAvailable" in detail
          ? yesNo(detail.coreUpdateAvailable)
          : undefined,
      ],
    ]),
    "## Security",
    markdownTable([
      [
        "SSL Expiration",
        "sslExpiration" in detail
          ? formatDate(detail.sslExpiration)
          : formatDate(summary?.sslExpiration),
      ],
      [
        "SSL Days Remaining",
        summary?.sslDaysRemaining !== undefined
          ? summary.sslDaysRemaining
          : undefined,
      ],
      ["SSL Issuer", "sslIssuer" in detail ? detail.sslIssuer : undefined],
      [
        "Vulnerable Extensions",
        summary?.vulnerableExtensions !== undefined
          ? summary.vulnerableExtensions
          : undefined,
      ],
      [
        "Core Vulnerabilities",
        summary?.coreVulnerabilityCount !== undefined
          ? summary.coreVulnerabilityCount
          : undefined,
      ],
      ["Compromise Detected", summary?.isHacked ? "Yes" : undefined],
      [
        "Admins Without 2FA",
        summary?.snapshot?.non2faAdmins !== undefined
          ? summary.snapshot.non2faAdmins
          : undefined,
      ],
      [
        "Malicious Cron Jobs",
        summary?.snapshot?.maliciousCronJobs !== undefined
          ? summary.snapshot.maliciousCronJobs
          : undefined,
      ],
    ]),
    error ? `> ${errorMessage(error)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={site.name}
      markdown={markdown}
      actions={
        <SiteActions site={detail} token={token} onRefresh={() => { invalidateCache(); revalidate(); }} context="detail" />
      }
    />
  );
}

function AccountView({ token }: { token: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getProfile,
    [token],
    {
      failureToastOptions: { title: "Failed to Fetch Account" },
    },
  );
  const { data: summary, revalidate: revalidateSummary } = useCachedPromise(
    getSitesSummary,
    [token],
  );

  const counts = summary?.meta.counts;
  const markdown = data
    ? [
        `# ${data.company ?? data.name ?? "MySites.guru"}`,
        markdownTable([
          ["Name", data.name],
          ["Company", data.company],
          ["Email", data.email],
          ["User ID", data.uuid],
        ]),
        summary?.meta.summary ? `> ${summary.meta.summary}` : "",
        counts
          ? "## Portfolio"
          : "",
        counts
          ? markdownTable([
              ["Total Sites", summary?.meta.total],
              ["Needs Attention", counts.needsAttention],
              ["Disconnected", counts.disconnected],
              ["Updates Available", counts.updatesAvailable],
              ["Core Updates", counts.coreUpdateAvailable],
              ["Vulnerable Extensions", counts.vulnerableExtensions],
              ["Core Vulnerabilities", counts.coreVulnerabilities],
              ["Hacked", counts.hacked],
              ["Stale Snapshots", counts.staleSnapshot],
              ["Paused", counts.paused],
            ])
          : "",
        error ? `> ${errorMessage(error)}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : undefined;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="MySites.guru Account"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              invalidateCache();
              revalidate();
              revalidateSummary();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function AuditDetailView({
  site,
  auditId,
  token,
}: {
  site: Site;
  auditId: string;
  token: string;
}) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getAudit,
    [token, site.hashId, auditId],
    {
      failureToastOptions: { title: "Failed to Fetch Audit" },
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${site.name} Audit`}
      markdown={
        data
          ? [
              `# Audit ${data.status ?? data.id}`,
              data.hacked
                ? "> **Potential compromise detected.**"
                : "No hacked flag reported.",
              "## Summary",
              markdownTable([
                ["Status", data.status],
                ["Hacked", yesNo(data.hacked)],
                ["Started", formatDate(data.startedAt)],
                ["Completed", formatDate(data.completedAt)],
              ]),
              "## Findings",
              markdownTable([
                ["Files Scanned", data.filesScanned],
                ["Suspect Files", data.suspectFiles],
                ["Hidden Files", data.hiddenFiles],
                ["Hidden Folders", data.hiddenFolders],
                ["0777 Files", data.files777],
                ["0777 Folders", data.folders777],
                ["Zero-byte Files", data.zeroByteFiles],
                ["Missing Core Files", data.missingCoreFiles],
                ["Extensions Needing Update", data.extensionsNeedingUpdate],
              ]),
              error ? `> ${errorMessage(error)}` : "",
            ]
              .filter(Boolean)
              .join("\n\n")
          : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}

function AuditsView({ site, token }: { site: Site; token: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    listAudits,
    [token, site.hashId],
    {
      failureToastOptions: { title: "Failed to Fetch Audits" },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${site.name} Audits`}>
      <List.EmptyView
        title={error ? "Failed to Load Audits" : "No Audits Found"}
        description={error ? errorMessage(error) : undefined}
      />
      {data?.map((audit) => (
        <List.Item
          key={audit.id}
          title={audit.status ?? audit.id}
          subtitle={formatDate(audit.completedAt ?? audit.startedAt)}
          accessories={[
            {
              icon: audit.hacked
                ? { source: Icon.ExclamationMark, tintColor: Color.Red }
                : statusIcon(audit.status),
            },
            audit.suspectFiles !== undefined
              ? { text: `${audit.suspectFiles} suspect` }
              : {},
            audit.filesScanned !== undefined
              ? { text: `${audit.filesScanned} files` }
              : {},
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Audit Details"
                icon={Icon.Sidebar}
                target={
                  <AuditDetailView
                    site={site}
                    auditId={audit.id}
                    token={token}
                  />
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function BackupsView({ site, token }: { site: Site; token: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    listBackups,
    [token, site.hashId],
    {
      failureToastOptions: { title: "Failed to Fetch Backups" },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${site.name} Backups`}>
      <List.EmptyView
        title={error ? "Failed to Load Backups" : "No Backups Found"}
        description={error ? errorMessage(error) : undefined}
      />
      {data?.map((backup) => (
        <List.Item
          key={backup.id}
          title={backup.archive ?? backup.description ?? backup.id}
          subtitle={formatDate(backup.completedAt ?? backup.startedAt)}
          accessories={[
            { icon: statusIcon(backup.status), tooltip: backup.status },
            backup.progress !== undefined
              ? { text: `${backup.progress}%` }
              : {},
          ]}
          actions={
            <ActionPanel>
              {backup.archive ? (
                <Action.CopyToClipboard
                  title="Copy Archive Filename"
                  content={backup.archive}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
              ) : null}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SnapshotsView({ site, token }: { site: Site; token: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    listSnapshots,
    [token, site.hashId],
    {
      failureToastOptions: { title: "Failed to Fetch Snapshots" },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${site.name} Snapshots`}>
      <List.EmptyView
        title={error ? "Failed to Load Snapshots" : "No Snapshots Found"}
        description={error ? errorMessage(error) : undefined}
      />
      {data?.map((snapshot) => (
        <List.Item
          key={snapshot.id}
          title={snapshot.status ?? snapshot.id}
          subtitle={formatDate(snapshot.createdAt)}
          accessories={[
            { icon: statusIcon(snapshot.status) },
            snapshot.cmsVersion ? { text: snapshot.cmsVersion } : {},
            snapshot.phpVersion ? { text: `PHP ${snapshot.phpVersion}` } : {},
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ExtensionsView({ site, token }: { site: Site; token: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    listExtensions,
    [token, site.hashId],
    {
      failureToastOptions: { title: "Failed to Fetch Extensions" },
    },
  );

  function refresh() {
    invalidateCache();
    revalidate();
  }

  async function queueUpdate(extension: Extension) {
    await queueSiteAction({
      site,
      actionTitle: "Queue Update",
      confirmTitle: `Queue update for ${extension.name}?`,
      confirmMessage:
        "mySites.guru will update this extension in the background.",
      queuedTitle: "Extension Update Queued",
      run: () => updateExtensions(token, site.hashId, [extension.key]),
      onQueued: refresh,
    });
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${site.name} Extensions`}>
      <List.EmptyView
        title={error ? "Failed to Load Extensions" : "No Extensions Found"}
        description={error ? errorMessage(error) : undefined}
      />
      {data?.map((extension) => (
        <List.Item
          key={extension.key}
          title={extension.name}
          subtitle={extension.developer}
          accessories={[
            extension.installedVersion
              ? { text: extension.installedVersion }
              : {},
            extension.type ? { text: extension.type } : {},
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Queue Update"
                icon={Icon.ArrowClockwise}
                onAction={() => queueUpdate(extension)}
              />
              <Action.CopyToClipboard
                title="Copy Extension Info"
                content={`${extension.name} ${extension.installedVersion ?? ""}`.trim()}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function matchesFilter(site: SiteSummary, filter: string): boolean {
  if (filter === "") return true;
  if (filter === "attention") return site.needsAttention === true;
  if (filter.startsWith("tag:")) {
    const slug = filter.slice(4);
    return site.tags.some((tag) => tag.slug === slug);
  }
  return true;
}

function SearchSitesCommand() {
  const token = useAccessToken();
  const [filter, setFilter] = useState<string>("");

  const {
    data: summary,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getSitesSummary, [token], {
    failureToastOptions: { title: "Failed to Fetch Sites" },
  });

  const { data: tags } = useCachedPromise(listTags, [token]);

  const sites = summary?.sites;
  const attentionCount = summary?.meta.counts.needsAttention;
  const filteredSites = sites?.filter((site) => matchesFilter(site, filter));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your mySites.guru sites..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Sites" onChange={setFilter}>
          <List.Dropdown.Item title="All Sites" value="" />
          <List.Dropdown.Item
            title={
              attentionCount
                ? `Needs Attention (${attentionCount})`
                : "Needs Attention"
            }
            value="attention"
          />
          {tags && tags.length > 0 ? (
            <List.Dropdown.Section title="Tags">
              {tags.map((tag) => (
                <List.Dropdown.Item
                  key={tag.slug}
                  title={tag.name}
                  value={`tag:${tag.slug}`}
                />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={{ source: "icon.png" }}
        title={error ? "Failed to Load Sites" : "No Sites Found"}
        description={
          error ? errorMessage(error) : "No sites found for this account"
        }
      />
      {filteredSites?.map((site) => (
        <List.Item
          key={site.hashId}
          icon={{
            source: faviconUrl(site.url),
            fallback: Icon.Globe,
            mask: Image.Mask.RoundedRectangle,
          }}
          title={site.name}
          subtitle={site.url}
          keywords={[
            site.platform,
            ...site.tags.flatMap((tag) => [tag.name, tag.slug]),
          ].filter((keyword): keyword is string => Boolean(keyword))}
          accessories={siteAccessories(site)}
          actions={
            <SiteActions site={site} token={token} onRefresh={() => { invalidateCache(); revalidate(); }} />
          }
        />
      ))}
    </List>
  );
}

export default withMySitesAuth(SearchSitesCommand);
