import { API_BASE_URL } from "./constants";
import { forceRefresh } from "./auth";
import { MySitesApiError } from "./errors";
import {
  Audit,
  AuditSummary,
  Backup,
  Extension,
  PaginationMeta,
  Profile,
  Site,
  SiteDetail,
  SitesPage,
  SiteTag,
  Snapshot,
} from "./types";

const MAX_PAGES = 50;
const CACHE_TTL = 5 * 60 * 1000;

const responseCache = new Map<string, { data: unknown; expiry: number }>();

function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = responseCache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return Promise.resolve(entry.data as T);
  }
  return fn().then((data) => {
    responseCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
    return data;
  });
}

export function invalidateCache(): void {
  responseCache.clear();
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function requiredString(value: unknown, field: string): string {
  const result = optionalString(value);
  if (!result)
    throw new MySitesApiError(`mySites.guru returned a site without ${field}`);
  return result;
}

function parseTag(value: unknown): SiteTag | undefined {
  if (!isRecord(value)) return undefined;

  const slug = optionalString(value.slug);
  const name = optionalString(value.name);
  if (!slug || !name) return undefined;

  return { slug, name, color: optionalString(value.color) };
}

function parseTagItem(value: unknown): SiteTag {
  const tag = parseTag(value);
  if (!tag) throw new MySitesApiError("mySites.guru returned an invalid tag");
  return tag;
}

function parseSite(value: unknown): Site {
  if (!isRecord(value)) {
    throw new MySitesApiError("mySites.guru returned an invalid site");
  }

  const url = requiredString(value.url, "a URL");
  let fallbackName = url;
  try {
    fallbackName = new URL(url).hostname;
  } catch {
    // Keep the original URL as the safest display fallback.
  }

  return {
    hashId: requiredString(value.hash_id, "an identifier"),
    name: optionalString(value.friendly_name) ?? fallbackName,
    url,
    platform: optionalString(value.platform),
    version: optionalString(value.version),
    phpVersion: optionalString(value.php_version),
    databaseVersion: optionalString(value.db_version),
    tags: Array.isArray(value.tags)
      ? value.tags.map(parseTag).filter((tag): tag is SiteTag => Boolean(tag))
      : [],
    isConnected: value.is_connected === true,
    lastAudit: optionalString(value.last_audit),
    lastBackup: optionalString(value.last_backup),
    managementUrl:
      optionalString(value.management_url) ??
      optionalString(value.manage_url) ??
      optionalString(value.dashboard_url),
  };
}

function parseSiteDetail(value: unknown): SiteDetail {
  if (!isRecord(value)) {
    throw new MySitesApiError("mySites.guru returned an invalid site detail");
  }

  return {
    ...parseSite(value),
    connectorVersion: optionalString(value.connector_version),
    lastSnapshot: optionalString(value.last_snapshot),
    scheduledAuditsEnabled: optionalBoolean(value.scheduled_audits_enabled),
    scheduledBackupsEnabled: optionalBoolean(value.scheduled_backups_enabled),
    sslExpiration: optionalString(value.ssl_expiration),
    sslIssuer: optionalString(value.ssl_issuer),
    updatesAvailable: optionalNumber(value.updates_available),
    coreUpdateAvailable: optionalBoolean(value.core_update_available),
  };
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function parsePage<T>(
  value: unknown,
  parseItem: (item: unknown) => T,
  resource: string,
): { data: T[]; meta: PaginationMeta } {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new MySitesApiError(
      `mySites.guru returned an invalid ${resource} response`,
    );
  }

  const meta = isRecord(value.meta) ? value.meta : {};
  const data = value.data.map(parseItem);
  const pagination = {
    currentPage: positiveInteger(meta.current_page, 1),
    perPage: positiveInteger(meta.per_page, Math.max(data.length, 1)),
    total: positiveInteger(meta.total, data.length),
    lastPage: positiveInteger(meta.last_page, 1),
  };

  return { data, meta: pagination };
}

function parseSitesPage(value: unknown): SitesPage {
  const page = parsePage(value, parseSite, "sites");
  return { sites: page.data, meta: page.meta };
}

function parseData<T>(
  value: unknown,
  parseItem: (item: unknown) => T,
  resource: string,
): T {
  if (!isRecord(value)) {
    throw new MySitesApiError(
      `mySites.guru returned an invalid ${resource} response`,
    );
  }
  return parseItem(value.data);
}

function parseAudit(value: unknown): AuditSummary {
  if (!isRecord(value))
    throw new MySitesApiError("mySites.guru returned an invalid audit");
  return {
    id: requiredString(value.id, "an audit identifier"),
    status: optionalString(value.status),
    startedAt: optionalString(value.started_at),
    completedAt: optionalString(value.completed_at),
    filesScanned: optionalNumber(value.files_scanned),
    suspectFiles: optionalNumber(value.suspect_files),
    hacked: value.hacked === true,
  };
}

function parseAuditDetail(value: unknown): Audit {
  if (!isRecord(value))
    throw new MySitesApiError("mySites.guru returned an invalid audit");
  return {
    ...parseAudit(value),
    hiddenFiles: optionalNumber(value.hidden_files),
    hiddenFolders: optionalNumber(value.hidden_folders),
    files777: optionalNumber(value.files_777),
    folders777: optionalNumber(value.folders_777),
    zeroByteFiles: optionalNumber(value.zero_bytes),
    missingCoreFiles: optionalNumber(value.missing_core_files),
    extensionsNeedingUpdate: optionalNumber(value.extensions_needing_update),
  };
}

function parseProfile(value: unknown): Profile {
  if (!isRecord(value))
    throw new MySitesApiError("mySites.guru returned an invalid profile");
  return {
    uuid: optionalString(value.uuid),
    email: optionalString(value.email),
    name: optionalString(value.name),
    company: optionalString(value.company),
  };
}

function parseBackup(value: unknown): Backup {
  if (!isRecord(value))
    throw new MySitesApiError("mySites.guru returned an invalid backup");
  return {
    id: requiredString(value.id, "a backup identifier"),
    status: optionalString(value.status),
    startedAt: optionalString(value.started_at),
    completedAt: optionalString(value.completed_at),
    progress: optionalNumber(value.progress),
    archive: optionalString(value.archive),
    description: optionalString(value.description),
  };
}

function parseSnapshot(value: unknown): Snapshot {
  if (!isRecord(value))
    throw new MySitesApiError("mySites.guru returned an invalid snapshot");
  return {
    id: requiredString(value.id, "a snapshot identifier"),
    status: optionalString(value.status),
    createdAt: optionalString(value.created_at),
    cmsVersion: optionalString(value.cms_version),
    phpVersion: optionalString(value.php_version),
    databaseVersion: optionalString(value.db_version),
    cacheEnabled: optionalBoolean(value.cache_enabled),
    debugEnabled: optionalBoolean(value.debug_enabled),
    userRegistrationEnabled: optionalBoolean(value.user_registration_enabled),
    superAdminCount: optionalNumber(value.super_admin_count),
    non2faAdmins: optionalNumber(value.non_2fa_admins),
  };
}

function parseExtension(value: unknown): Extension {
  if (!isRecord(value))
    throw new MySitesApiError("mySites.guru returned an invalid extension");
  return {
    key: requiredString(value.key, "an extension key"),
    name: requiredString(value.name, "an extension name"),
    type: optionalString(value.type),
    installedSince: optionalString(value.installed_since),
    lastSeen: optionalString(value.last_seen),
    installedVersion: optionalString(value.installed_version),
    developer: optionalString(value.developer),
  };
}

function parseError(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return optionalString(value.error_description);
}

async function apiRequest(
  path: string,
  accessToken: string,
  init: RequestInit = {},
  retryAuthentication = true,
  retryRateLimit = true,
): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });

  if (response.status === 401 && retryAuthentication) {
    const refreshedToken = await forceRefresh();
    if (refreshedToken) {
      return apiRequest(path, refreshedToken, init, false, retryRateLimit);
    }
  }

  if (response.status === 429 && retryRateLimit) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    if (retryAfter > 0 && retryAfter <= 120) {
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return apiRequest(path, accessToken, init, retryAuthentication, false);
    }
  }

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => undefined);
    throw new MySitesApiError(
      parseError(errorBody) ??
        (response.status === 429
          ? "mySites.guru rate limit reached. Try again shortly."
          : `mySites.guru API request failed (${response.status})`),
      response.status,
      response.headers.get("Retry-After") ?? undefined,
    );
  }

  return response.json();
}

