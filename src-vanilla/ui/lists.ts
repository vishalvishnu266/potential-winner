/** List family — iOS grouped-inset style. */

import { El, UIComponent } from '../framework';
import { Icon, IconName } from '../framework/icons';
import { haptics } from '../services';
import type { Tone } from '../data/categories';

// ---------- Container ------------------------------------------------------

export function List(children: (UIComponent | null | undefined)[]): UIComponent<'div'> {
  const list = El('div').cls('list');
  for (const c of children) if (c) list.add(c);
  return list;
}

// ---------- Icon tile (the toned coloured square) -------------------------

export interface IconTileProps {
  icon: IconName;
  tone: Tone;
  size?: 'sm' | 'md' | 'lg';
}

export function IconTile(p: IconTileProps): UIComponent<'span'> {
  const sizePx = p.size === 'lg' ? 48 : p.size === 'sm' ? 32 : 40;
  const iconSize = p.size === 'lg' ? 22 : p.size === 'sm' ? 16 : 20;
  return El('span').cls('job-icon')
    .style({
      width: `${sizePx}px`, height: `${sizePx}px`,
      borderRadius: '12px',
      background: `var(--tone-${p.tone}-soft)`,
      color: `var(--tone-${p.tone})`,
    })
    .add(Icon(p.icon, { size: iconSize }));
}

// ---------- Avatar --------------------------------------------------------

export interface AvatarProps {
  icon?: IconName;
  initials?: string;
  size?: number;
}

export function Avatar(p: AvatarProps): UIComponent<'span'> {
  const size = p.size ?? 56;
  const wrap = El('span').style({
    width: `${size}px`, height: `${size}px`,
    borderRadius: '999px',
    background: 'var(--c-primary-soft)',
    color: 'var(--c-primary)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '600', fontSize: `${size * 0.4}px`,
    flexShrink: '0',
  });
  if (p.icon) wrap.add(Icon(p.icon, { size: size * 0.5 }));
  else if (p.initials) wrap.text(p.initials);
  return wrap;
}

// ---------- Generic list row ----------------------------------------------

export interface ListRowProps {
  leading?: UIComponent | null;
  title: string;
  subtitle?: string;
  value?: string;
  chevron?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function ListRow(p: ListRowProps): UIComponent<'div' | 'button'> {
  const isBtn = !!p.onClick;
  const row = (isBtn ? El('button') : El('div')).cls('list-row');
  if (isBtn && p.ariaLabel) row.attr('aria-label', p.ariaLabel);

  if (p.leading) row.add(p.leading);
  row.add(
    El('div').cls('col grow').style({ gap: '2px' }).add(
      El('div').cls('title truncate').style({ fontSize: 'var(--fs-md)', fontWeight: '600' }).text(p.title),
      p.subtitle ? El('div').cls('small truncate').text(p.subtitle) : (null as unknown as UIComponent),
    ),
  );
  if (p.value) row.add(El('div').cls('list-value truncate').text(p.value));
  if (p.chevron) row.add(El('span').cls('list-chev').add(Icon('chevron-right', { size: 18 })));

  if (isBtn && p.onClick) {
    (row as UIComponent<'button'>).onClick(() => { void haptics.light(); p.onClick!(); });
  }
  return row;
}

// ---------- Key/Value list (data readout) ----------------------------------

export interface KVEntry { k: string; v: string; }
export interface KeyValueListProps { rows: KVEntry[]; }

export function KeyValueList(p: KeyValueListProps): UIComponent<'div'> {
  const wrap = El('div').cls('list');
  for (const r of p.rows) {
    wrap.add(
      El('div').cls('kv').add(
        El('span').cls('k').text(r.k),
        El('span').cls('v truncate').text(r.v),
      ),
    );
  }
  return wrap;
}
