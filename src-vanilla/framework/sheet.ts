/**
 * Bottom sheet. Fires an `onClose` when scrim is tapped or close() is called.
 * Content is a UIComponent so callers get full DSL power inside.
 */

import { UIComponent } from './dom';

export interface SheetHandle {
  close: () => void;
}

export function openSheet(
  build: (close: () => void) => UIComponent,
  opts: { onClose?: () => void } = {},
): SheetHandle {
  const scrim = document.createElement('div');
  scrim.className = 'sheet-scrim';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  const grabber = document.createElement('div');
  grabber.className = 'grabber';
  const inner = document.createElement('div');
  inner.className = 'sheet-inner';

  const close = (): void => {
    scrim.classList.remove('show');
    sheet.classList.remove('show');
    setTimeout(() => {
      scrim.remove();
      sheet.remove();
      opts.onClose?.();
    }, 320);
  };

  const view = build(close);
  inner.appendChild(view.el);
  sheet.appendChild(grabber);
  sheet.appendChild(inner);
  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
  scrim.addEventListener('click', close);

  requestAnimationFrame(() => {
    scrim.classList.add('show');
    sheet.classList.add('show');
  });

  return { close };
}