export function listSites(accessToken: string): Promise<Site[]> {
  return withCache("sites", async () => {
    const sites: Site[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= MAX_PAGES) {
      const response = parseSitesPage(
        await apiRequest(`/sites?page=${page}&per_page=100`, accessToken),
      );
      sites.push(...response.sites);

      hasMore =
        response.meta.currentPage < response.meta.lastPage &&
        sites.length < response.meta.total;

      page += 1;
    }

    return sites.sort((left, right) => left.name.localeCompare(right.name));
  });
}

export async function getSite(
  accessToken: string,
  hashId: string,
): Promise<SiteDetail> {
  return parseData(
    await apiRequest(`/sites/${encodeURIComponent(hashId)}`, accessToken),
    parseSiteDetail,
    "site",
  );
}

export function getProfile(accessToken: string): Promise<Profile> {
  return withCache("profile", async () =>
    parseData(await apiRequest("/me", accessToken), parseProfile, "profile"),
  );
}

export async function getAudit(
  accessToken: string,
  hashId: string,
  auditId: string,
): Promise<Audit> {
  return parseData(
    await apiRequest(
      `/sites/${encodeURIComponent(hashId)}/audits/${encodeURIComponent(auditId)}`,
      accessToken,
    ),
    parseAuditDetail,
    "audit",
  );
}

