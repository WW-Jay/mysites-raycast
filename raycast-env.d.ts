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
  "confirmSiteActions": boolean
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
  /** Arguments passed to the `sign-out` command */
  export type SignOut = {}
}

