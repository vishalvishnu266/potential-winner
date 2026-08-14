import type { Messages } from './types';

/**
 * English — the source language.  Every other locale must translate
 * every key here.
 */
const en: Messages = {
    app: {
        name: 'TaskFinder',
        welcome: 'Welcome 👋',
    },

    common: {
        loading: 'Loading…',
        cancel: 'Cancel',
        ok: 'OK',
    },

    home: {
        welcome: 'Features will land here as we build them out.',
    },

    settings: {
        title: 'Settings',
        appearance: 'Appearance',
        language: 'Language',
        updates: 'App updates',
        checkForUpdate: 'Check for updates',
        currentVersion: 'Version',
        status: 'Status',
        lastChecked: 'Last checked',
        currentlyUsing: (mode) => `Currently using ${mode} mode`,
        themeLabels: {
            light:  '☀️ Light',
            dark:   '🌙 Dark',
            system: '📱 System',
        },
    },

    tab: {
        home: 'Home',
        settings: 'Settings',
    },
};

export default en;
