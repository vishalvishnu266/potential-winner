import { useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { hapticTap } from '@pkg/native';

/**
 * Generic bottom tab bar.
 *
 * Each app supplies its own tab list (labels, icons, paths) plus a
 * `getTabForPath` that maps the current URL to the highlighted tab.
 * This keeps the bar shape identical across apps while letting the
 * customer and worker apps show different navigation.
 */
export interface TabDef {
    name: string;
    label: string;
    path: string;
    Icon: LucideIcon;
}

export interface TabBarProps {
    tabs: TabDef[];
    /** Given the current pathname, return the `name` of the tab to highlight. */
    getTabForPath: (pathname: string) => string;
}

export default function TabBar({ tabs, getTabForPath }: TabBarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const current  = getTabForPath(location.pathname);

    const go = (tab: TabDef) => {
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
                const active = current === tab.name;
                const { Icon } = tab;
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
