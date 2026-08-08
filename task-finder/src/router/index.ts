import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    { path: '/', redirect: '/sandbox' },
    {
        path: '/sandbox',
        name: 'sandbox',
        component: () => import('../pages/SandboxPage.vue'),
        meta: { title: 'Sandbox', tab: 'sandbox' },
    },
    {
        path: '/location',
        name: 'location',
        component: () => import('../pages/LocationPage.vue'),
        meta: { title: 'Location', tab: 'location' },
    },
    {
        path: '/device',
        name: 'device',
        component: () => import('../pages/DevicePage.vue'),
        meta: { title: 'Device', tab: 'device' },
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('../pages/SettingsPage.vue'),
        meta: { title: 'Settings', tab: 'settings' },
    },
    // Detail routes reachable via deep links
    // e.g. dailygig://task/123  ->  /task/123
    {
        path: '/task/:id',
        name: 'task-detail',
        component: () => import('../pages/TaskDetailPage.vue'),
        meta: { title: 'Task', tab: 'sandbox' },
    },
    {
        path: '/ride/:id',
        name: 'ride-detail',
        component: () => import('../pages/RideDetailPage.vue'),
        meta: { title: 'Ride', tab: 'sandbox' },
    },
    // Fallback — any unknown path bounces to sandbox
    { path: '/:pathMatch(.*)*', redirect: '/sandbox' },
];

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
});
