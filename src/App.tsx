import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppRoutes from './router';
import TabBar from './components/TabBar';
import UpdateOverlay from './components/UpdateOverlay';
import { initNative } from './composables/useNative';
import { initDeepLinks } from './composables/useDeepLinks';
import { useOta } from './composables/useOta';

export default function App() {
  const navigate = useNavigate();
  const { startAutoUpdate } = useOta();

  useEffect(() => {
    initNative();
    initDeepLinks(navigate);
    // App-wide OTA poller. Runs regardless of which tab is active so a user
    // stuck on the Sandbox tab still receives hot updates.
    startAutoUpdate(15_000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <main className="flex-1 overflow-y-auto pb-tabbar">
        <AppRoutes />
      </main>
      <TabBar />
      <UpdateOverlay />
    </div>
  );
}
