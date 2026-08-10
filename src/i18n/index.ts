import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';

import en from './en';
import ta from './ta';
import type { LocaleCode, Messages } from './types';

/**
 * Minimal, zero-dependency i18n.
 *
 * Design notes:
 * - Locale files are plain TypeScript objects (functions for values that
 *   need interpolation).  No parser, no bundler magic, no missing-key
 *   surprises at runtime — the `Messages` interface guarantees every
 *   key exists in every locale.
 * - The active locale is persisted via @capacitor/preferences so it
 *   survives an app relaunch.
 * - Initial locale defaults to the OS language (navigator.language) when
 *   the user has never picked one; falls back to English otherwise.
 */

export type { LocaleCode, Messages };
export const AVAILABLE_LOCALES: {
    code: LocaleCode; label: string; native: string; emoji: string;
}[] = [
    { code: 'en', label: 'English', native: 'English', emoji: '🇬🇧' },
    { code: 'ta', label: 'Tamil',   native: 'தமிழ்',   emoji: '🇮🇳' },
];

const BUNDLES: Record<LocaleCode, Messages> = { en, ta };
const STORAGE_KEY = 'dg.locale';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface I18nContextValue {
    locale: LocaleCode;
    t: Messages;                          // active bundle, use as t.home.postNew
    setLocale: (code: LocaleCode) => Promise<void>;
    ready: boolean;
}

const I18nContext = createContext<I18nContextValue>({
    locale: 'en',
    t: en,
    setLocale: async () => {},
    ready: true,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<LocaleCode>('en');
    const [ready, setReady] = useState(false);

    // Hydrate persisted preference (or auto-detect from OS) on mount.
    useEffect(() => {
        (async () => {
            const saved = await Preferences.get({ key: STORAGE_KEY });
            const candidate = (saved.value as LocaleCode | null) ?? detectFromOs();
            const valid = candidate && candidate in BUNDLES ? candidate : 'en';
            setLocaleState(valid);
            applyHtmlLang(valid);
            setReady(true);
        })();
    }, []);

    const setLocale = useCallback(async (code: LocaleCode) => {
        setLocaleState(code);
        applyHtmlLang(code);
        await Preferences.set({ key: STORAGE_KEY, value: code });
    }, []);

    const value = useMemo<I18nContextValue>(
        () => ({ locale, t: BUNDLES[locale], setLocale, ready }),
        [locale, setLocale, ready],
    );

    return createElement(I18nContext.Provider, { value }, children);
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/** Access the active locale + translation bundle. */
export function useI18n(): I18nContextValue {
    return useContext(I18nContext);
}

/** Convenience: only the bundle, so pages can write `t.home.postNew`. */
export function useT(): Messages {
    return useContext(I18nContext).t;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectFromOs(): LocaleCode {
    if (typeof navigator === 'undefined') return 'en';
    const langs = navigator.languages ?? [navigator.language];
    for (const raw of langs) {
        const short = raw?.toLowerCase().split(/[-_]/)[0];
        if (short === 'ta') return 'ta';
        if (short === 'en') return 'en';
    }
    return 'en';
}

function applyHtmlLang(code: LocaleCode) {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', code);
    }
}
