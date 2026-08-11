import { appStore, ThemeMode, UiMode } from '../state';
import { i18n, Locale } from '../i18n';
import { storage } from '../services';

const KEY = 'vanilla:ui';

function applyTheme(t: ThemeMode): void {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

export const UiController = {
  async load(): Promise<void> {
    const saved = await storage.get<{ theme: ThemeMode; locale: Locale; mode: UiMode }>(KEY);
    if (saved) {
      appStore.update({
        ui: {
          ...appStore.state.ui,
          theme: saved.theme,
          locale: saved.locale,
          mode: saved.mode,
        },
      });
      i18n.setLocale(saved.locale);
    }
    applyTheme(appStore.state.ui.theme);
  },
  async setTheme(t: ThemeMode): Promise<void> {
    appStore.update({ ui: { ...appStore.state.ui, theme: t } });
    applyTheme(t);
    await this.persist();
  },
  async setLocale(l: Locale): Promise<void> {
    appStore.update({ ui: { ...appStore.state.ui, locale: l } });
    i18n.setLocale(l);
    await this.persist();
  },
  async setMode(m: UiMode): Promise<void> {
    appStore.update({ ui: { ...appStore.state.ui, mode: m } });
    await this.persist();
  },
  async persist(): Promise<void> {
    const { theme, locale, mode } = appStore.state.ui;
    await storage.set(KEY, { theme, locale, mode });
  },
};
