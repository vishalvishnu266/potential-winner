/**
 * The "shell" — a persistent chrome (nav bar + content slot) that wraps every
 * routed view. Only the content slot is re-rendered per route change, so the
 * nav bar keeps its DOM state (no focus loss, no flicker).
 */

import {
  Anchor,
  El,
  UIComponent,
  VerticalLayout,
} from './framework';

export interface ShellRoute {
  path: string;
  label: string;
}

export function buildShell(routes: ShellRoute[], currentPath: string): {
  root: UIComponent<'div'>;
  slot: HTMLElement;
} {
  const nav = El('nav').cls('nav');
  for (const r of routes) {
    const link = Anchor(r.label, `#${r.path}`);
    if (r.path === currentPath) link.cls('active');
    nav.add(link);
  }

  const slot = El('main').cls('main');
  const root = VerticalLayout().add(nav, slot);

  return { root, slot: slot.el };
}
