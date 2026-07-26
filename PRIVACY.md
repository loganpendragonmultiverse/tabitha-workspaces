# Privacy policy

Effective date: July 26, 2026

Tabitha Workspaces does not collect, sell, rent, or share personal information, browsing activity,
website content, identifiers, diagnostics, or usage analytics with the developer.

The extension processes tab titles, URLs, favicons, user-authored links, notes, tags, workspace
structure, and preferences locally inside the browser. This information is stored with the browser's
extension storage API. It leaves the browser only when the user explicitly downloads a JSON backup,
enables synchronization to a personally selected WebDAV server, or opens a saved URL in the normal
course of browsing.

There is no Tabitha Workspaces server, account, telemetry endpoint, advertising SDK, remote script,
or third-party analytics service. The extension cannot read page contents. WebDAV sync requests an
optional HTTPS host permission for only the server origin selected by the user. Its credentials are
stored separately in local extension storage and are excluded from exports and synchronized files.

Uninstalling the extension normally removes its local extension storage according to the browser's
own behavior. Users should export a backup before uninstalling if they want to preserve their data.

Questions about this policy can be opened as a public support issue when they contain no sensitive
information. Security-sensitive reports should follow [SECURITY.md](SECURITY.md).
