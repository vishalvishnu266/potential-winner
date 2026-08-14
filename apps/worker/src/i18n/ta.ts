import type { Messages } from './types';

/**
 * Tamil (தமிழ்).
 */
const ta: Messages = {
    app: {
        name: 'Worker',
        welcome: 'வணக்கம் 👋',
    },

    common: {
        loading: 'ஏற்றுகிறது…',
        cancel: 'ரத்து',
        ok: 'சரி',
    },

    home: {
        welcome: 'விரைவில் அம்சங்கள் இங்கே வரும்.',
    },

    settings: {
        title: 'அமைப்புகள்',
        appearance: 'தோற்றம்',
        language: 'மொழி',
        updates: 'செயலி புதுப்பிப்புகள்',
        checkForUpdate: 'புதுப்பிப்புகளைச் சரிபார்',
        currentVersion: 'பதிப்பு',
        status: 'நிலை',
        lastChecked: 'கடைசியாக சரிபார்த்தது',
        currentlyUsing: (mode) => `தற்போது ${mode} பயன்பாட்டில்`,
        themeLabels: {
            light:  '☀️ வெளிச்சம்',
            dark:   '🌙 இருள்',
            system: '📱 சாதனம்',
        },
    },

    tab: {
        home: 'முகப்பு',
        settings: 'அமைப்புகள்',
    },
};

export default ta;
