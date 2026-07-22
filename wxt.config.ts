import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({ plugins: [preact()] }),
  manifest: ({ browser }) => ({
    name: 'Tabitha Workspaces',
    short_name: 'Tabitha',
    description: 'Organize tabs, sessions, links, and notes into private local-first workspaces.',
    permissions: ['storage', 'tabs', 'contextMenus', 'unlimitedStorage', 'alarms'],
    action: {
      default_title: 'Open Tabitha Workspaces',
      default_popup: 'popup.html',
    },
    options_ui: {
      page: 'dashboard.html',
      open_in_tab: true,
    },
    commands: {
      'open-dashboard': {
        suggested_key: { default: 'Alt+Shift+T' },
        description: 'Open Tabitha Workspaces',
      },
      'save-current-window': {
        suggested_key: { default: 'Alt+Shift+S' },
        description: 'Save the current window as a session',
      },
    },
    browser_specific_settings:
      browser === 'firefox'
        ? {
            gecko: {
              id: 'tabitha-workspaces@loganpendragonmultiverse.github.io',
              strict_min_version: '142.0',
              data_collection_permissions: { required: ['none'] },
            },
          }
        : undefined,
  }),
  srcDir: '.',
});
