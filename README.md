# mySites.guru for Raycast

Search and jump to any of your [mySites.guru](https://mysites.guru) managed sites directly from Raycast.

Read more about how and why we built this in our [blog post](https://mysites.guru/blog/mysites-guru-raycast-extension-for-mac/).

## Screenshots

<img width="1872" height="1320" alt="CleanShot 2026-02-27 at 20 51 22@2x" src="https://github.com/user-attachments/assets/abbc014b-2299-4454-9657-14dfb71206b2" />

![Setup](images/setup.png)

<img width="1872" height="1320" alt="CleanShot 2026-02-27 at 20 52 31@2x" src="https://github.com/user-attachments/assets/d256b046-5849-49fb-a1cd-c061776ba824" />


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

<a href="https://github.com/mySites-guru/raycast-extension/releases/latest"><img src="https://img.shields.io/badge/Install_for_Raycast-black?style=for-the-badge&logo=raycast&logoColor=FF6363" alt="Install for Raycast" /></a>

1. Download the [latest release](https://github.com/mySites-guru/raycast-extension/releases/latest)
2. Clone or extract, then run:
   ```bash
   npm install && npm run dev
   ```
   For Raycast Beta, run `npm install && npm run dev:beta` instead.
3. Open the command in Raycast
4. Enter the client ID in the extension preferences
5. Sign in to MySites.guru and approve the requested access

Register the OAuth client with this redirect URI:

```text
https://raycast.com/redirect?packageName=mysites-guru
```

The extension uses OAuth2 Authorization Code with PKCE and does not require a
client secret.

## Features

- Search all your connected sites by name
- View platform, version, connection, SSL, and update information
- Review audit, backup, snapshot, and extension history
- Queue audits, backups, snapshots, and extension updates
- Configure the Enter and Command-Enter site actions
- Copy backup archive filenames with Command-Enter
- Visit the site directly in your browser
- Copy site URLs to the clipboard
- Real favicons for each site
- Secure OAuth2 authentication with PKCE and rotating refresh tokens
- Cached results with manual refresh using ⌘R

## Commands

| Command | Description |
|---------|-------------|
| MySites.guru Site Search | Search, inspect, and manage sites |
| MySites: Run Site Audit | Search for a site and queue an audit |
| MySites: Create Site Backup | Search for a site and queue a backup |
| MySites: Take Site Snapshot | Search for a site and queue a snapshot |
| MySites: Sign out | Remove the stored OAuth session |
