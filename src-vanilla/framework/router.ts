/**
 * Tiny hash-based router.
 *
 * - Registers `path -> factory` routes fluently.
 * - Emits the built component into the given host on every hash change.
 * - Supports a fallback route when no match is found.
 *
 * A later iteration can add path params (`/job/:id`) and lazy imports.
 */

import { UIComponent } from './dom';

export type RouteFactory = () => UIComponent;

export class Router {
  private readonly routes = new Map<string, RouteFactory>();
  private fallback: string = '/';
  private host: HTMLElement | null = null;

  route(path: string, factory: RouteFactory): this {
    this.routes.set(path, factory);
    return this;
  }

  setFallback(path: string): this {
    this.fallback = path;
    return this;
  }

  navigate(path: string): void {
    window.location.hash = path;
  }

  get currentPath(): string {
    return window.location.hash.slice(1) || this.fallback;
  }

  start(host: HTMLElement): void {
    this.host = host;
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }

  /** Re-render the current route. Useful after external state updates. */
  render(): void {
    if (!this.host) return;
    const path = this.currentPath;
    const factory = this.routes.get(path) ?? this.routes.get(this.fallback);
    if (!factory) {
      this.host.textContent = `No route for ${path}`;
      return;
    }
    const view = factory();
    while (this.host.firstChild) this.host.removeChild(this.host.firstChild);
    this.host.appendChild(view.el);
  }
}
