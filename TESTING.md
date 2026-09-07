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
search and List layout, exact collection focus from search, labeled folder/workspace creation,
the Starred sidebar view, recoverable workspace and collection merges, per-window capture, saving one
live tab to an existing collection, saved-tab drag and drop between collections, rename-time drag
suppression, immediate WebDAV enablement sync, automatic WebDAV upload after a local
library change, legacy `#/sessions` and `#/live` redirects, optional new-tab behavior, top-level
folder migration, editable tab rows, WebDAV permission prompt, and an intentional sync conflict.
For version 1.11, also verify newest-first recycle-bin ordering, UK dates, direct saved-tab removal,
top insertion after empty collection creation, drag-edge auto-scroll with unchanged edge drops,
title/URL persistence on blur and Enter, first-enable Koofr/WebDAV file creation without a false
conflict, explicit Home starring, the popup and dashboard save-destination labels, and the New window
action from collection and tab search results. Keep workspace/collection merge and explicit
other-window capture in the regression pass.
Store review and signing occur separately from the GitHub release.

## Version 1.12.0: reviewed improvements

Add reviewed duplicate-URL merges, private diagnostic summaries and interrupted-sync safeguards.

Settings now reviews exact or normalized URLs across selected unprotected collections, previews duplicate groups and creates a merged copy while retaining originals. Query strings remain significant; fragment removal is explicit. Changed source collections require a fresh preview. Protected and trashed folders are excluded. Diagnostic exports contain status categories and elapsed time, without server URLs, usernames, credentials, raw errors or browsing content. Concurrent sync requests are rejected, and a downloaded restore is refused if local data changed during transfer. Protected-library imports reject plaintext content and ambiguous legacy protection. Tests cover interrupted upload, truncated download, stale restore, duplicate policies and diagnostic redaction. Component desktop and narrow-width QA passed; the full dashboard retains its existing desktop minimum width. Native extension installation and a real WebDAV server were not exercised in this release.

Validation: `npm run validate` and `npm audit --omit=dev`.
