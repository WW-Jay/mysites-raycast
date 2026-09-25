export interface SiteTag {
  slug: string;
  name: string;
  color?: string;
}

export interface Profile {
  uuid?: string;
  email?: string;
  name?: string;
  company?: string;
}

export interface Site {
  hashId: string;
  name: string;
  url: string;
  platform?: string;
  version?: string;
  phpVersion?: string;
  databaseVersion?: string;
  tags: SiteTag[];
  isConnected: boolean;
  lastAudit?: string;
  lastBackup?: string;
  managementUrl?: string;
}

export interface SiteDetail extends Site {
  connectorVersion?: string;
  lastSnapshot?: string;
  scheduledAuditsEnabled?: boolean;
  scheduledBackupsEnabled?: boolean;
  sslExpiration?: string;
  sslIssuer?: string;
  updatesAvailable?: number;
  coreUpdateAvailable?: boolean;
}

export interface SiteSnapshotFlags {
  id?: string;
  debugEnabled?: boolean;
  cacheEnabled?: boolean;
  userRegistrationEnabled?: boolean;
  offlineMode?: boolean;
  superAdminCount?: number;
  non2faAdmins?: number;
  maliciousCronJobs?: number;
}

export interface SiteSummary extends Site {
  connectorVersion?: string;
  isPaused?: boolean;
  isHacked?: boolean;
  lastSnapshot?: string;
  snapshotAgeDays?: number;
  lastAuditId?: string;
  auditUnread?: boolean;
  lastBackupStarted?: string;
  lastBackupCompleted?: string;
  updatesAvailable?: number;
  coreUpdateAvailable?: boolean;
  vulnerableExtensions?: number;
  coreVulnerabilityCount?: number;
  sslExpiration?: string;
  sslDaysRemaining?: number;
  needsAttention?: boolean;
  attentionReasons: string[];
  snapshot?: SiteSnapshotFlags;
}

export interface SitesSummaryCounts {
  hacked?: number;
  updatesAvailable?: number;
  coreUpdateAvailable?: number;
  vulnerableExtensions?: number;
  coreVulnerabilities?: number;
  disconnected?: number;
  staleSnapshot?: number;
  paused?: number;
  needsAttention?: number;
}

export interface SitesSummaryMeta {
  total?: number;
  scopeTotal?: number;
  generatedAt?: string;
  staleSnapshotDays?: number;
  counts: SitesSummaryCounts;
  summary?: string;
}

export interface SitesSummary {
  sites: SiteSummary[];
  meta: SitesSummaryMeta;
}

export type SitesSummarySort =
  | "name"
  | "last_snapshot"
  | "last_backup_completed"
  | "updates";

export interface SitesSummaryOptions {
  needsAttention?: boolean;
  platform?: string;
  tag?: string;
  hashIds?: string[];
  includePaused?: boolean;
  sort?: SitesSummarySort;
}

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface SitesPage {
  sites: Site[];
  meta: PaginationMeta;
}

export interface AuditSummary {
  id: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  filesScanned?: number;
  suspectFiles?: number;
  hacked: boolean;
}

export interface Audit extends AuditSummary {
  hiddenFiles?: number;
  hiddenFolders?: number;
  files777?: number;
  folders777?: number;
  zeroByteFiles?: number;
  missingCoreFiles?: number;
  extensionsNeedingUpdate?: number;
}

export interface Backup {
  id: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  archive?: string;
  description?: string;
}

export interface Snapshot {
  id: string;
  status?: string;
  createdAt?: string;
  cmsVersion?: string;
  phpVersion?: string;
  databaseVersion?: string;
  cacheEnabled?: boolean;
  debugEnabled?: boolean;
  userRegistrationEnabled?: boolean;
  superAdminCount?: number;
  non2faAdmins?: number;
}

export interface Extension {
  key: string;
  name: string;
  type?: string;
  installedSince?: string;
  lastSeen?: string;
  installedVersion?: string;
  developer?: string;
}
