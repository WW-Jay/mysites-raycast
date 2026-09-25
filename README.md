# MySites.guru for Raycast

Search, inspect, and manage your [MySites.guru](https://mysites.guru) connected sites directly from Raycast.

Read more about the MySites.guru API in the [blog post](https://mysites.guru/blog/mysites-guru-api/).

## Screenshots

![Search](images/search.png)

![Setup](images/setup.png)

## What is Raycast?

[Raycast](https://www.raycast.com/) is a fast, extendable launcher for macOS that replaces Spotlight. It's basically your command center — search files, run scripts, manage clipboard history, control apps, all from a single keyboard shortcut.

Why developers love it:

- **Speed** — launches instantly, stays out of your way
- **Extensions** — community-built extensions (like this one) plug right into the launcher
- **Built-in tools** — clipboard history, window management, snippets, a calculator that actually works
- **Developer-friendly** — script commands, API integrations, React-based extension SDK
- **Free** — the core app is free, with an optional Pro plan for AI and cloud sync

[Download Raycast](https://www.raycast.com/) (macOS only)

## Install

1. Clone or download the repository
2. Install dependencies and start development:
   ```bash
   npm install && npm run dev
   ```
   For Raycast Beta, run `npm install && npm run dev:beta` instead.
3. Open the command in Raycast
4. Enter your OAuth client ID in the extension preferences
5. Sign in to MySites.guru and approve the requested access

Register your OAuth client at **Account → API Clients** in the MySites.guru dashboard with this redirect URI:

```text
https://raycast.com/redirect?packageName=Extension
```

The extension uses OAuth2 Authorization Code with PKCE and does not require a client secret.

## Features

- Search all your connected sites by name
- Filter sites by tag or by whether they need attention
- See update, vulnerability, SSL expiry, compromise, and needs-attention badges at a glance
- View platform, version, connection, SSL, and update information
- Review account-wide portfolio health from the account view
- Monitor at-risk sites from the menu bar with background refresh
- Get highlighted (and optionally notified) when a site newly needs attention
- Choose which signals count as needing attention (hide routine plugin updates, keep security alerts)
- Review audit, backup, snapshot, and extension history
- Queue audits, backups, snapshots, and extension updates individually or in bulk
- Configurable Enter and Command-Enter site actions
- Copy site and management URLs to the clipboard
- Real favicons for each site
- Secure OAuth2 authentication with PKCE and rotating refresh tokens
- 5-minute response cache with manual refresh using ⌘R

## Commands

| Command | Description |
|---------|-------------|
| Site Search | Search, inspect, and manage your sites |
| At-Risk Sites | Review sites needing attention and queue bulk actions |
| Copy Portfolio Summary | Copy an account-wide health summary to the clipboard |
| Portfolio Monitor | Show sites needing attention in the menu bar |
| Run Site Audit | Find a site and queue a security audit |
| Create Site Backup | Find a site and queue a backup |
| Take Site Snapshot | Find a site and queue a file snapshot |
| Sign Out | Remove the stored OAuth session |
