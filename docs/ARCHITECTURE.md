# Architecture

## Runtime surfaces

- `entrypoints/background.ts` owns browser events, tab capture, restore execution, context menus,
  shortcuts, and snapshot scheduling.
- `entrypoints/dashboard/` provides the complete management interface.
- `entrypoints/popup/` provides fast capture, save-link, recent-session, and dashboard actions.
- `src/domain/` contains browser-independent models and operations.
- `src/storage/` owns the single versioned `browser.storage.local` record.

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
folders. Backups use a format marker and schema version before accepting replacement data.

## Browser boundary

The domain layer does not import browser APIs. The background worker converts browser tabs to the
portable captured-tab shape, rejects privileged URL schemes, and executes a duplicate-safe restore
plan. WXT generates a Chromium service worker and Firefox background script from the same entrypoint.

## Security boundary

- No content scripts or host permissions.
- No HTML rendering of note content; notes remain plain text.
- No remote code, CDN resources, analytics, or network requests.
- Import accepts only the versioned JSON envelope and replaces data only after explicit confirmation.
- Store packages contain generated application code only; development dependencies are not bundled.
