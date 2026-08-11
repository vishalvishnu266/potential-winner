/**
 * Layout primitives — the outer skeleton every view uses.
 *
 * Rules:
 *   - Views never construct <div class="app-root"> etc. manually.
 *   - Views compose these named components.
 */

import { El, UIComponent } from '../framework';
import { Icon } from '../framework/icons';
import { haptics } from '../services';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Child = UIComponent<any> | null | undefined;

/** Vertical flex column (min-width:0). */
export function Column(children: Child[]): UIComponent<'div'> {
  const c = El('div').cls('col');
  for (const child of children) if (child) c.add(child);
  return c;
}

/** Horizontal flex row (min-width:0). */
export function Row(children: Child[]): UIComponent<'div'> {
  const c = El('div').cls('row');
  for (const child of children) if (child) c.add(child);
  return c;
}

/** Root page shell — full-height column. */
export function Screen(children: Child[]): UIComponent<'div'> {
  const c = El('div').cls('col');
  c.style({ height: '100%', minHeight: '0' });
  for (const child of children) if (child) c.add(child);
  return c;
}

/** Scrollable main area with inner content stack. */
export interface ScrollerOpts {
  children: Child[];
  onPullToRefresh?: () => Promise<void> | void;
}

export function Scroller(opts: ScrollerOpts): UIComponent<'main'> {
  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');
  for (const child of opts.children) if (child) inner.add(child);
  main.add(inner);
  if (opts.onPullToRefresh) {
    main.onMount((scroller) => {
      // Lazy import to keep the dep graph clean.
      return attachPtr(scroller, opts.onPullToRefresh!);
    });
  }
  return main;
}

// Local wrapper so callers don't import the framework helper directly.
import { attachPullToRefresh } from '../framework';
function attachPtr(scroller: HTMLElement, cb: () => Promise<void> | void): () => void {
  return attachPullToRefresh(scroller, {
    onRefresh: async () => {
      void haptics.medium();
      await cb();
      void haptics.success();
    },
  });
}

/** Large iOS-style title header with optional leading/trailing controls. */
export interface LargeHeaderOpts {
  title: string;
  subtitle?: string;
  leading?: UIComponent | null;
  trailing?: UIComponent | null;
}

export function LargeHeader(opts: LargeHeaderOpts): UIComponent<'div'> {
  const header = El('div').cls('app-header large');
  const bar = El('div').cls('app-header-inner');
  bar.add(opts.leading ?? El('div').style({ width: '32px' }));
  bar.add(opts.trailing ?? El('div').style({ width: '32px' }));
  header.add(bar);
  header.add(El('div').cls('large-title').text(opts.title));
  if (opts.subtitle) {
    header.add(
      El('div').cls('subtitle').style({
        padding: '0 var(--sp-4) var(--sp-2)',
        maxWidth: 'var(--content-max)', margin: '0 auto',
      }).text(opts.subtitle),
    );
  }
  return header;
}

/** Compact nav header — usually with a back button. */
export interface NavHeaderOpts {
  title: string;
  back?: boolean;
  trailing?: UIComponent | null;
}

export function NavHeader(opts: NavHeaderOpts): UIComponent<'header'> {
  const header = El('header').cls('app-header');
  const bar = El('div').cls('app-header-inner');
  const left = El('div').cls('row').style({ gap: '8px', minWidth: '0' });
  if (opts.back) left.add(FloatingBackButton());
  left.add(El('h1').cls('title truncate').text(opts.title));
  bar.add(left);
  if (opts.trailing) bar.add(opts.trailing);
  header.add(bar);
  return header;
}

/** Chrome-less back button, used in NavHeader + Radar overlay. */
export function FloatingBackButton(): UIComponent<'button'> {
  return El('button').cls('btn ghost sm').attr('aria-label', 'Back')
    .add(Icon('chevron-left', { size: 22 }))
    .onClick(() => {
      void haptics.light();
      if (history.length > 1) history.back();
      else window.location.hash = '/';
    });
}

