# Installation

GitHub release packages are unsigned development distributions. Browser stores are not yet claimed.

## Chromium browsers

1. Download and extract the `tabitha-workspaces-1.0.0-chrome.zip` release asset.
2. Open `chrome://extensions` or the equivalent page in the Chromium-derived browser.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted directory containing `manifest.json`.

The extension toolbar menu can then open the dashboard, save the active page, or capture a window.

## Firefox

For temporary development installation:

1. Extract `tabitha-workspaces-1.0.0-firefox.zip`.
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
