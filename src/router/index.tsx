import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const SandboxPage = lazy(() => import('../pages/SandboxPage'));
const LocationPage = lazy(() => import('../pages/LocationPage'));
const DevicePage = lazy(() => import('../pages/DevicePage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const MapPage = lazy(() => import('../pages/MapPage'));
const TaskDetailPage = lazy(() => import('../pages/TaskDetailPage'));
const RideDetailPage = lazy(() => import('../pages/RideDetailPage'));

// Route metadata (used by TabBar to know which tab is active for a given path).
export const routeMeta: Record<string, { title: string; tab: string }> = {
  '/sandbox': { title: 'Sandbox', tab: 'sandbox' },
  '/map': { title: 'Map', tab: 'map' },
  '/location': { title: 'Location', tab: 'location' },
  '/device': { title: 'Device', tab: 'device' },
  '/settings': { title: 'Settings', tab: 'settings' },
  '/task': { title: 'Task', tab: 'sandbox' },
  '/ride': { title: 'Ride', tab: 'sandbox' },
};

export function getTabForPath(pathname: string): string {
  if (pathname.startsWith('/sandbox')) return 'sandbox';
  if (pathname.startsWith('/map')) return 'map';
  if (pathname.startsWith('/location')) return 'location';
  if (pathname.startsWith('/device')) return 'device';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/task')) return 'sandbox';
  if (pathname.startsWith('/ride')) return 'sandbox';
  return 'sandbox';
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<div />}>
      <Routes>
        <Route path="/" element={<Navigate to="/sandbox" replace />} />
        <Route path="/sandbox" element={<SandboxPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/location" element={<LocationPage />} />
        <Route path="/device" element={<DevicePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/task/:id" element={<TaskDetailPage />} />
        <Route path="/ride/:id" element={<RideDetailPage />} />
        <Route path="*" element={<Navigate to="/sandbox" replace />} />
      </Routes>
    </Suspense>
  );
}
