# Extension store submission packet

This packet is prepared for Tabitha Workspaces 1.2.0. Store submission requires the maintainer's
developer accounts, identity/payment enrollment where applicable, final screenshots, and an
explicit **Submit** action in each publisher dashboard.

## Shared listing copy

**Name:** Tabitha Workspaces

**Short description:** Organize tabs, sessions, links, and notes into private local-first
workspaces.

**Single purpose:** Tabitha Workspaces lets people capture, organize, search, and restore browser
tabs and related notes in a local workspace library. Optional WebDAV sync sends the versioned
library only to an HTTPS server chosen and authorized by the user.

**Long description:**

Tabitha Workspaces turns browser windows into durable, searchable collections. Capture the current
window, group saved collections inside workspaces and folders, restore them later, save individual
links, and keep connected notes with tags and internal links. Card and compact list layouts make
large libraries easier to scan. The optional new-tab setting opens the workspace dashboard when a
new tab is created.

The extension has no account, ads, analytics, telemetry, or developer-operated server. Data stays
in browser extension storage unless the user exports a JSON backup or explicitly enables WebDAV
sync to an HTTPS server they choose. Browser-internal pages cannot be captured or restored.

**Support URL:** https://github.com/loganpendragonmultiverse/tabitha-workspaces/issues

**Homepage:** https://github.com/loganpendragonmultiverse/tabitha-workspaces

**Privacy policy:**
https://github.com/loganpendragonmultiverse/tabitha-workspaces/blob/main/PRIVACY.md

**Category:** Productivity

## Permission explanations

- `storage`: stores the local library, preferences, and user-configured WebDAV credentials.
- `tabs`: reads titles, URLs, favicons, and window membership when the user captures or views tabs.
- `contextMenus`: adds explicit Save page, Save window, and Open Tabitha actions.
- `unlimitedStorage`: prevents larger user-created libraries from being evicted by normal quotas.
- `alarms`: schedules optional local recovery snapshots and optional WebDAV synchronization.
- Optional `https://*/*`: requested at runtime only for the exact HTTPS WebDAV origin selected by
  the user; no host access is granted by default.

## Chrome Web Store

1. Register and verify a Chrome Web Store developer account.
2. Upload `tabitha-workspaces-1.2.0-chrome.zip`; `manifest.json` is already at the ZIP root.
3. Add the listing copy, Productivity category, support/homepage links, and public visibility.
4. Upload the 128×128 icon, at least one 1280×800 or 640×400 product screenshot, and the required
   440×280 promotional tile. A 1400×560 marquee tile is optional.
5. In Privacy, declare the single purpose above, explain every permission, disclose local handling
   of browsing activity and user-authored content, disclose the optional user-directed WebDAV
   transfer, and link the privacy policy.
6. Reviewer test path: open the dashboard, save a window, edit the collection, restore it, export a
   backup, and enable the new-tab option. WebDAV needs no reviewer credentials and is optional.
7. Submit for review. Deferred publishing is useful for verifying approval before choosing the
   public launch moment.

Official references: [publishing](https://developer.chrome.com/docs/webstore/publish),
[listing images](https://developer.chrome.com/docs/webstore/images), and
[program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

## Firefox Add-ons (AMO)

1. Sign in to the AMO Developer Hub and choose **Submit a New Add-on → On this site**.
2. Upload `tabitha-workspaces-1.2.0-firefox.zip` and select Firefox desktop.
3. Because WXT/Vite bundles and transforms the source, answer **Yes** to the source-code question
   and upload `tabitha-workspaces-1.2.0-sources.zip` from the same tagged release.
4. Include reviewer build notes: Ubuntu, Node.js 24, npm, `npm ci`, then
   `npm run build:firefox`; the output is `.output/firefox-mv3`.
5. Add the listing copy, GPL-3.0 license, support links, privacy policy, and reviewer notes. The
   manifest already declares the stable Gecko ID and Firefox's required no-data declaration.
6. Submit the version and retain the AMO-signed package as the permanent Firefox distribution.

Official references: [submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
and [source-code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/).

## Microsoft Edge Add-ons

1. Register the Microsoft account in the Edge program in Partner Center; Microsoft currently states
   there is no extension-program registration fee.
2. Create a new extension and upload `tabitha-workspaces-1.2.0-chrome.zip`.
3. Choose public visibility and markets, enter the shared listing copy, and provide the logo and
   screenshots requested by Partner Center.
4. In Privacy, state the single purpose, justify all permissions, declare no remote code, accurately
   disclose local data handling and optional user-directed WebDAV sync, and link the privacy policy.
5. Add certification notes using the Chrome reviewer test path above, then publish for
   certification. Microsoft documents that certification can take up to seven business days.

Official references: [publishing an Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
and [Edge Add-ons policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies).

## Assets still requiring maintainer review

- One to five clean 1280×800 screenshots showing the workspace overview, folder filtering, compact
  list view, and Settings backup/new-tab controls.
- A 440×280 Chrome promotional tile and optional 1400×560 marquee tile.
- Final publisher display names, support email addresses, target markets, and account ownership.

Do not submit screenshots containing private browsing data, WebDAV URLs, credentials, email
addresses, or real user notes.
