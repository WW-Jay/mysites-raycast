# mySites.guru Changelog

## [Unreleased]

- Load the site list from the mySites.guru site summary endpoint in a single request
- Show update, vulnerability, SSL expiry, compromise, and needs-attention badges in the site list
- Filter the site list by status (needs attention, vulnerable, SSL expiring, updates, disconnected, paused), platform, and tag
- Sort the site list by name, attention, SSL expiry, updates, snapshot age, or backup age
- Translate raw attention-reason slugs into human-readable labels
- Match sites when searching for status keywords such as "vulnerable" or "ssl"
- Copy an account-wide portfolio summary to the clipboard
- Surface account-wide portfolio health counts in the account view
- Replace the legacy static token with OAuth2 PKCE authentication
- Use the mySites.guru Agency API for site data
- Add site details, audits, backups, snapshots, and extensions
- Add confirmed actions for queueing audits, backups, snapshots, and extension updates
- Add dedicated audit, backup, and snapshot commands
- Add configurable Enter and Command-Enter site actions
- Use full-width site, account, and audit detail layouts
- Add Command-Enter copying for backup archive filenames
- Configure the OAuth client ID during Raycast onboarding instead of bundling it
- Require Raycast API 1.104.19 so Beta development registration targets the
  Beta application correctly
- Add an explicit sign-out command and re-check OAuth storage on every command
  launch

## [Initial Release] - 2026-02-27

- Search all mySites.guru connected sites
- Open management pages and site URLs
- Real favicon support via Google Favicons
- 5-minute result caching with manual refresh