async function listPaginated<T>(
  accessToken: string,
  path: string,
  parseItem: (item: unknown) => T,
  resource: string,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const response = parsePage(
      await apiRequest(`${path}?page=${page}&per_page=100`, accessToken),
      parseItem,
      resource,
    );
    items.push(...response.data);

    hasMore =
      response.meta.currentPage < response.meta.lastPage &&
      items.length < response.meta.total;

    page += 1;
  }

  return items;
}

export function listAudits(
  accessToken: string,
  hashId: string,
): Promise<AuditSummary[]> {
  return listPaginated(
    accessToken,
    `/sites/${encodeURIComponent(hashId)}/audits`,
    parseAudit,
    "audits",
  );
}

export function listBackups(
  accessToken: string,
  hashId: string,
): Promise<Backup[]> {
  return listPaginated(
    accessToken,
    `/sites/${encodeURIComponent(hashId)}/backups`,
    parseBackup,
    "backups",
  );
}

export function listSnapshots(
  accessToken: string,
  hashId: string,
): Promise<Snapshot[]> {
  return listPaginated(
    accessToken,
    `/sites/${encodeURIComponent(hashId)}/snapshots`,
    parseSnapshot,
    "snapshots",
  );
}

export function listExtensions(
  accessToken: string,
  hashId: string,
): Promise<Extension[]> {
  return withCache(`extensions:${hashId}`, () =>
    listPaginated(
      accessToken,
      `/sites/${encodeURIComponent(hashId)}/extensions`,
      parseExtension,
      "extensions",
    ),
  );
}

async function queueAction(
  accessToken: string,
  path: string,
  body?: unknown,
): Promise<void> {
  await apiRequest(path, accessToken, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function triggerAudit(
  accessToken: string,
  hashId: string,
): Promise<void> {
  return queueAction(
    accessToken,
    `/sites/${encodeURIComponent(hashId)}/audits`,
  );
}

export function triggerBackup(
  accessToken: string,
  hashId: string,
): Promise<void> {
  return queueAction(
    accessToken,
    `/sites/${encodeURIComponent(hashId)}/backups`,
  );
}

export function triggerSnapshot(
  accessToken: string,
  hashId: string,
): Promise<void> {
  return queueAction(
    accessToken,
    `/sites/${encodeURIComponent(hashId)}/snapshots`,
  );
}

export function updateExtensions(
  accessToken: string,
  hashId: string,
  extensionKeys: string[],
): Promise<void> {
  return queueAction(
    accessToken,
    `/sites/${encodeURIComponent(hashId)}/extensions/update`,
    {
      extension_keys: extensionKeys,
    },
  );
}

export function listTags(accessToken: string): Promise<SiteTag[]> {
  return withCache("tags", () =>
    listPaginated(accessToken, "/tags", parseTagItem, "tags"),
  );
}
