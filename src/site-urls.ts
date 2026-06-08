import { Site } from "./api/types";

export type SiteOpenAction = "manage" | "site" | "admin";

export interface SiteActionPreferences {
  listSiteAction?: SiteOpenAction;
  primarySiteAction?: SiteOpenAction;
  secondarySiteAction?: SiteOpenAction;
  confirmSiteActions?: boolean;
}

export const DEFAULT_LIST_SITE_ACTION: SiteOpenAction = "manage";
export const DEFAULT_PRIMARY_SITE_ACTION: SiteOpenAction = "manage";
export const DEFAULT_SECONDARY_SITE_ACTION: SiteOpenAction = "site";

export function isSiteOpenAction(value: unknown): value is SiteOpenAction {
  return value === "manage" || value === "site" || value === "admin";
}

export function siteManagementUrl(site: Site): string {
  return (
    site.managementUrl ??
    `https://manage.mysites.guru/en/sites/manage/${encodeURIComponent(site.hashId)}`
  );
}

export function siteAdminUrl(site: Site): string {
  const url = new URL(site.url);
  const platform = site.platform?.toLowerCase();

  if (platform === "joomla") {
    url.pathname = "/administrator";
  } else if (platform === "wordpress") {
    url.pathname = "/wp-admin";
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

export function siteActionDetails(
  action: SiteOpenAction,
  site: Site,
): { title: string; url: string } {
  switch (action) {
    case "manage":
      return { title: "Open MySites Page", url: siteManagementUrl(site) };
    case "admin":
      return { title: "Open Admin Login", url: siteAdminUrl(site) };
    case "site":
      return { title: "Open Site Root", url: site.url };
  }
}
