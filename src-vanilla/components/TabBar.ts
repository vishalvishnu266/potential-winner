/**
 * Persistent bottom tab bar. Haptic-first, iOS-modern.
 *
 * IMPORTANT UX RULE — one place per feature:
 *   Home    → dashboard only
 *   Work    → the ONLY place to find work
 *   Post    → the ONLY place to post a job (center + button)
 *   Local   → local shops
 *   Me      → profile / settings
 */

import { El, UIComponent, getTabForPath } from '../framework';
import { Icon, IconName } from '../framework/icons';
import { router } from '../router';
import { haptics } from '../services';

interface TabDef { name: string; label: string; path: string; icon: IconName; emphasise?: boolean; }

export function TabBar(labels: {
  home: string; work: string; post: string; local: string; me: string;
}): { root: UIComponent<'nav'>; updateActive: (path: string) => void } {
  const tabs: TabDef[] = [
    { name: 'home',  label: labels.home,  path: '/',      icon: 'home' },
    { name: 'work',  label: labels.work,  path: '/work',  icon: 'search' },
    { name: 'post',  label: labels.post,  path: '/post',  icon: 'plus', emphasise: true },
    { name: 'local', label: labels.local, path: '/local', icon: 'store' },
    { name: 'me',    label: labels.me,    path: '/me',    icon: 'user' },
  ];

  const root = El('nav').cls('tabbar').attr('aria-label', 'Main navigation');
  const btns = new Map<string, UIComponent<'button'>>();

  for (const t of tabs) {
    const btn = El('button').attr('role', 'tab').attr('aria-label', t.label);
    if (t.emphasise) btn.cls('post');
    btn.add(
      El('span').cls('tab-ico').add(Icon(t.icon, { size: t.emphasise ? 22 : 26, strokeWidth: t.emphasise ? 2.4 : 1.9 })),
      t.emphasise ? null : El('span').text(t.label),
    );
    btn.onClick(() => {
      if (router.currentPath === t.path) return;
      void haptics.selection();
      router.navigate(t.path);
    });
    btns.set(t.name, btn);
    root.add(btn);
  }

  const updateActive = (path: string): void => {
    const active = getTabForPath(path);
    for (const [name, btn] of btns) {
      if (name === active) btn.cls('active');
      else btn.el.classList.remove('active');
    }
  };
  return { root, updateActive };
}
