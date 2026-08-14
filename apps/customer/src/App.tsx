import { useEffect } from 'react';
import AppRoutes from './router';
import TabBar from './components/TabBar';
import { UpdateOverlay, useOta } from '@pkg/ota';
import { initNative, useTheme } from '@pkg/native';

export default function App() {
    const { startAutoUpdate, bootOnce } = useOta();
    useTheme(); // hydrates data-theme on <html> from persisted preference

    useEffect(() => {
        initNative();
        bootOnce();
        startAutoUpdate(5 * 60 * 1000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-bg text-text">
            <main className="flex-1 overflow-y-auto pb-tabbar">
                <AppRoutes />
            </main>
            <TabBar />
            <UpdateOverlay />
        </div>
    );
}
