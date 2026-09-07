# Changelog

All notable changes are documented here. This project follows Semantic Versioning.

## 1.11.0 - 2026-08-29

- Sorted the recycle bin by deletion time with the most recently deleted item first and displayed
  saved dates in UK day-first format.
- Added a small direct remove control to every saved-tab tile and made List-layout tab title and URL
  edits persist on blur or Enter.
- Put newly created collections at the top of the active Custom view and automatically returned that
  workspace to Custom ordering so the new collection is immediately visible.
- Added edge-triggered page auto-scrolling during collection drag and drop without changing existing
  collection, workspace, or saved-tab drop targets.
- Made Save and enable perform one atomic WebDAV configuration and initial synchronization, including
  creating a missing Koofr/WebDAV file and clearing stale sync ancestry when credentials change.
- Kept Home out of the Starred view unless it is explicitly starred.
- Clarified the current dashboard save destination and added an explicit popup destination selector
  while retaining the separate Folder and Workspace creation controls.
- Added a New window action to collection and saved-tab search results so the containing collection
  can be restored into a separate browser window.
- Preserved recoverable collection/workspace merging and explicit capture of other open windows, with
  regression coverage for both behaviors.

## 1.10.0 - 2026-08-23

- Separated the folder and workspace creation actions, and promoted Starred to a clear sidebar view.
- Made collection search results reveal, expand, focus, and scroll to the selected collection.
- Added recoverable multi-selection merging for workspaces and collections.
- Added capture controls for every open browser window and a direct way to save one open tab into an
  existing collection.
- Added saved-tab drag and drop between collections and disabled collection dragging while its name
  is being edited.
- Removed the duplicate dashboard-level Save window action while retaining contextual capture actions.

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

## Version 1.12.0: reviewed improvements

Add reviewed duplicate-URL merges, private diagnostic summaries and interrupted-sync safeguards.

Settings now reviews exact or normalized URLs across selected unprotected collections, previews duplicate groups and creates a merged copy while retaining originals. Query strings remain significant; fragment removal is explicit. Changed source collections require a fresh preview. Protected and trashed folders are excluded. Diagnostic exports contain status categories and elapsed time, without server URLs, usernames, credentials, raw errors or browsing content. Concurrent sync requests are rejected, and a downloaded restore is refused if local data changed during transfer. Protected-library imports reject plaintext content and ambiguous legacy protection. Tests cover interrupted upload, truncated download, stale restore, duplicate policies and diagnostic redaction. Component desktop and narrow-width QA passed; the full dashboard retains its existing desktop minimum width. Native extension installation and a real WebDAV server were not exercised in this release.

Validation: `npm run validate` and `npm audit --omit=dev`.

## Version 1.13.0: reviewed improvements

Add a right-hand live-tab capture panel, searchable multi-tab capture, browser favicon recovery and safer WebDAV fingerprint migration.

Open windows toggles a third column beside saved collections. Drag one tab or a selected set directly onto a collection; source tabs remain open. Search filters titles and URLs, Select visible batches matching tabs, and duplicate skipping is explicit. A keyboard capture destination offers an alternative to dragging. Capture rechecks current browser tabs and the destination before saving. Chromium uses its favicon API for imported URL-only entries; Firefox can recover matching icons from currently open tabs, with a letter fallback when no icon is available. Missing icons are not sent to a third-party favicon service. Close controls have a smaller neutral glyph. Sync fingerprints are independent of JSON object key order, accept the previous fingerprint format and recognize an unchanged strong remote ETag while retaining conditional upload and real conflict protection. Actual Koofr account testing was not available; no claim is made that every provider-specific conflict is resolved.

Validation: complete project validation, 75 automated tests, Chromium/Firefox builds and packaging, manifest checks, Firefox lint and dependency audit. Controlled browser fixtures exercise the full dashboard; native installed-extension and live Koofr acceptance remain unverified. The full dashboard retains a desktop minimum width; the panel stacks below content on narrower desktop windows.

The build now pins fast-uri 3.1.6 for URI parser security fixes. See SECURITY.md for the remaining development-only image-size advisories; no shipped dependency vulnerability was reported.
