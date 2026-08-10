import { useLocation, useNavigate } from 'react-router-dom';
import { hapticTap } from '../composables/useNative';
import { getTabForPath } from '../router';
import { useT } from '../i18n';

type Tab = { name: string; label: string; path: string; emoji: string };

/**
 * Bottom navigation.  Uses emojis (universally recognised, works in any
 * language, no SVG asset pipeline).  Big enough touch targets (56 px
 * tall) for elderly users; the active tab is highlighted with a coloured
 * pill background instead of just a colour change.
 */
export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = getTabForPath(location.pathname);
  const t = useT();

  const tabs: Tab[] = [
    { name: 'home',     label: t.tab.home, path: '/',         emoji: '🏠' },
    { name: 'work',     label: t.tab.work, path: '/work',     emoji: '🛠️' },
    { name: 'post',     label: t.tab.post, path: '/post',     emoji: '➕' },
    { name: 'me',       label: t.tab.me,   path: '/me',       emoji: '👤' },
    { name: 'settings', label: t.tab.more, path: '/settings', emoji: '⚙️' },
  ];

  const go = (tab: Tab) => {
    hapticTap();
    if (location.pathname !== tab.path) navigate(tab.path);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[100] flex items-stretch justify-around border-t border-border bg-[var(--color-surface)] pb-safe-bottom shadow-[0_-2px_16px_rgba(0,0,0,0.06)]"
      role="tablist"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const active = current === tab.name;
        return (
          <button
            key={tab.name}
            role="tab"
            aria-selected={active}
            aria-label={tab.label}
            onClick={() => go(tab)}
            className="press flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2"
          >
            <span
              className={
                'inline-flex h-9 w-14 items-center justify-center rounded-full text-xl transition-colors ' +
                (active ? 'bg-primary text-[var(--color-primary-fg)]' : 'text-muted')
              }
              aria-hidden
            >
              {tab.emoji}
            </span>
            <span className={
              'text-[11px] font-semibold ' + (active ? 'text-primary' : 'text-muted')
            }>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
