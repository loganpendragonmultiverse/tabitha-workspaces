# Tabitha Workspaces

Tabitha Workspaces is a private, local-first browser workspace and session manager for Chromium
and Firefox. It turns open tabs, research links, and connected notes into durable workspaces
without requiring an account or transmitting browsing data.

This project is a maintained, independent successor inspired by the discontinued
[robkam/Tabitha](https://github.com/robkam/Tabitha). See [NOTICE.md](NOTICE.md) for attribution.

## Download

- [Download Tabitha Workspaces 1.3.0 for Chrome and Chromium](https://github.com/loganpendragonmultiverse/tabitha-workspaces/releases/download/v1.3.0/tabitha-workspaces-1.3.0-chrome.zip)
- [Download Tabitha Workspaces 1.3.0 for Firefox](https://github.com/loganpendragonmultiverse/tabitha-workspaces/releases/download/v1.3.0/tabitha-workspaces-1.3.0-firefox.zip)
- [View the latest release and release notes](https://github.com/loganpendragonmultiverse/tabitha-workspaces/releases/latest)

After downloading, follow the short browser-specific steps in
[INSTALLATION.md](INSTALLATION.md).

## What it does

- Uses top-level folders as isolated containers for one or more workspaces.
- Captures the current browser window as a restorable session.
- Restores sessions into a new or existing window and optionally skips duplicate URLs.
- Shows open tabs across browser windows and refreshes the view automatically.
- Saves individual links with descriptions and tags.
- Stores notes with `[[internal links]]` and backlink counts.
- Searches workspace names, folders, sessions, saved tabs, URLs, notes, and tags.
- Soft-deletes workspaces, folders, sessions, links, and notes into a recycle bin.
- Reorders workspaces and sessions with drag and drop.
- Moves sessions between workspaces by dragging them onto the workspace sidebar or editing them.
- Switches saved sessions between cards and an editable tab-row list with favicon, title, URL, and delete controls.
- Migrates existing version 1 libraries into a default top-level folder without losing workspaces or saved content.
- Renames recent sessions directly from the toolbar popup.
- Optionally opens the dashboard when a new browser tab is created.
- Creates optional replacement-style recovery snapshots on a user-selected interval.
- Imports and exports a complete, versioned JSON backup.
- Optionally synchronizes the newest library through a user-provided HTTPS WebDAV file.
- Provides system, light, and dark themes, compact density, and a custom accent color.
- Adds toolbar actions, page context menus, and keyboard shortcuts.

## Three-minute start

1. Download the package for your browser from the latest GitHub release.
2. Follow [INSTALLATION.md](INSTALLATION.md) to load the package locally.
3. Select **Save window** from the toolbar popup.
4. Open the workspace dashboard to name, tag, restore, or reorganize the saved session.
5. Export a JSON backup from **Settings** whenever you want a portable copy.

## Privacy

Tabitha Workspaces has no server, account, analytics, advertising, telemetry, or remote code.
Library data stays in browser extension storage until the user explicitly exports a backup.
The extension requests only the following permissions:

| Permission         | Why it is needed                                                               |
| ------------------ | ------------------------------------------------------------------------------ |
| `storage`          | Save the local workspace library and preferences.                              |
| `tabs`             | Read tab titles and URLs when the user captures or monitors browser windows.   |
| `contextMenus`     | Provide Save page, Save window, and Open Tabitha actions.                      |
| `unlimitedStorage` | Prevent larger session and note libraries from being evicted by normal quotas. |
| `alarms`           | Schedule optional local recovery snapshots.                                    |

When WebDAV sync is enabled, Tabitha asks separately for access to only the HTTPS server origin
selected by the user. WebDAV credentials stay in local extension storage and are not included in
library exports or remote backup files.

No host permissions are requested. Read [PRIVACY.md](PRIVACY.md) for the complete policy.

## Browser support

- Chrome and Chromium-derived desktop browsers using Manifest V3.
- Firefox desktop 142 or later using Manifest V3 background scripts and the current built-in
  no-data consent declaration.

Both packages are built from the same TypeScript source. Browser-specific manifests are generated
and verified independently. Mobile browsers and Safari have not been tested and are not claimed as
supported.

## Building from source

Requirements: Node.js 20.19 or later and npm.

```shell
npm ci
npm run validate
```

Development commands:

```shell
npm run dev
npm run dev:firefox
```

Production output:

- `.output/chrome-mv3/`
- `.output/firefox-mv3/`
- `.output/tabitha-workspaces-1.3.0-chrome.zip`
- `.output/tabitha-workspaces-1.3.0-firefox.zip`

## Architecture

The extension uses WXT, TypeScript, and Preact. Browser events live in a background entrypoint;
the dashboard and popup share a versioned library model. Pure domain functions handle capture,
restore planning, search, tags, note links, backups, ordering, and recycle-bin behavior. Details
and data boundaries are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Limitations

- Cross-browser synchronization uses a user-provided WebDAV file. Its automatic mode is
  last-write-wins using the library update time; use the manual upload/download controls before
  making simultaneous changes on multiple devices.
- Browser-internal pages such as `chrome://settings` and `about:config` cannot be restored by an
  extension and are omitted during capture.
- Extension-store publication is not the same as a GitHub release. Chrome Web Store and Mozilla
  Add-ons submissions require separate developer accounts and review.
- Recovery snapshots are disabled by default and replace the prior automatic snapshot rather than
  building an unbounded history.
- Before removing or replacing an unpacked installation, export a JSON backup. Loading the
  replacement from another directory can change its browser extension ID and isolate the old local
  storage.

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Use GitHub Issues for verified
bugs and focused feature requests, [SUPPORT.md](SUPPORT.md) for usage help, and
[SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

Tabitha Workspaces is licensed under the GNU General Public License version 3. See [LICENSE](LICENSE).

## More open-source projects

This project is part of the [Logan Pendragon Forge open-source collection](https://www.loganpendragonforge.com/open-source/). Browse the catalog for other released tools, source repositories, live demos, and downloads.
