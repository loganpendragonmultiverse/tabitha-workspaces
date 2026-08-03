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
- Versioned JSON import/export and full-library backup.
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

## Version 1.2 feedback release

Version 1.2 incorporates direct user feedback without changing the local-first data model. Folders
are described and behave as filters within one workspace, list rows expose compact identifying
details, unpacked-installation updates carry an explicit backup warning, collection terminology is
consistent, and generated module-preload hints are disabled. The existing optional new-tab
dashboard and collection-description fields remain available. Store packages and reviewer source
must be built from the same tagged commit.
