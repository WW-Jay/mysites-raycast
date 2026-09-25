/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OAuth Client ID - Client ID from your MySites.guru API client registration */
  "clientId": string,
  /** List: CMD+Enter Action - Action when pressing Command+Enter on a site in the search list (Enter always opens the detail view) */
  "listSiteAction": "manage" | "site" | "admin",
  /** Detail: Enter Action - Action when pressing Enter in the site detail view */
  "primarySiteAction": "manage" | "site" | "admin",
  /** Detail: CMD+Enter Action - Action when pressing Command+Enter in the site detail view */
  "secondarySiteAction": "manage" | "site" | "admin",
  /** Confirm Actions - Show a confirmation prompt before queuing audits, backups, or snapshots */
  "confirmSiteActions": boolean,
  /** Attention Signals - Flag sites in the menu bar and At-Risk command when a compromise or malicious cron job is detected */
  "concernCompromise": boolean,
  /**  - Flag sites with vulnerable extensions or core vulnerabilities */
  "concernVulnerabilities": boolean,
  /**  - Flag sites whose SSL certificate is expiring soon or has expired */
  "concernSsl": boolean,
  /**  - Flag sites that are not currently connected */
  "concernDisconnected": boolean,
  /**  - Flag sites with a CMS core update available */
  "concernCoreUpdates": boolean,
  /**  - Flag sites with any available updates. Turn this off (while leaving core updates on) to hide routine plugin-update noise */
  "concernUpdates": boolean,
  /**  - Flag sites with debug mode, offline mode, open registration, disabled caching, or admins without 2FA */
  "concernConfig": boolean,
  /**  - Flag sites that are paused */
  "concernPaused": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-sites` command */
  export type SearchSites = ExtensionPreferences & {}
  /** Preferences accessible in the `run-audit` command */
  export type RunAudit = ExtensionPreferences & {}
  /** Preferences accessible in the `create-backup` command */
  export type CreateBackup = ExtensionPreferences & {}
  /** Preferences accessible in the `take-snapshot` command */
  export type TakeSnapshot = ExtensionPreferences & {}
  /** Preferences accessible in the `at-risk-sites` command */
  export type AtRiskSites = ExtensionPreferences & {}
  /** Preferences accessible in the `portfolio-summary` command */
  export type PortfolioSummary = ExtensionPreferences & {}
  /** Preferences accessible in the `portfolio-monitor` command */
  export type PortfolioMonitor = ExtensionPreferences & {}
  /** Preferences accessible in the `sign-out` command */
  export type SignOut = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-sites` command */
  export type SearchSites = {}
  /** Arguments passed to the `run-audit` command */
  export type RunAudit = {}
  /** Arguments passed to the `create-backup` command */
  export type CreateBackup = {}
  /** Arguments passed to the `take-snapshot` command */
  export type TakeSnapshot = {}
  /** Arguments passed to the `at-risk-sites` command */
  export type AtRiskSites = {}
  /** Arguments passed to the `portfolio-summary` command */
  export type PortfolioSummary = {}
  /** Arguments passed to the `portfolio-monitor` command */
  export type PortfolioMonitor = {}
  /** Arguments passed to the `sign-out` command */
  export type SignOut = {}
}

