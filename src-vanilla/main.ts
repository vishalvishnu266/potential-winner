/**
 * Entrypoint.
 *
 * Boot order:
 *   1. Import global styles (tokens + base).
 *   2. Hydrate persisted UI prefs (theme/locale/mode).
 *   3. Mount shell (TabBar + OTA overlay).
 *   4. Register routes + start router.
 *   5. Start OTA auto-poller (no-op on web).
 */

import './styles/tokens.css';
import './styles/base.css';

import { appStore } from './state';
import { router } from './router';
import { i18n } from './i18n';
import { buildShell } from './shell';
import { UiController, OtaController } from './controllers';
import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { PlaceholderView } from './views/PlaceholderView';

async function bootstrap(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app root not found');

  await UiController.load();

  const shell = buildShell();
  host.replaceChildren(shell.rootEl);

  const t = i18n.t;
  router
    .route('/',        () => HomeView())
    .route('/work',    () => PlaceholderView(t.work.title,  'FindWork lands in iteration B.'))
    .route('/post',    () => PlaceholderView(t.post.title,  'PostJob lands in iteration B.'))
    .route('/local',   () => PlaceholderView(t.local.title, 'Local lands in iteration C.'))
    .route('/me',      () => PlaceholderView(t.me.title,    'Me lands in iteration C.'))
    .route('/job/:id', (ctx) => PlaceholderView('Job ' + ctx.params.id, 'JobDetail lands in iteration B.'))
    .route('/about',   () => AboutView());

  router.start(shell.slot);

  // Refresh tab bar active state on nav + on first mount.
  const refreshTabs = (): void => shell.onRoute(router.currentPath);
  window.addEventListener('hashchange', refreshTabs);
  refreshTabs();

  // Re-render current view on store change (content slot only).
  appStore.subscribe(() => { router.render(); refreshTabs(); });

  // Re-render on locale change (nav labels + all view strings).
  i18n.subscribe(() => {
    // Rebuild shell to pick up new tab labels.
    const s = buildShell();
    host.replaceChildren(s.rootEl);
    router.start(s.slot);
    window.removeEventListener('hashchange', refreshTabs);
    window.addEventListener('hashchange', () => s.onRoute(router.currentPath));
    s.onRoute(router.currentPath);
  });

  OtaController.start(5 * 60 * 1000);
}

bootstrap().catch((err) => {
  console.error('[bootstrap]', err);
  const host = document.getElementById('app');
  if (host) host.textContent = `Boot failed: ${String(err)}`;
});
