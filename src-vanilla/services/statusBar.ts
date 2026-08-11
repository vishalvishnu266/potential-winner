/**
 * Status bar theming — reflects light/dark mode + edge-to-edge.
 */

import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

export const statusBarService = {
  async applyTheme(mode: 'light' | 'dark'): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await safe(() => StatusBar.setStyle({ style: mode === 'dark' ? Style.Dark : Style.Light }));
    await safe(() => StatusBar.setBackgroundColor({
      color: mode === 'dark' ? '#000000' : '#ffffff',
    }));
  },
  async setOverlaysWebView(overlay: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await safe(() => StatusBar.setOverlaysWebView({ overlay }));
  },
};
