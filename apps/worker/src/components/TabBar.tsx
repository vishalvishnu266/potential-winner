import { Home, Settings } from 'lucide-react';
import { TabBar as GenericTabBar, type TabDef } from '@pkg/ui';
import { getTabForPath } from '../router';
import { useT } from '../i18n';

/**
 * Worker-specific tab bar.  Wraps the generic `TabBar` from `@pkg/ui`
 * with a worker-flavoured tab list.  Add tabs here as the worker app
 * grows (jobs feed, crew, ERP, agents, wallet, …).
 */
export default function TabBar() {
    const t = useT();
    const tabs: TabDef[] = [
        { name: 'home',     label: t.tab.home,     path: '/',         Icon: Home },
        { name: 'settings', label: t.tab.settings, path: '/settings', Icon: Settings },
    ];
    return <GenericTabBar tabs={tabs} getTabForPath={getTabForPath} />;
}
