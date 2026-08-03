# Testing Tabitha Workspaces

Use Node.js 20.19 or later. The release workflow currently uses Node.js 24.

```shell
npm ci
npm run validate
```

The validation command checks formatting, ESLint, strict TypeScript, domain tests with coverage,
Chromium and Firefox Manifest V3 builds, manifest permissions, Firefox AMO validation, and all
release ZIP files. The built dashboard HTML must not contain `modulepreload`; this prevents the
cross-world preload warnings reported by Chromium.

Before release, also load both unpacked output directories and verify the dashboard, popup, capture,
restore, JSON export/import, optional new-tab behavior, folder filtering, compact list layout, and
WebDAV permission prompt. Store review and signing occur separately from the GitHub release.
