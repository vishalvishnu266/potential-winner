/**
 * Accent (primary/brand) colour — chosen ONCE at BUILD TIME.
 *
 * Each app's Vite config injects `__APP_ACCENT__` (see the app-side
 * `vite.config.js`).  This module reads that global and applies the
 * `data-accent` attribute to <html> before the first paint.
 *
 * Add a new preset by:
 *   1. adding a `:root[data-accent="foo"]` block in `@pkg/theme/style.css`
 *   2. adding the id to `VALID_ACCENTS` here and to the whitelist in
 *      each app's `vite.config.js`.
 */

declare const __APP_ACCENT__: string;

export type AccentId =
    | 'indigo'
    | 'violet'
    | 'sky'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'slate';

export const VALID_ACCENTS: ReadonlySet<AccentId> = new Set<AccentId>([
    'indigo', 'violet', 'sky', 'emerald', 'amber', 'rose', 'slate',
]);

const FALLBACK: AccentId = 'indigo';

function readBuildAccent(): AccentId {
    // Some environments will inline __APP_ACCENT__; others (e.g. tests)
    // may not define it.  Fall back gracefully.
    const raw = (typeof __APP_ACCENT__ !== 'undefined' ? __APP_ACCENT__ : FALLBACK) as AccentId;
    return VALID_ACCENTS.has(raw) ? raw : FALLBACK;
}

/**
 * Boot helper — call once at app startup, BEFORE React renders, to set
 * the brand colour before the first paint.
 */
export function bootAccent(): void {
    document.documentElement.setAttribute('data-accent', readBuildAccent());
}
