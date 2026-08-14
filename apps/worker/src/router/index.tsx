import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const HomePage     = lazy(() => import('../pages/HomePage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

/** Which bottom-tab is highlighted for a given URL. */
export function getTabForPath(pathname: string): string {
    if (pathname.startsWith('/settings')) return 'settings';
    return 'home';
}

export default function AppRoutes() {
    return (
        <Suspense fallback={<div />}>
            <Routes>
                <Route path="/"         element={<HomePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*"         element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
