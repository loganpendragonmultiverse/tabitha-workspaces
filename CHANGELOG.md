# Changelog

All notable changes are documented here. This project follows Semantic Versioning.

## 1.9.0 - 2026-08-10

- Kept a permanent, renameable Home workspace first and remembered the selected workspace across
  the dashboard, popup, background commands, and new captures.
- Added persistent folder expansion, clear folder targeting, top insertion for new workspaces, and
  reliable workspace and collection drag data.
- Added pinning, starring, and starred-only views for workspaces and collections.
- Added click-to-rename collection headings, including immediate renaming after Save current
  window.
- Made saved-tab search results and List-layout tab rows open their individual URLs directly.
- Made enabled WebDAV sync run immediately when configured and after local library changes, while
  retaining conflict detection and conditional-write safeguards.

## 1.8.0 - 2026-08-05

- Made manually captured windows appear first in the workspace's custom collection order.
- Added per-workspace Custom, Newest added, Oldest added, and A–Z collection ordering.
- Made collection dragging from any sorted view preserve the visible sequence and switch that
  workspace back to Custom order.

## 1.7.0 - 2026-08-04

- Added a prominent Workspaces/Open windows switch at the top of the dashboard sidebar.
- Made live browser-window groups individually collapsible and added Expand all and Collapse all
  controls for current windows.
- Added the collection-level Edit action to List layout while retaining direct saved-tab editing.
- Made Cards, Compact, and List changes expand the current workspace's collections so the selected
  layout is immediately visible.

## 1.6.0 - 2026-08-03

- Moved the complete collection browser into each workspace instead of limiting the overview to
  three recently updated cards.
- Renamed saved browser sessions to collections throughout the interface, popup, manifest, and
  documentation.
- Replaced the overlapping Sessions and Open tabs destinations with a single Open windows view
  grouped by live browser window.
- Kept Cards, Compact, List, expand, and collapse controls directly within every workspace.
- Preserved old `#/sessions` and `#/live` bookmarks by redirecting them to Open windows.

## 1.5.0 - 2026-08-03

- Added one independently restorable JSON backup per folder while retaining the full-library export.
- Kept password-protected folder contents encrypted inside their individual backup files.
- Replaced timestamp-only WebDAV selection with last-common-version conflict detection and
  conditional writes using `ETag`, `Last-Modified`, and `If-None-Match` safeguards.
- Added direct Workspaces, Collections, and URLs search filters with up to 50 ranked results.
- Persisted individual, expand-all, and collapse-all collection state across dashboard sessions.

## 1.4.5 - 2026-08-03

- Displayed the installed version number persistently in the dashboard sidebar.
- Added a clearly labeled Delete action beside every folder, with confirmation and recycle-bin behavior.
- Kept Cards, Compact, and List as visible one-click session layout controls with no submenu.

## 1.4.0 - 2026-08-03

- Added optional password protection for top-level folders using PBKDF2-SHA-256 and authenticated AES-256-GCM encryption.
- Ensured protected contents remain encrypted in extension storage, JSON exports, and WebDAV backups while unlock keys remain session-only.
- Added explicit lock, unlock, and remove-protection controls with password confirmation and recovery warnings.
- Added distinct card, compact, and list layouts that render saved tabs inside their collection groups.
- Added click-to-collapse collection headings plus expand-all and collapse-all controls.
- Migrated version 1 and version 2 libraries into schema version 3 and added cryptographic round-trip, wrong-key, and storage-boundary tests.

## 1.3.0 - 2026-08-03

- Reframed folders as isolated top-level containers that hold workspaces, matching the intended personal/work/family separation model.
- Added automatic schema migration that places existing libraries into a default Personal folder without losing saved content.
- Rebuilt session list view around one editable row per saved tab, including favicon, title, URL, and a direct delete control.
- Added focused domain coverage for saved-tab row editing/removal and version 1-to-2 library migration.

## 1.2.0 - 2026-08-03

- Added clear folder guidance and folder-based filtering for saved collections inside a workspace.
- Made session list view genuinely compact with favicon, collection title, and primary-tab URL.
- Corrected the workspace overview heading from “Recent sessions” to “Recently updated
  collections.”
- Added a prominent JSON-backup warning for unpacked-extension updates and replacements.
- Removed unnecessary module-preload hints that caused Chromium cross-world resource warnings.

## 1.1.0 - 2026-07-26

- Added opt-in HTTPS WebDAV backup synchronization across browsers and devices.
- Added direct release download links and clearer Chromium and Firefox installation paths.
- Added inline session renaming in the popup and card/list layouts in the dashboard.
- Added dismissible onboarding and an opt-in dashboard-on-new-tab preference.
- Added workspace selection while editing saved content and cross-workspace session drag and drop.
- Allowed duplicate tab restoration by default for new installations and clarified the existing-tab
  message for current users.

## 1.0.0 - 2026-07-21

- Rebuilt Tabitha as a functional local-first workspace manager.
- Added workspaces, folders, sessions, links, notes, tags, search, and recycle bin.
- Added live-tab capture, duplicate-safe restoration, recovery snapshots, context menus, and
  keyboard shortcuts.
- Added versioned import/export, internal note links and backlinks, drag-and-drop ordering, and
  appearance preferences.
- Added separate Manifest V3 Chromium and Firefox builds with no external data collection.
