import { useCallback, useEffect, useState } from 'react';
import { storage } from './storage';
import { syncStatusBar } from './useNative';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'pkg.native.theme';

/**
 * App-level theme controller.  Persists the user's choice and applies
 * it by setting `data-theme` on <html>.  On 'system', the attribute is
 * removed so the OS's `prefers-color-scheme` takes over.
 */
export function useTheme() {
    const [theme, setThemeState] = useState<Theme>('system');

    useEffect(() => {
        (async () => {
            const saved = await storage.get(STORAGE_KEY);
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                apply(saved);
                setThemeState(saved);
            } else {
                apply('system');
            }
            void syncStatusBar();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mq) return;
        const handler = () => { if (theme === 'system') void syncStatusBar(); };
        mq.addEventListener?.('change', handler);
        return () => mq.removeEventListener?.('change', handler);
    }, [theme]);

    const setTheme = useCallback(async (t: Theme) => {
        apply(t);
        setThemeState(t);
        await storage.set(STORAGE_KEY, t);
        void syncStatusBar();
    }, []);

    const toggle = useCallback(async () => {
        const next: Theme = resolved() === 'dark' ? 'light' : 'dark';
        await setTheme(next);
    }, [setTheme]);

    return { theme, setTheme, toggle, resolved: resolved() };
}

function apply(t: Theme) {
    const html = document.documentElement;
    if (t === 'system') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', t);
}

function resolved(): 'light' | 'dark' {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
