/**
 * ActionRow — the single, reusable Call / Navigate / Map trio.
 *
 * Every screen that shows a contactable/locatable entity uses THIS component
 * so users see the same actions in the same order in the same place. Any
 * subset can be enabled per opts.
 *
 * ---------------------------------------------------------------------------
 * Reference implementation for the new vanilla authoring standard.
 *
 * Rules demonstrated here:
 *
 *   1. Component = plain function returning a `UIComponent<Tag>`.
 *   2. The outer root is built with `El(tag).cls(...)` — this keeps the
 *      strong `UIComponent<'div'>` return type (so existing callers using
 *      `.el` / `.add(...)` don't break).
 *   3. All inner markup is authored with a tagged-template `html\`...\``
 *      block, appended once via `.el.appendChild(...)`.
 *   4. Events use `@click=${fn}`, boolean attrs use `?disabled=${bool}`.
 *   5. No Shadow DOM. Global CSS classes still apply.
 * ---------------------------------------------------------------------------
 */

import { El, UIComponent, toast, html } from '../framework';
import { Icon } from '../framework/icons';
import { haptics, maps, MapPoint } from '../services';

export interface ActionRowOpts {
  phone?: string | null;
  point?: MapPoint | null;
  compact?: boolean;
}

export function ActionRow(opts: ActionRowOpts): UIComponent<'div'> {
  const sizeClass = opts.compact ? ' sm' : '';
  const iconSize = opts.compact ? 16 : 18;

  const callDisabled = !opts.phone;
  const navDisabled = !opts.point;
  const mapDisabled = !opts.point;

  const onCall = (): void => {
    if (!opts.phone) return;
    void haptics.medium();
    maps.callPhone(opts.phone);
  };
  const onNavigate = (): void => {
    if (!opts.point) return;
    void haptics.light();
    maps.openDirections(opts.point);
  };
  const onMap = (): void => {
    if (!opts.point) return;
    void haptics.light();
    maps.openInMaps(opts.point);
  };

  // Icons return UIComponent<'span'> — we interpolate their underlying nodes.
  const callIcon = Icon('phone', { size: iconSize }).el;
  const navIcon = Icon('target', { size: iconSize }).el;
  const mapIcon = Icon('map-pin', { size: iconSize }).el;

  // Build the outer root with the fluent factory so the `UIComponent<'div'>`
  // return type is preserved for existing call sites.
  const root = El('div').cls('row action-row').style({
    gap: 'var(--sp-2)',
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '1fr',
    width: '100%',
  });

  // Author the children as markup — reads like HTML, no nested calls.
  root.el.appendChild(html`
    <button
      class="btn primary${sizeClass}"
      ?disabled=${callDisabled}
      @click=${onCall}
    >
      ${callIcon}<span>Call</span>
    </button>
    <button
      class="btn tinted${sizeClass}"
      ?disabled=${navDisabled}
      @click=${onNavigate}
    >
      ${navIcon}<span>Navigate</span>
    </button>
    <button
      class="btn tinted${sizeClass}"
      ?disabled=${mapDisabled}
      @click=${onMap}
    >
      ${mapIcon}<span>Map</span>
    </button>
  `);

  // Long-press on Call → copy number (nice-to-have).
  if (opts.phone) {
    const callBtn = root.el.querySelector('button') as HTMLButtonElement | null;
    if (callBtn) attachLongPressCopy(callBtn, opts.phone);
  }

  return root;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function attachLongPressCopy(btn: HTMLButtonElement, phone: string): void {
  let pressTimer: number | null = null;
  const start = (): void => {
    pressTimer = window.setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(phone);
        toast('Number copied');
        void haptics.selection();
      } catch {
        /* noop */
      }
    }, 600);
  };
  const cancel = (): void => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };
  btn.addEventListener('touchstart', start, { passive: true });
  btn.addEventListener('touchend', cancel);
  btn.addEventListener('touchcancel', cancel);
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', cancel);
  btn.addEventListener('mouseleave', cancel);
}
