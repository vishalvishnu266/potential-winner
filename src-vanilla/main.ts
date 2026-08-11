/**
 * Application entrypoint.
 *
 * Bootstrap order:
 *   1. Ensure store has hydrated persisted state (TaskController.load).
 *   2. Mount the persistent shell (nav + content slot) + OTA overlay.
 *   3. Register routes and start the router.
 *   4. Kick off OTA auto-poll (no-op on the web).
 */

import { Router } from './framework';
import { appStore } from './state';
import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { OtaOverlay } from './views/OtaOverlay';
import { buildShell, ShellRoute } from './shell';
import { TaskController, OtaController } from './controllers';

const ROUTES: ShellRoute[] = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
];

async function bootstrap(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app root not found');

  // 1. Hydrate persisted state before first render.
  await TaskController.load();

  const router = new Router().setFallback('/');

  const mount = (): void => {
    const { root, slot } = buildShell(ROUTES, router.currentPath);
    host.replaceChildren(root.el, OtaOverlay().el);
    router
      .route('/', () => HomeView())
      .route('/about', () => AboutView());
    router.start(slot);
  };

  // 2. Re-render current view on store change (touches only the content slot).
  appStore.subscribe(() => router.render());

  // 3. Re-mount shell on nav (to refresh active-link highlight).
  window.addEventListener('hashchange', mount);

  mount();

  // 4. Start OTA auto-poller. No-op on the web; polls every 5 min on device.
  OtaController.start(5 * 60 * 1000);
}

bootstrap().catch((err) => {
  console.error('[bootstrap]', err);
  const host = document.getElementById('app');
  if (host) host.textContent = `Boot failed: ${String(err)}`;
});
