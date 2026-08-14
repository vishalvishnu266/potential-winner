/**
 * @pkg/i18n — generic zero-dependency i18n provider.
 *
 * Apps supply their own message bundle shape (`M`) and a map of
 * locale-code -> bundle.  This package handles:
 *
 *   • React context/provider
 *   • persistence via `@pkg/native` storage
 *   • OS-language auto-detection on first launch
 *   • `<html lang="...">` sync
 *
 * Usage in an app:
 *
 *   import { createI18n } from '@pkg/i18n';
 *   import en from './en';
 *   import ta from './ta';
 *
 *   const { I18nProvider, useI18n, useT, AVAILABLE_LOCALES } =
 *       createI18n({ bundles: { en, ta }, defaultLocale: 'en' });
 */

import {
    createContext, createElement, useCallback, useContext,
    useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { storage } from '@pkg/native';

const STORAGE_KEY = 'pkg.i18n.locale';

export interface LocaleMeta<C extends string = string> {
    code: C;
    label: string;
    native: string;
    emoji: string;
}

export interface CreateI18nOptions<M, C extends string> {
    /** Map of locale-code -> messages bundle.  Every code must resolve to a bundle. */
    bundles: Record<C, M>;
    /** Fallback / initial locale (must exist in `bundles`). */
    defaultLocale: C;
    /** Optional pretty labels for a locale picker.  If omitted, apps can list keys of `bundles` themselves. */
    localeMeta?: LocaleMeta<C>[];
    /** Storage key override (in case an app runs multiple isolated i18n instances). */
    storageKey?: string;
}

export function createI18n<M, C extends string>(opts: CreateI18nOptions<M, C>) {
    const { bundles, defaultLocale, localeMeta = [], storageKey = STORAGE_KEY } = opts;
    const AVAILABLE_LOCALES = localeMeta;

    interface I18nContextValue {
        locale: C;
        t: M;
        setLocale: (code: C) => Promise<void>;
        ready: boolean;
    }

    const initial: I18nContextValue = {
        locale: defaultLocale,
        t: bundles[defaultLocale],
        setLocale: async () => {},
        ready: true,
    };
    const I18nContext = createContext<I18nContextValue>(initial);

    function I18nProvider({ children }: { children: ReactNode }) {
        const [locale, setLocaleState] = useState<C>(defaultLocale);
        const [ready, setReady] = useState(false);

        useEffect(() => {
            (async () => {
                const saved = await storage.get(storageKey);
                const candidate = (saved as C | null) ?? detectFromOs<C>(Object.keys(bundles) as C[], defaultLocale);
                const valid = (candidate in bundles ? candidate : defaultLocale) as C;
                setLocaleState(valid);
                applyHtmlLang(valid);
                setReady(true);
            })();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        const setLocale = useCallback(async (code: C) => {
            setLocaleState(code);
            applyHtmlLang(code);
            await storage.set(storageKey, code);
        }, []);

        const value = useMemo<I18nContextValue>(
            () => ({ locale, t: bundles[locale], setLocale, ready }),
            [locale, setLocale, ready],
        );

        return createElement(I18nContext.Provider, { value }, children);
    }

    function useI18n(): I18nContextValue {
        return useContext(I18nContext);
    }

    function useT(): M {
        return useContext(I18nContext).t;
    }

    return { I18nProvider, useI18n, useT, AVAILABLE_LOCALES };
}

// -------- helpers ----------------------------------------------------------

function detectFromOs<C extends string>(available: readonly C[], fallback: C): C {
    if (typeof navigator === 'undefined') return fallback;
    const langs = navigator.languages ?? [navigator.language];
    for (const raw of langs) {
        const short = raw?.toLowerCase().split(/[-_]/)[0];
        const hit = available.find((c) => c.toLowerCase() === short);
        if (hit) return hit;
    }
    return fallback;
}

function applyHtmlLang(code: string) {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', code);
    }
}
