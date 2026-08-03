# Architecture

## Runtime surfaces

- `entrypoints/background.ts` owns browser events, tab capture, restore execution, context menus,
  shortcuts, and snapshot scheduling.
- `entrypoints/dashboard/` provides the complete management interface.
- `entrypoints/popup/` provides fast capture, save-link, recent-session, and dashboard actions.
- `src/domain/` contains browser-independent models and operations.
- `src/storage/` owns the versioned local library record and the separate optional WebDAV
  configuration record.
- `src/sync/` implements explicit, opt-in WebDAV backup synchronization.

## Data hierarchy

```text
Library
├── Workspaces
│   ├── Folders
│   ├── Collections (saved tab sessions)
│   ├── Saved links
│   └── Notes
└── Settings
```

Entity identifiers are random UUIDs. Order is explicit rather than inferred from array position.
Deletion sets `trashedAt`; permanent deletion also removes descendants of deleted workspaces and
top-level folders. Folders contain workspaces; workspaces contain collections, links, and notes.
Backups use a format marker and schema version before accepting replacement data. The version 2
normalizer migrates version 1 libraries into one default folder while preserving existing workspaces
and saved content.

## Browser boundary

The domain layer does not import browser APIs. The background worker converts browser tabs to the
portable captured-tab shape, rejects privileged URL schemes, and executes a duplicate-safe restore
plan. WXT generates a Chromium service worker and Firefox background script from the same entrypoint.

## Security boundary

- No content scripts or required host permissions. WebDAV users grant an optional HTTPS origin at
  configuration time.
- No HTML rendering of note content; notes remain plain text.
- No remote code, CDN resources, or analytics. Network requests occur only when a user configures
  WebDAV synchronization and go only to the granted origin.
- Import accepts only the versioned JSON envelope and replaces data only after explicit confirmation.
- Store packages contain generated application code only; development dependencies are not bundled.
