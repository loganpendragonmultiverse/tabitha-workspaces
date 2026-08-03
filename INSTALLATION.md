# Installation

GitHub release packages are unsigned development distributions. Browser stores are not yet claimed.

Direct downloads:

- [Chrome and Chromium package](https://github.com/loganpendragonmultiverse/tabitha-workspaces/releases/download/v1.2.0/tabitha-workspaces-1.2.0-chrome.zip)
- [Firefox package](https://github.com/loganpendragonmultiverse/tabitha-workspaces/releases/download/v1.2.0/tabitha-workspaces-1.2.0-firefox.zip)

## Chromium browsers

1. Download and extract the `tabitha-workspaces-1.2.0-chrome.zip` release asset.
2. Open `chrome://extensions` or the equivalent page in the Chromium-derived browser.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted directory containing `manifest.json`.

The extension toolbar menu can then open the dashboard, save the active page, or capture a window.

### Updating an unpacked copy safely

1. Open **Tabitha → Settings → Backup and portability** and select **Export JSON**.
2. Keep the existing extension installed while extracting the new release.
3. Reuse the same extracted directory and select **Reload** on the browser's extensions page when
   possible.
4. If the new copy opens with an empty library, use **Import backup**. Do not remove the old copy
   until the new library is verified.

An unpacked extension loaded from another directory can receive another browser extension ID. That
new installation cannot read local storage owned by the previous ID.

## Firefox

For temporary development installation:

1. Extract `tabitha-workspaces-1.2.0-firefox.zip`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**.
4. Select `manifest.json` in the extracted directory.

Firefox removes temporary add-ons when the browser closes. Permanent general distribution requires
a package signed through Mozilla Add-ons, which is a separate store submission and review process.

## From source

```shell
npm ci
npm run build
```

Load `.output/chrome-mv3` or `.output/firefox-mv3` using the corresponding procedure above.
