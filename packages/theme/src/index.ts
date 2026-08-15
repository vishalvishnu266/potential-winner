/**
 * @pkg/theme — shared Tailwind + brand tokens for all apps in this monorepo.
 *
 * There is no runtime API. Apps consume this package as CSS:
 *
 *   import '@pkg/theme/style.css';
 *
 * The stylesheet defines light/dark surface tokens plus a single fixed
 * emerald brand palette.  Light/dark switching is driven by the
 * `data-theme` attribute on <html> (see `useTheme` in `@pkg/native`);
 * the brand colour is not user-swappable.
 */
export {};
