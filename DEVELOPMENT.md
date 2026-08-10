# Tabitha Workspaces development contract

Tabitha Workspaces is a maintained, cross-browser successor to
[robkam/Tabitha](https://github.com/robkam/Tabitha). It is an independent rebuild, not an
official continuation endorsed by the original author.

## Version 1 scope

- One local-first library shared by the dashboard, popup, and background worker.
- Workspaces, folders, saved tab collections, links, notes, tags, and soft deletion.
- Capture and restore browser windows with duplicate-safe restoration.
- Live-tab view, opt-in automatic recovery snapshots, context menus, and shortcuts.
- Search across saved content and `[[internal note links]]` with backlinks.
- Versioned JSON import/export with full-library and independently restorable per-folder backups.
- Themes, density, accent color, and restore preferences.
- Separate, verified Manifest V3 packages for Chromium and Firefox.
- No analytics, advertising, accounts, remote code, or transmission of browsing data.

## Deliberate exclusions

Google Drive synchronization is not part of version 1. It requires an OAuth client, external
data transmission consent, store-review configuration, token security, and conflict resolution.
The storage and import/export layers remain provider-neutral so an explicitly authorized sync
provider can be added later without changing the library schema.

## Release gates

Run `npm run validate`. Both browser manifests must contain only the permissions documented in
the README, both distributable ZIP files must be generated, and the full test suite must pass.
Store submission is a separate step because it requires developer accounts and store review.

## Version 1.5 feedback release

Version 1.5 is a bounded reliability and large-library release. Folder exports are independent
versioned envelopes; a protected folder carries its existing encrypted vault without plaintext
workspaces or content. WebDAV synchronization compares both copies to their last common
fingerprint and uses remote validators for replacement uploads. Divergent edits become an explicit
conflict rather than a timestamp guess. Search can be scoped to workspaces, collections, or URLs,
and collection collapse state persists for libraries with hundreds of collections.

## Version 1.6 workspace model release

Version 1.6 makes the information architecture match the data model. A workspace owns its complete
set of saved collections and their Cards, Compact, List, expand, and collapse controls. The live
Open windows destination is strictly current browser state, grouped by browser window and tab.
Legacy dashboard hashes continue to resolve so existing bookmarks and popup actions remain safe.

## Version 1.7 navigation consistency release

Version 1.7 makes the saved/live distinction a prominent two-mode switch without changing the
library schema. Live browser windows gain the same individual and all-at-once collapse behavior as
saved collections, with collapse state retained only for the current dashboard session because
browser window IDs are ephemeral. List layout keeps direct tab editing and also exposes the full
collection editor. Selecting a collection layout expands that workspace's collections so the
visual change cannot be hidden behind collapsed headings.

## Version 1.8 collection ordering release

Version 1.8 makes newly captured manual collections immediately visible at the top of Custom order.
Each workspace independently persists a Custom, Newest added, Oldest added, or A–Z display order.
Changing a sort mode does not rewrite collection data; dragging within any sorted view converts the
visible sequence into contiguous Custom order for that workspace. Existing libraries normalize to
Custom order without a schema-version change.

## Version 1.9 workspace reliability release

Version 1.9 makes workspace targeting durable across every extension surface. One renameable Home
workspace is retained permanently and sorted first, the last selected workspace becomes the popup
and background capture target, and newly created folders and workspaces become the active
destination. Folder expansion persists, workspaces and collections can be pinned or starred, and
drag operations provide explicit browser drag data. Search and List layout can open one saved tab,
while collection names support direct inline editing after capture. Enabled WebDAV sync checks
immediately when configured and shortly after each local library write without weakening three-way
conflict detection.

## Version 1.3 feedback release

Version 1.3 incorporates direct user feedback with a versioned data-model migration. Folders are
top-level isolated containers and workspaces live inside them; the prior version 1 layout migrates
into one Personal folder without dropping content. Session list mode exposes every saved tab as an
editable favicon, title, and URL row with a direct delete action. Optional password protection is
not included: adding meaningful local isolation requires a separately reviewed encryption and key-
management design, not a cosmetic UI lock. Store packages and reviewer source must be built from
the same tagged commit.
