import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Image,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useAccessToken, withMySitesAuth } from "./api/auth-context";
import {
  getSitesSummary,
  invalidateCache,
  triggerAudit,
  triggerBackup,
  triggerSnapshot,
} from "./api/client";
import { errorMessage } from "./api/errors";
import { SiteSummary } from "./api/types";
import {
  enabledConcerns,
  needsAttention,
  siteAccessories,
  siteKeywords,
  sortSites,
} from "./site-health";
import { runOperation, SiteOperation } from "./site-operation";

function faviconUrl(siteUrl: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(siteUrl).hostname}&sz=64`;
  } catch {
    return "";
  }
}

const BULK_OPERATIONS: Record<
  SiteOperation,
  {
    label: string;
    icon: Icon;
    trigger: (token: string, hashId: string) => Promise<void>;
  }
> = {
  audit: { label: "Audits", icon: Icon.Shield, trigger: triggerAudit },
  backup: { label: "Backups", icon: Icon.HardDrive, trigger: triggerBackup },
  snapshot: { label: "Snapshots", icon: Icon.Camera, trigger: triggerSnapshot },
};

async function runBulkOperation(
  operation: SiteOperation,
  token: string,
  sites: SiteSummary[],
  onDone?: () => void,
) {
  const config = BULK_OPERATIONS[operation];

  const confirmed = await confirmAlert({
    title: `Queue ${config.label.toLowerCase()} for ${sites.length} sites?`,
    message: "mySites.guru will run them in the background.",
    icon: config.icon,
    primaryAction: {
      title: `Queue ${sites.length} ${config.label}`,
      style: Alert.ActionStyle.Default,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Queuing ${config.label.toLowerCase()}…`,
    message: `0 of ${sites.length}`,
  });

  let queued = 0;
  let failed = 0;
  for (const site of sites) {
    try {
      await config.trigger(token, site.hashId);
      queued += 1;
    } catch {
      failed += 1;
    }
    toast.message = `${queued + failed} of ${sites.length}`;
  }

  toast.style = failed > 0 ? Toast.Style.Failure : Toast.Style.Success;
  toast.title =
    failed > 0
      ? `Queued ${queued} ${config.label}, ${failed} failed`
      : `Queued ${queued} ${config.label}`;
  toast.message = undefined;
  onDone?.();
}

function AtRiskSitesCommand() {
  const token = useAccessToken();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getSitesSummary,
    [token],
    { failureToastOptions: { title: "Failed to Fetch Sites" } },
  );

  const concerns = enabledConcerns();
  const sites = data
    ? sortSites(
        data.sites.filter((site) => needsAttention(site, concerns)),
        "name",
      )
    : undefined;

  const refresh = () => {
    invalidateCache();
    revalidate();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sites needing attention…"
    >
      <List.EmptyView
        icon={{ source: "icon.png" }}
        title={error ? "Failed to Load Sites" : "No Sites Need Attention"}
        description={
          error ? errorMessage(error) : "Everything in your account looks healthy."
        }
      />
      {sites?.map((site) => (
        <List.Item
          key={site.hashId}
          icon={{
            source: faviconUrl(site.url),
            fallback: Icon.Globe,
            mask: Image.Mask.RoundedRectangle,
          }}
          title={site.name}
          subtitle={site.url}
          keywords={siteKeywords(site)}
          accessories={siteAccessories(site)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={site.name}>
                <Action
                  title="Queue Backup"
                  icon={Icon.HardDrive}
                  onAction={() =>
                    runOperation("backup", token, site).then(refresh)
                  }
                />
                <Action
                  title="Queue Audit"
                  icon={Icon.Shield}
                  onAction={() =>
                    runOperation("audit", token, site).then(refresh)
                  }
                />
                <Action
                  title="Queue Snapshot"
                  icon={Icon.Camera}
                  onAction={() =>
                    runOperation("snapshot", token, site).then(refresh)
                  }
                />
              </ActionPanel.Section>
              {sites.length > 0 ? (
                <ActionPanel.Section
                  title={`All ${sites.length} At-Risk Sites`}
                >
                  <Action
                    title="Queue Backups for All"
                    icon={Icon.HardDrive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    onAction={() =>
                      runBulkOperation("backup", token, sites, refresh)
                    }
                  />
                  <Action
                    title="Queue Audits for All"
                    icon={Icon.Shield}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() =>
                      runBulkOperation("audit", token, sites, refresh)
                    }
                  />
                  <Action
                    title="Queue Snapshots for All"
                    icon={Icon.Camera}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    onAction={() =>
                      runBulkOperation("snapshot", token, sites, refresh)
                    }
                  />
                </ActionPanel.Section>
              ) : null}
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

export default withMySitesAuth(AtRiskSitesCommand);
