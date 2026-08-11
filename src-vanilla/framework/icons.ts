/**
 * Inline SVG icon registry.
 * - Zero deps. Each icon is a small hand-picked SVG path.
 * - Consumers call `Icon('home', { size: 24 })`.
 * - New icons: add a string entry to `PATHS` below.
 */

import { El, UIComponent } from './dom';

export type IconName =
  | 'home' | 'search' | 'plus' | 'store' | 'user'
  | 'chevron-left' | 'chevron-right'
  | 'map-pin' | 'phone' | 'clock' | 'target'
  | 'truck' | 'brush' | 'droplets' | 'zap' | 'car' | 'taxi'
  | 'disc' | 'wrench' | 'pot' | 'grid'
  | 'sun' | 'moon' | 'device' | 'globe'
  | 'check' | 'x' | 'bell' | 'settings' | 'refresh';

/** SVG path definitions. All drawn on a 24×24 viewBox, `currentColor`. */
const PATHS: Record<IconName, string> = {
  home:           'M3 11 L12 3 L21 11 V21 H14 V14 H10 V21 H3 Z',
  search:         'M10 4 a6 6 0 1 0 3.6 10.8 L20 21 M16 10 a6 6 0 1 0 -12 0 a6 6 0 0 0 12 0 Z',
  plus:           'M12 5 V19 M5 12 H19',
  store:          'M4 8 L5 4 H19 L20 8 M4 8 V20 H20 V8 M4 8 H20 M8 20 V13 H16 V20',
  user:           'M12 12 a4 4 0 1 0 0-8 a4 4 0 0 0 0 8 Z M4 20 c1-4 5-6 8-6 s7 2 8 6',
  'chevron-left':  'M15 6 L9 12 L15 18',
  'chevron-right': 'M9 6 L15 12 L9 18',
  'map-pin':      'M12 22 s-7-7-7-12 a7 7 0 1 1 14 0 c0 5-7 12-7 12 Z M12 10 a2 2 0 1 0 0 4 a2 2 0 0 0 0-4 Z',
  phone:          'M5 4 h4 l2 5 l-3 2 c1 3 3 5 6 6 l2-3 l5 2 v4 c0 1-1 2-2 2 c-9 0-16-7-16-16 c0-1 1-2 2-2 Z',
  clock:          'M12 3 a9 9 0 1 0 0 18 a9 9 0 0 0 0-18 Z M12 7 V12 L15 14',
  target:         'M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20 Z M12 7 a5 5 0 1 0 0 10 a5 5 0 0 0 0-10 Z M12 11 a1 1 0 1 0 0 2 a1 1 0 0 0 0-2 Z',
  truck:          'M3 7 h11 v9 H3 Z M14 10 h4 l3 3 v3 H14 Z M7 19 a2 2 0 1 0 0-4 a2 2 0 0 0 0 4 Z M17 19 a2 2 0 1 0 0-4 a2 2 0 0 0 0 4 Z',
  brush:          'M9 3 h6 v6 h-6 Z M6 9 h12 v3 H6 Z M11 12 c-1 3-3 4-3 7 c0 1 1 2 4 2 s4-1 4-2 c0-3-2-4-3-7',
  droplets:       'M12 3 c3 5 6 8 6 12 a6 6 0 1 1-12 0 c0-4 3-7 6-12 Z',
  zap:            'M13 3 L4 14 h6 l-2 7 l9-11 h-6 Z',
  car:            'M4 12 l2-5 h12 l2 5 v6 h-3 v-2 H7 v2 H4 Z M7 15 a1 1 0 1 0 0-2 a1 1 0 0 0 0 2 Z M17 15 a1 1 0 1 0 0-2 a1 1 0 0 0 0 2 Z',
  taxi:           'M4 12 l2-5 h12 l2 5 v6 h-3 v-2 H7 v2 H4 Z M8 4 h8 v3 H8 Z M7 15 a1 1 0 1 0 0-2 a1 1 0 0 0 0 2 Z M17 15 a1 1 0 1 0 0-2 a1 1 0 0 0 0 2 Z',
  disc:           'M12 3 a9 9 0 1 0 0 18 a9 9 0 0 0 0-18 Z M12 8 a4 4 0 1 0 0 8 a4 4 0 0 0 0-8 Z',
  wrench:         'M14 4 a5 5 0 0 1 6 6 l-2 2 l-3-1 l-1 3 l-8 8 l-4-4 l8-8 l3-1 l-1-3 Z',
  pot:            'M4 10 h16 v6 a3 3 0 0 1-3 3 H7 a3 3 0 0 1-3-3 Z M6 10 V7 h12 v3 M9 4 v3 M15 4 v3',
  grid:           'M4 4 h6 v6 H4 Z M14 4 h6 v6 h-6 Z M4 14 h6 v6 H4 Z M14 14 h6 v6 h-6 Z',
  sun:            'M12 5 V2 M12 22 V19 M5 12 H2 M22 12 H19 M6 6 L4 4 M20 20 L18 18 M6 18 L4 20 M20 4 L18 6 M12 7 a5 5 0 1 0 0 10 a5 5 0 0 0 0-10 Z',
  moon:           'M20 15 A8 8 0 1 1 9 4 a7 7 0 0 0 11 11 Z',
  device:         'M6 3 h12 v18 H6 Z M10 18 h4',
  globe:          'M12 3 a9 9 0 1 0 0 18 a9 9 0 0 0 0-18 Z M3 12 h18 M12 3 c3 4 3 14 0 18 M12 3 c-3 4-3 14 0 18',
  check:          'M4 12 L10 18 L20 6',
  x:              'M6 6 L18 18 M18 6 L6 18',
  bell:           'M6 17 h12 v-2 l-1-2 v-4 a5 5 0 0 0-10 0 v4 l-1 2 Z M10 20 a2 2 0 0 0 4 0',
  settings:       'M12 8 a4 4 0 1 0 0 8 a4 4 0 0 0 0-8 Z M19 12 l2-1 l-2-3 l-2 1 l-2-1 l-1-2 h-4 l-1 2 l-2 1 l-2-1 l-2 3 l2 1 v0 l-2 1 l2 3 l2-1 l2 1 l1 2 h4 l1-2 l2-1 l2 1 l2-3 Z',
  refresh:        'M4 12 a8 8 0 0 1 14-5 M20 4 V9 H15 M20 12 a8 8 0 0 1-14 5 M4 20 V15 H9',
};

export interface IconOptions {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Build an inline SVG UIComponent for the given icon name. */
export function Icon(name: IconName, opts: IconOptions = {}): UIComponent<'span'> {
  const size = opts.size ?? 24;
  const stroke = opts.strokeWidth ?? 1.9;
  const wrap = El('span').cls('icon');
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(stroke));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', PATHS[name]);
  svg.appendChild(path);
  wrap.el.appendChild(svg);
  if (opts.className) wrap.cls(opts.className);
  return wrap;
}
