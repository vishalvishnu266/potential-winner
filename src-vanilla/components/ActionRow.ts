/**
 * ActionRow — the single, reusable Call / Navigate / Map trio.
 *
 * Every screen that shows a contactable/locatable entity uses THIS component
 * so users see the same actions in the same order in the same place. Any
 * subset can be enabled per opts.
 */

import { El, UIComponent, toast } from '../framework';
import { Icon } from '../framework/icons';
import { haptics, maps, MapPoint } from '../services';

export interface ActionRowOpts {
  phone?: string | null;
  point?: MapPoint | null;
  compact?: boolean;
}

export function ActionRow(opts: ActionRowOpts): UIComponent<'div'> {
  const row = El('div').cls('row').style({
    gap: 'var(--sp-2)',
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '1fr',
    width: '100%',
  });

  const mk = (
    label: string,
    icon: 'phone' | 'map-pin' | 'target',
    variant: 'primary' | 'tinted' | 'ghost',
    disabled: boolean,
    handler: () => void,
  ): UIComponent<'button'> => {
    const btn = El('button').cls('btn ' + variant + (opts.compact ? ' sm' : ''));
    if (disabled) btn.disabled(true);
    btn.add(Icon(icon, { size: opts.compact ? 16 : 18 }), El('span').text(label));
    btn.onClick(handler);
    return btn;
  };

  row.add(
    mk('Call', 'phone', 'primary', !opts.phone, () => {
      if (!opts.phone) return;
      void haptics.medium();
      maps.callPhone(opts.phone);
    }),
    mk('Navigate', 'target', 'tinted', !opts.point, () => {
      if (!opts.point) return;
      void haptics.light();
      maps.openDirections(opts.point);
    }),
    mk('Map', 'map-pin', 'tinted', !opts.point, () => {
      if (!opts.point) return;
      void haptics.light();
      maps.openInMaps(opts.point);
    }),
  );

  // Long-press on Call → copy number (nice-to-have).
  if (opts.phone) {
    let pressTimer: number | null = null;
    const callBtn = row.el.querySelector('button') as HTMLButtonElement | null;
    if (callBtn) {
      const start = (): void => {
        pressTimer = window.setTimeout(async () => {
          try { await navigator.clipboard.writeText(opts.phone!); toast('Number copied'); void haptics.selection(); }
          catch { /* noop */ }
        }, 600);
      };
      const cancel = (): void => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      callBtn.addEventListener('touchstart', start, { passive: true });
      callBtn.addEventListener('touchend', cancel);
      callBtn.addEventListener('touchcancel', cancel);
      callBtn.addEventListener('mousedown', start);
      callBtn.addEventListener('mouseup', cancel);
      callBtn.addEventListener('mouseleave', cancel);
    }
  }

  return row;
}
