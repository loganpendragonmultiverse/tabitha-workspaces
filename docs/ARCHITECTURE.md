# Architecture

## Runtime surfaces

- `entrypoints/background.ts` owns browser events, tab capture, restore execution, context menus,
  shortcuts, and snapshot scheduling.
- `entrypoints/dashboard/` provides the complete management interface.
- `entrypoints/popup/` provides fast capture, save-link, recent-session, and dashboard actions.
- `src/domain/` contains browser-independent models and operations.
- `src/security/` implements protected-folder key derivation and authenticated encryption.
- `src/storage/` owns the versioned local library record and the separate optional WebDAV
  configuration record.
- `src/sync/` implements explicit, opt-in WebDAV backup synchronization.

## Data hierarchy

```text
Library
├── Folders (optional encrypted container)
│   └── Workspaces
│       ├── Collections (saved tab sessions)
│       ├── Saved links
│       └── Notes
└── Settings
```

Entity identifiers are random UUIDs. Order is explicit rather than inferred from array position.
Deletion sets `trashedAt`; permanent deletion also removes descendants of deleted workspaces and
top-level folders. Folders contain workspaces; workspaces contain collections, links, and notes.
Full-library and per-folder backups use distinct format markers and versions before accepting data.
Folder imports replace only the matching folder identity and reject identifier collisions with
unrelated content. The version 3 normalizer migrates version 1 and version 2 libraries while
preserving workspaces and saved content.

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
- Password-protected folders are sealed before persistence with AES-256-GCM. The key is derived with
  PBKDF2-SHA-256 (310,000 iterations and a random 128-bit salt), stored only in browser session
  storage after unlock, and cleared when the folder locks or the browser session ends. Stored
  libraries, exported backups, and WebDAV files contain only the encrypted vault.
- WebDAV sync fingerprints the last common library. Remote replacement uses `If-Match` with an
  `ETag`, falls back to `If-Unmodified-Since`, and refuses an unsafe overwrite when neither server
  validator exists. New files use `If-None-Match: *`. Divergent local and remote fingerprints stop
  as a conflict and never invoke an automatic write.
- Store packages contain generated application code only; development dependencies are not bundled.
