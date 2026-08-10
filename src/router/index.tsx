import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Product screens
const HomePage       = lazy(() => import('../pages/HomePage'));
const PostJobPage    = lazy(() => import('../pages/PostJobPage'));
const FindWorkPage   = lazy(() => import('../pages/FindWorkPage'));
const JobDetailPage  = lazy(() => import('../pages/JobDetailPage'));
const MePage         = lazy(() => import('../pages/MePage'));
const LocalPage      = lazy(() => import('../pages/LocalPage'));

// Legacy / diagnostics screens — no longer in the tab bar but kept reachable
// via URL for developers.
const SandboxPage    = lazy(() => import('../pages/SandboxPage'));
const LocationPage   = lazy(() => import('../pages/LocationPage'));
const DevicePage     = lazy(() => import('../pages/DevicePage'));

/** Which bottom-tab is highlighted for a given URL. */
export function getTabForPath(pathname: string): string {
    if (pathname === '/' || pathname.startsWith('/home')) return 'home';
    if (pathname.startsWith('/work'))  return 'work';
    if (pathname.startsWith('/post'))  return 'post';
    if (pathname.startsWith('/local')) return 'local';
    if (pathname.startsWith('/me'))    return 'me';
    if (pathname.startsWith('/job'))   return 'home';
    return 'home';
}

export default function AppRoutes() {
    return (
        <Suspense fallback={<div />}>
            <Routes>
                <Route path="/"        element={<HomePage />} />
                <Route path="/work"    element={<FindWorkPage />} />
                <Route path="/post"    element={<PostJobPage />} />
                <Route path="/local"   element={<LocalPage />} />
                <Route path="/job/:id" element={<JobDetailPage />} />
                <Route path="/me"      element={<MePage />} />

                {/* Dev diagnostics (no tab entry) */}
                <Route path="/sandbox"  element={<SandboxPage />} />
                <Route path="/location" element={<LocationPage />} />
                <Route path="/device"   element={<DevicePage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
