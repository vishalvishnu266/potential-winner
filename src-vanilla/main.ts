/** Entrypoint. */

import './styles/tokens.css';
import './styles/base.css';

import { appStore } from './state';
import { router } from './router';
import { i18n } from './i18n';
import { buildShell } from './shell';
import { UiController, OtaController } from './controllers';
import { statusBarService } from './services';

import { HomeView } from './views/HomeView';
import { FindWorkView } from './views/FindWorkView';
import { FindServicesView } from './views/FindServicesView';
import { PostJobView } from './views/PostJobView';
import { JobDetailView } from './views/JobDetailView';
import { LocalView } from './views/LocalView';
import { MeView } from './views/MeView';
import { AboutView } from './views/AboutView';

async function bootstrap(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app root not found');

  // 1. Hydrate persisted prefs + apply theme + status bar.
  await UiController.load();
  await statusBarService.setOverlaysWebView(false);

  // 2. Mount persistent shell.
  const shell = buildShell();
  host.replaceChildren(shell.rootEl);

  // 3. Register routes.
  router
    .route('/',        () => HomeView())
    .route('/work',    () => FindWorkView())
    .route('/find',    ({ query }) => FindServicesView(query))
    .route('/post',    ({ query }) => PostJobView(query))
    .route('/local',   () => LocalView())
    .route('/me',      () => MeView())
    .route('/job/:id', ({ params }) => JobDetailView(params.id))
    .route('/about',   () => AboutView());
  router.start(shell.slot);

  const refreshTabs = (): void => shell.onRoute(router.currentPath);
  window.addEventListener('hashchange', refreshTabs);
  refreshTabs();

  // 4. Re-render on store or i18n change.
  appStore.subscribe(() => { router.render(); refreshTabs(); });
  i18n.subscribe(() => {
    const s = buildShell();
    host.replaceChildren(s.rootEl);
    router.start(s.slot);
    s.onRoute(router.currentPath);
  });

  // 5. Start OTA poller (native only).
  OtaController.start(5 * 60 * 1000);
}

bootstrap().catch((err) => {
  console.error('[bootstrap]', err);
  const host = document.getElementById('app');
  if (host) host.textContent = `Boot failed: ${String(err)}`;
});
