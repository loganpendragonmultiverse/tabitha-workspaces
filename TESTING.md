# Testing Tabitha Workspaces

Use Node.js 20.19 or later. The release workflow currently uses Node.js 24.

```shell
npm ci
npm run validate
```

The validation command checks formatting, ESLint, strict TypeScript, domain tests with coverage,
Chromium and Firefox Manifest V3 builds, manifest permissions, Firefox AMO validation, and all
release ZIP files. The built dashboard HTML must not contain `modulepreload`; this prevents the
cross-world preload warnings reported by Chromium.

Before release, also load both unpacked output directories and verify the dashboard, popup, capture,
restore, full-library and per-folder JSON export/import, protected-folder backup encryption, scoped
search, all workspace collections in each layout, persistent collection collapse state, live tabs
grouped under the correct browser windows, the Workspaces/Open windows mode switch, individual and
all-at-once live-window collapsing, the collection Edit action in List layout, automatic collection
expansion after a layout change, top insertion after Save current window, independent per-workspace
Custom/Newest/Oldest/A–Z ordering, sorted-view dragging that returns the workspace to Custom order,
persistent folder expansion, Home/pinned/starred ordering, new-folder and new-workspace targeting,
remembered popup capture targeting, inline collection renaming, individual saved-tab opening from
search and List layout, immediate WebDAV enablement sync, automatic WebDAV upload after a local
library change, legacy `#/sessions` and `#/live` redirects, optional new-tab behavior, top-level
folder migration, editable tab rows, WebDAV permission prompt, and an intentional sync conflict.
Store review and signing occur separately from the GitHub release.
