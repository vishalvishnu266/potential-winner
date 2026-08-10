import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppRoutes from './router';
import TabBar from './components/TabBar';
import UpdateOverlay from './components/UpdateOverlay';
import { initNative } from './composables/useNative';
import { initDeepLinks } from './composables/useDeepLinks';
import { useOta } from './composables/useOta';
import { useTheme } from './composables/useTheme';

export default function App() {
  const navigate = useNavigate();
  const { startAutoUpdate } = useOta();

  // Hydrate the theme from Preferences → sets <html data-theme=...>
  // No-op return value; the hook mutates the DOM as a side effect.
  useTheme();

  useEffect(() => {
    initNative();
    initDeepLinks(navigate);
    // App-wide OTA poller. Runs regardless of which tab is active so a user
    // stuck on any tab still receives hot updates.
    startAutoUpdate(15_000);
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
