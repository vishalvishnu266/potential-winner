import { useLocation, useNavigate } from 'react-router-dom';
import { hapticTap } from '../composables/useNative';
import { getTabForPath } from '../router';

type Tab = { name: string; label: string; path: string; icon: string };

const tabs: Tab[] = [
  {
    name: 'sandbox', label: 'Sandbox', path: '/sandbox',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="6.5" r="0.6" fill="currentColor"/><circle cx="9.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
  },
  {
    name: 'map', label: 'Map', path: '/map',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z"/><path d="M9 3v16"/><path d="M15 5v16"/></svg>',
  },
  {
    name: 'location', label: 'Location', path: '/location',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-7-7.58-7-12a7 7 0 1 1 14 0c0 4.42-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  },
  {
    name: 'device', label: 'Device', path: '/device',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 19h2"/></svg>',
  },
  {
    name: 'settings', label: 'Settings', path: '/settings',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = getTabForPath(location.pathname);

  const go = (tab: Tab) => {
    hapticTap();
    if (location.pathname !== tab.path) navigate(tab.path);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[100] flex items-stretch justify-around border-t border-border bg-surface pb-safe-bottom shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
      role="tablist"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={
            'flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent px-1 pb-2.5 pt-2 transition-colors duration-150 [-webkit-tap-highlight-color:transparent] ' +
            (current === tab.name ? 'text-primary' : 'text-muted')
          }
          role="tab"
          aria-selected={current === tab.name}
          aria-label={tab.label}
          onClick={() => go(tab)}
        >
          <span
            className="inline-flex h-6 w-6 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: tab.icon }}
          />
          <span className="text-[11px] font-semibold tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
