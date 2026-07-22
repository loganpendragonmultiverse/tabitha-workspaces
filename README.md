# Tabitha Workspaces

Tabitha Workspaces is a private, local-first browser workspace and session manager for Chromium
and Firefox. It turns open tabs, research links, and connected notes into durable workspaces
without requiring an account or transmitting browsing data.

This project is a maintained, independent successor inspired by the discontinued
[robkam/Tabitha](https://github.com/robkam/Tabitha). See [NOTICE.md](NOTICE.md) for attribution.

## What it does

- Organizes separate workspaces with folders and ordered collections.
- Captures the current browser window as a restorable session.
- Restores sessions into a new or existing window and optionally skips duplicate URLs.
- Shows open tabs across browser windows and refreshes the view automatically.
- Saves individual links with descriptions and tags.
- Stores notes with `[[internal links]]` and backlink counts.
- Searches workspace names, folders, sessions, saved tabs, URLs, notes, and tags.
- Soft-deletes workspaces, folders, sessions, links, and notes into a recycle bin.
- Reorders workspaces and sessions with drag and drop.
- Creates optional replacement-style recovery snapshots on a user-selected interval.
- Imports and exports a complete, versioned JSON backup.
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
- `.output/tabitha-workspaces-1.0.0-chrome.zip`
- `.output/tabitha-workspaces-1.0.0-firefox.zip`

## Architecture

The extension uses WXT, TypeScript, and Preact. Browser events live in a background entrypoint;
the dashboard and popup share a versioned library model. Pure domain functions handle capture,
restore planning, search, tags, note links, backups, ordering, and recycle-bin behavior. Details
and data boundaries are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Limitations

- Google Drive synchronization from the original proposal is intentionally not included. It would
  require OAuth credentials, external data transmission, consent UX, remote failure handling, and
  conflict resolution. JSON backup is the supported portability mechanism in version 1.
- Browser-internal pages such as `chrome://settings` and `about:config` cannot be restored by an
  extension and are omitted during capture.
- Extension-store publication is not the same as a GitHub release. Chrome Web Store and Mozilla
  Add-ons submissions require separate developer accounts and review.
- Recovery snapshots are disabled by default and replace the prior automatic snapshot rather than
  building an unbounded history.

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Use GitHub Issues for verified
bugs and focused feature requests, [SUPPORT.md](SUPPORT.md) for usage help, and
[SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

Tabitha Workspaces is licensed under the GNU General Public License version 3. See [LICENSE](LICENSE).
