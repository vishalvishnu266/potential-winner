/**
 * @pkg/theme — shared Tailwind + accent tokens for all apps in this monorepo.
 *
 * There is no runtime API. Apps consume this package as CSS:
 *
 *   import '@pkg/theme/style.css';
 *
 * The stylesheet defines light/dark surface tokens plus the seven curated
 * accent palettes selectable via the `data-accent` attribute on <html>
 * (indigo, violet, sky, emerald, amber, rose, slate).  The picker itself
 * lives in `@pkg/native` (useAccent).
 */
export {};
