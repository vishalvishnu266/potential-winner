/**
 * Application entrypoint.
 *
 * Wires: Router + Store + Shell + Views.
 */

import { Router } from './framework';
import { appStore } from './state';
import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { buildShell, ShellRoute } from './shell';

const ROUTES: ShellRoute[] = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
];

const host = document.getElementById('app');
if (!host) throw new Error('#app root not found');

const router = new Router().setFallback('/');

/**
 * Mount the persistent shell once, then let the router only swap the content
 * slot. This avoids destroying the nav bar on every navigation.
 */
function mountApp(): void {
  const { root, slot } = buildShell(ROUTES, router.currentPath);
  host!.replaceChildren(root.el);

  router
    .route('/', () => HomeView())
    .route('/about', () => AboutView());

  router.start(slot);
}

// Re-render the current view whenever the store changes. Because the shell is
// persistent, this only touches the content slot.
appStore.subscribe(() => router.render());

// Re-mount the shell (to refresh active nav highlight) on hash changes.
window.addEventListener('hashchange', () => {
  const { root, slot } = buildShell(ROUTES, router.currentPath);
  host!.replaceChildren(root.el);
  router.start(slot);
});

mountApp();
