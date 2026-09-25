import { Color, Icon, List } from "@raycast/api";
import { SitesSummaryMeta, SiteSummary } from "./api/types";

// SSL certificates within this many days of expiry get a badge in the list.
export const SSL_WARN_DAYS = 14;
// The "SSL Expiring" filter casts a wider net than the badge alarm.
export const SSL_FILTER_DAYS = 30;

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
export function formatAttentionReason(reason: string): string {
  return ATTENTION_REASON_LABELS[reason.toLowerCase()] ?? humanizeSlug(reason);
}

export function formatAttentionReasons(reasons: string[]): string {
  return reasons.map(formatAttentionReason).join(", ");
}

export function vulnerabilityCount(site: SiteSummary): number {
  return (site.vulnerableExtensions ?? 0) + (site.coreVulnerabilityCount ?? 0);
}

// A one-line portfolio description, preferring the API's own summary text and
// falling back to the account-wide counts when it is absent.
export function describePortfolio(meta: SitesSummaryMeta): string {
  if (meta.summary) return meta.summary;

  const counts = meta.counts;
  const total = meta.total ?? 0;
  const parts: string[] = [];
  const add = (value: number | undefined, label: string) => {
    if (value && value > 0) parts.push(`${value} ${label}`);
  };

  add(counts.needsAttention, "need attention");
  add(counts.hacked, "hacked");
  add(counts.disconnected, "disconnected");
  add(counts.updatesAvailable, "with updates");
  add(counts.vulnerableExtensions, "with vulnerable extensions");
  add(counts.coreVulnerabilities, "with core vulnerabilities");
  add(counts.staleSnapshot, "with stale snapshots");
  add(counts.paused, "paused");

  const noun = total === 1 ? "site" : "sites";
  return parts.length > 0
    ? `${total} ${noun}: ${parts.join(", ")}.`
    : `${total} ${noun}, all healthy.`;
}

export type SiteSort =
  | "name"
  | "attention"
  | "ssl"
  | "updates"
  | "snapshot"
  | "backup";

export const SORT_OPTIONS: Array<{ value: SiteSort; label: string }> = [
  { value: "name", label: "Name" },
  { value: "attention", label: "Needs Attention First" },
  { value: "ssl", label: "SSL Expiry (Soonest)" },
  { value: "updates", label: "Most Updates" },
  { value: "snapshot", label: "Oldest Snapshot" },
  { value: "backup", label: "Oldest Backup" },
];

function timestamp(value?: string): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function sortSites(sites: SiteSummary[], sort: SiteSort): SiteSummary[] {
  const byName = (a: SiteSummary, b: SiteSummary) =>
    a.name.localeCompare(b.name);
  const copy = [...sites];

  switch (sort) {
    case "attention":
      return copy.sort(
        (a, b) =>
          Number(b.needsAttention ?? false) -
            Number(a.needsAttention ?? false) || byName(a, b),
      );
    case "ssl":
      return copy.sort(
        (a, b) =>
          (a.sslDaysRemaining ?? Number.POSITIVE_INFINITY) -
            (b.sslDaysRemaining ?? Number.POSITIVE_INFINITY) || byName(a, b),
      );
    case "updates":
      return copy.sort(
        (a, b) =>
          (b.updatesAvailable ?? 0) - (a.updatesAvailable ?? 0) || byName(a, b),
      );
    case "snapshot":
      return copy.sort(
        (a, b) =>
          (b.snapshotAgeDays ?? Number.POSITIVE_INFINITY) -
            (a.snapshotAgeDays ?? Number.POSITIVE_INFINITY) || byName(a, b),
      );
    case "backup":
      return copy.sort(
        (a, b) =>
          timestamp(a.lastBackupCompleted) - timestamp(b.lastBackupCompleted) ||
          byName(a, b),
      );
    case "name":
    default:
      return copy.sort(byName);
  }
}

export function matchesFilter(site: SiteSummary, filter: string): boolean {
  if (filter === "") return true;
  if (filter.startsWith("tag:")) {
    return site.tags.some((tag) => tag.slug === filter.slice(4));
  }
  if (filter.startsWith("platform:")) {
    return (site.platform ?? "").toLowerCase() === filter.slice(9).toLowerCase();
  }

  switch (filter) {
    case "attention":
      return site.needsAttention === true;
    case "vulnerable":
      return vulnerabilityCount(site) > 0 || site.isHacked === true;
    case "ssl":
      return (
        site.sslDaysRemaining !== undefined &&
        site.sslDaysRemaining <= SSL_FILTER_DAYS
      );
    case "updates":
      return (site.updatesAvailable ?? 0) > 0;
    case "disconnected":
      return !site.isConnected;
    case "paused":
      return site.isPaused === true;
    default:
      return true;
  }
}

export function siteKeywords(site: SiteSummary): string[] {
  return [
    site.platform,
    ...site.tags.flatMap((tag) => [tag.name, tag.slug]),
    ...site.attentionReasons,
    ...site.attentionReasons.map(formatAttentionReason),
    site.needsAttention ? "needs attention" : undefined,
    (site.updatesAvailable ?? 0) > 0 ? "updates" : undefined,
    vulnerabilityCount(site) > 0 ? "vulnerable" : undefined,
    site.isHacked ? "hacked" : undefined,
    site.sslDaysRemaining !== undefined &&
    site.sslDaysRemaining <= SSL_FILTER_DAYS
      ? "ssl"
      : undefined,
    site.isConnected ? undefined : "disconnected",
    site.isPaused ? "paused" : undefined,
  ].filter((keyword): keyword is string => Boolean(keyword));
}

export function siteAccessories(site: SiteSummary): List.Item.Accessory[] {
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

  const vulnerabilities = vulnerabilityCount(site);
  if (vulnerabilities > 0) {
    accessories.push({
      icon: { source: Icon.Bug, tintColor: Color.Red },
      text: String(vulnerabilities),
      tooltip: `${vulnerabilities} known ${
        vulnerabilities === 1 ? "vulnerability" : "vulnerabilities"
      }`,
    });
  }

  if (site.sslDaysRemaining !== undefined && site.sslDaysRemaining <= SSL_WARN_DAYS) {
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
