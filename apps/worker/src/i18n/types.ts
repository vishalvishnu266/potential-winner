/**
 * Strongly-typed translation shape.  Every locale file must satisfy
 * the `Messages` interface so a missing key becomes a build-time error
 * instead of a runtime "undefined" in the UI.
 *
 * Keep this bundle intentionally small — add strings only when a new
 * feature ships and needs them.
 */

export type LocaleCode = 'en' | 'ta';

export interface Messages {
    app: {
        name: string;
        welcome: string;
    };

    common: {
        loading: string;
        cancel: string;
        ok: string;
    };

    home: {
        welcome: string;
    };

    settings: {
        title: string;
        appearance: string;
        language: string;
        updates: string;
        checkForUpdate: string;
        currentVersion: string;
        status: string;
        lastChecked: string;
        currentlyUsing: (mode: string) => string;
        themeLabels: {
            light: string;
            dark: string;
            system: string;
        };
    };

    tab: {
        home: string;
        settings: string;
    };
}
