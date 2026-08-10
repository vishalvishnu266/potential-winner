import { useCallback, useEffect, useState } from 'react';
import { useStorage } from './useStorage';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'dg.theme';

/**
 * App-level theme controller.  Persists the user's choice via
 * @capacitor/preferences and applies it by setting `data-theme` on
 * <html>.  On 'system', we remove the attribute so the OS's
 * prefers-color-scheme media query takes over.
 */
export function useTheme() {
    const [theme, setThemeState] = useState<Theme>('system');
    const storage = useStorage();

    // Hydrate from persisted preference on mount.
    useEffect(() => {
        (async () => {
            const saved = await storage.get(STORAGE_KEY);
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                apply(saved);
                setThemeState(saved);
            } else {
                apply('system');
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setTheme = useCallback(
        async (t: Theme) => {
            apply(t);
            setThemeState(t);
            await storage.set(STORAGE_KEY, t);
        },
        [storage],
    );

    const toggle = useCallback(async () => {
        const next: Theme = resolved() === 'dark' ? 'light' : 'dark';
        await setTheme(next);
    }, [setTheme]);

    return { theme, setTheme, toggle, resolved: resolved() };
}

function apply(t: Theme) {
    const html = document.documentElement;
    if (t === 'system') {
        html.removeAttribute('data-theme');
    } else {
        html.setAttribute('data-theme', t);
    }
}

/** Reports which theme is *currently* being rendered. */
function resolved(): 'light' | 'dark' {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
