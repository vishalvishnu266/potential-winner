import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// New product screens
const HomePage       = lazy(() => import('../pages/HomePage'));
const PostJobPage    = lazy(() => import('../pages/PostJobPage'));
const FindWorkPage   = lazy(() => import('../pages/FindWorkPage'));
const JobDetailPage  = lazy(() => import('../pages/JobDetailPage'));
const MePage         = lazy(() => import('../pages/MePage'));

// Existing dev / sandbox screens (kept so the OTA + native diagnostics
// are still reachable, but no longer part of the primary flow).
const SandboxPage    = lazy(() => import('../pages/SandboxPage'));
const LocationPage   = lazy(() => import('../pages/LocationPage'));
const DevicePage     = lazy(() => import('../pages/DevicePage'));
const SettingsPage   = lazy(() => import('../pages/SettingsPage'));

/** Which bottom-tab is highlighted for a given URL. */
export function getTabForPath(pathname: string): string {
    if (pathname === '/' || pathname.startsWith('/home')) return 'home';
    if (pathname.startsWith('/work'))    return 'work';
    if (pathname.startsWith('/post'))    return 'post';
    if (pathname.startsWith('/me'))      return 'me';
    if (pathname.startsWith('/settings')) return 'settings';
    if (pathname.startsWith('/job'))     return 'home';
    return 'home';
}

export default function AppRoutes() {
    return (
        <Suspense fallback={<div />}>
            <Routes>
                {/* Product routes */}
                <Route path="/"          element={<HomePage />} />
                <Route path="/work"      element={<FindWorkPage />} />
                <Route path="/post"      element={<PostJobPage />} />
                <Route path="/job/:id"   element={<JobDetailPage />} />
                <Route path="/me"        element={<MePage />} />

                {/* Dev / diagnostics */}
                <Route path="/sandbox"   element={<SandboxPage />} />
                <Route path="/location"  element={<LocationPage />} />
                <Route path="/device"    element={<DevicePage />} />
                <Route path="/settings"  element={<SettingsPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
