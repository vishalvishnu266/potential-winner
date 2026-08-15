/**
 * @pkg/native — Capacitor wrappers shared by every app.
 *
 * All entry points are safe to import from web/dev — plugin calls are
 * gated on `Capacitor.isNativePlatform()` and wrapped in try/catch so
 * a missing/unavailable plugin never crashes rendering.
 */
export { initNative, syncStatusBar, hapticTap } from './useNative';
export { storage } from './storage';
export { useTheme, type Theme } from './useTheme';
