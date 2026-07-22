import { readFile } from 'node:fs/promises';

const targets = [
  { directory: '.output/chrome-mv3', browser: 'chrome' },
  { directory: '.output/firefox-mv3', browser: 'firefox' },
];

for (const target of targets) {
  const manifest = JSON.parse(await readFile(`${target.directory}/manifest.json`, 'utf8'));
  if (manifest.manifest_version !== 3 || manifest.version !== '1.0.0') {
    throw new Error(`${target.browser}: expected Manifest V3 version 1.0.0`);
  }
  if (manifest.host_permissions?.length) {
    throw new Error(`${target.browser}: host permissions are not allowed`);
  }
  for (const permission of manifest.permissions ?? []) {
    if (!['storage', 'tabs', 'contextMenus', 'unlimitedStorage', 'alarms'].includes(permission)) {
      throw new Error(`${target.browser}: unexpected permission ${permission}`);
    }
  }
  if (target.browser === 'chrome' && !manifest.background?.service_worker) {
    throw new Error('Chrome build is missing its background service worker');
  }
  if (target.browser === 'firefox') {
    if (!manifest.background?.scripts || manifest.background?.service_worker) {
      throw new Error('Firefox build must use background scripts, not a service worker');
    }
    const gecko = manifest.browser_specific_settings?.gecko;
    if (!gecko?.id || gecko.data_collection_permissions?.required?.[0] !== 'none') {
      throw new Error('Firefox build is missing its extension ID or no-data declaration');
    }
  }
  const files = ['background.js', 'dashboard.html', 'popup.html'];
  await Promise.all(files.map((file) => readFile(`${target.directory}/${file}`)));
}

console.log('Validated Chromium and Firefox manifests, permissions, and runtime entrypoints.');
