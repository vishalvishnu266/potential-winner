/**
 * Hash router with path params.
 *
 * Usage:
 *   router.route('/', () => HomeView());
 *   router.route('/job/:id', ({ params }) => JobView(params.id));
 *
 * Views receive a `RouteContext` with `path`, `params`, `query`.
 */

import { UIComponent } from './dom';

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

export type RouteFactory = (ctx: RouteContext) => UIComponent;

interface Compiled { pattern: RegExp; keys: string[]; factory: RouteFactory; }

export class Router {
  private routes: Compiled[] = [];
  private fallback: string = '/';
  private host: HTMLElement | null = null;

  route(path: string, factory: RouteFactory): this {
    const keys: string[] = [];
    const src = path.replace(/:([a-zA-Z_]+)/g, (_m, k) => {
      keys.push(k);
      return '([^/]+)';
    });
    this.routes.push({ pattern: new RegExp(`^${src}$`), keys, factory });
    return this;
  }

  setFallback(path: string): this { this.fallback = path; return this; }

  navigate(path: string): void { window.location.hash = path; }

  get currentPath(): string {
    const raw = window.location.hash.slice(1) || this.fallback;
    // strip query string for pattern-matching
    return raw.split('?')[0] || '/';
  }

  get currentQuery(): URLSearchParams {
    const raw = window.location.hash.slice(1);
    const q = raw.split('?')[1] || '';
    return new URLSearchParams(q);
  }

  start(host: HTMLElement): void {
    this.host = host;
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }

  render(): void {
    if (!this.host) return;
    const path = this.currentPath;
    for (const r of this.routes) {
      const m = r.pattern.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const view = r.factory({ path, params, query: this.currentQuery });
      this.host.replaceChildren(view.el);
      return;
    }
    // Nothing matched → fall back.
    const fb = this.routes.find((r) => r.pattern.exec(this.fallback));
    if (fb) {
      const view = fb.factory({ path: this.fallback, params: {}, query: new URLSearchParams() });
      this.host.replaceChildren(view.el);
      return;
    }
    this.host.textContent = `No route for ${path}`;
  }
}

/** Compute which tab is active for a given URL — mirrors the React helper. */
export function getTabForPath(path: string): string {
  if (path === '/' || path.startsWith('/home')) return 'home';
  if (path.startsWith('/work'))  return 'work';
  if (path.startsWith('/post'))  return 'post';
  if (path.startsWith('/local')) return 'local';
  if (path.startsWith('/me'))    return 'me';
  if (path.startsWith('/job'))   return 'home';
  return 'home';
}
