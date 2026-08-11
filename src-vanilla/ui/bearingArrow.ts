/**
 * BearingArrow — small compass arrow that points toward a target.
 *
 * Cost profile:
 *   - One SVG element per row.
 *   - Subscribes to headingService on mount (auto-shared across rows).
 *   - Updates its CSS `transform: rotate(...)` on each throttled heading
 *     event (max ~2 Hz, only if heading changed > 3°).
 *   - No canvas, no DOM insertion, no reflow.
 *
 * If the device has no compass (desktop) the arrow shows the static
 * compass-north bearing to the target instead.
 */

import { El, UIComponent } from '../framework';
import { headingService } from '../services';

export interface BearingArrowProps {
  bearingDeg: number;   // 0..360, compass-north bearing to target.
  size?: number;
}

export function BearingArrow(p: BearingArrowProps): UIComponent<'span'> {
  const size = p.size ?? 16;
  const wrap = El('span').style({
    width: `${size}px`,
    height: `${size}px`,
    display: 'inline-flex',
    color: 'var(--c-primary)',
    flexShrink: '0',
    willChange: 'transform',
  });
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'currentColor');
  svg.style.transition = 'transform 260ms cubic-bezier(.22,1,.36,1)';
  // Arrow pointing up (north). We rotate the outer <svg> to face the target.
  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', 'M12 3 L18 15 L12 12 L6 15 Z');
  svg.appendChild(path);
  wrap.el.appendChild(svg);

  const apply = (heading: number): void => {
    // Rotation = (bearing_to_target − device_heading).
    // If we don't have a heading, we point in compass-absolute (heading = 0).
    const rot = (p.bearingDeg - heading + 360) % 360;
    svg.style.transform = `rotate(${rot}deg)`;
  };

  // Initial paint using compass-absolute.
  apply(0);

  wrap.onMount(() => {
    // Only subscribe if the device can even give us headings.
    if (headingService.permission === 'unavailable') return;
    const unsub = headingService.subscribe((deg) => apply(deg));
    return () => unsub();
  });

  return wrap;
}
