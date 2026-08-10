import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, User, Store, type LucideIcon } from 'lucide-react';
import { hapticTap } from '../composables/useNative';
import { getTabForPath } from '../router';
import { useT } from '../i18n';

type Tab = { name: string; label: string; path: string; Icon: LucideIcon };

/**
 * Instagram-style bottom navigation.
 * - Sits above a hairline separator with a slight backdrop blur.
 * - Only the active icon fills (using the brand gradient); others are
 *   thin outlines — matches IG / Threads visual language.
 * - Middle "Post" tab is emphasised with a filled pill.
 */
export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = getTabForPath(location.pathname);
  const t = useT();

  // Settings is now merged into the Me page, freeing this slot for a
  // dedicated "Local" tab that surfaces sponsors organically.  Users who
  // never tap it will never see an ad.
  const tabs: Tab[] = [
    { name: 'home',  label: t.tab.home,  path: '/',      Icon: Home },
    { name: 'work',  label: t.tab.work,  path: '/work',  Icon: Search },
    { name: 'post',  label: t.tab.post,  path: '/post',  Icon: PlusSquare },
    { name: 'local', label: t.tab.local, path: '/local', Icon: Store },
    { name: 'me',    label: t.tab.me,    path: '/me',    Icon: User },
  ];

  const go = (tab: Tab) => {
    hapticTap();
    if (location.pathname !== tab.path) navigate(tab.path);
  };

  return (
    <nav
      aria-label="Main navigation"
      className={
        'fixed inset-x-0 bottom-0 z-[100] flex items-stretch justify-around ' +
        'pb-safe-bottom border-t border-[var(--color-hairline)] ' +
        'bg-[color:color-mix(in_srgb,var(--color-surface)_90%,transparent)] ' +
        'backdrop-blur-lg'
      }
    >
      {tabs.map((tab) => {
        const active   = current === tab.name;
        const emphasis = tab.name === 'post';
        const { Icon } = tab;

        // The "post" tab always gets the brand gradient — it's the primary
        // action of the app, IG does the same treatment.
        if (emphasis) {
          return (
            <button
              key={tab.name}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              onClick={() => go(tab)}
              className="press flex min-h-14 flex-1 items-center justify-center py-2"
            >
              <span className={
                'inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-grad-brand ' +
                'text-white shadow-[var(--shadow-brand)]'
              }>
                <Icon size={22} strokeWidth={2.4} />
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.name}
            role="tab"
            aria-selected={active}
            aria-label={tab.label}
            onClick={() => go(tab)}
            className="press flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2"
          >
            <Icon
              size={24}
              strokeWidth={active ? 2.6 : 1.8}
              fill={active ? 'currentColor' : 'none'}
              className={active ? 'text-text' : 'text-muted'}
              aria-hidden
            />
            <span className={
              'text-[10px] font-semibold ' + (active ? 'text-text' : 'text-muted')
            }>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
