/** Category grid + horizontal carousel. */

import { El, UIComponent } from '../framework';
import { Icon } from '../framework/icons';
import { CATEGORIES, CategoryKey, metaOf, labelOf } from '../data/categories';
import { i18n } from '../i18n';
import { haptics } from '../services';

export interface CategoryTileProps {
  category: CategoryKey;
  onPick: (k: CategoryKey) => void;
  highlighted?: boolean;
  minWidthPx?: number;
}

export function CategoryTile(p: CategoryTileProps): UIComponent<'button'> {
  const t = i18n.t;
  const meta = metaOf(p.category);
  const label = labelOf(t.category as Record<CategoryKey, string>, p.category);
  const tile = El('button').cls('cat-tile');
  if (p.minWidthPx) tile.style({ minWidth: `${p.minWidthPx}px` });
  if (p.highlighted) tile.style({ outline: '2px solid var(--c-primary)' });
  tile.add(
    El('span').cls('cat-ico').style({
      background: `var(--tone-${meta.tone}-soft)`,
      color: `var(--tone-${meta.tone})`,
    }).add(Icon(meta.icon, { size: 22 })),
    El('span').cls('cat-label').text(label),
  );
  tile.onClick(() => { void haptics.selection(); p.onPick(p.category); });
  return tile;
}

/** Full 10-tile grid used in the Post wizard. */
export interface CategoryGridProps {
  onPick: (k: CategoryKey) => void;
  highlightedKey?: CategoryKey | null;
}

export function CategoryGrid(p: CategoryGridProps): UIComponent<'div'> {
  const grid = El('div').cls('cat-grid');
  for (const cat of CATEGORIES) {
    grid.add(CategoryTile({
      category: cat.key,
      onPick: p.onPick,
      highlighted: p.highlightedKey === cat.key,
    }));
  }
  return grid;
}

/** Horizontal, snap-scrolling carousel — used on Home. */
export interface CategoryCarouselProps {
  keys?: CategoryKey[];
  onPick: (k: CategoryKey) => void;
}

export function CategoryCarousel(p: CategoryCarouselProps): UIComponent<'div'> {
  const wrap = El('div').cls('h-scroll').style({ padding: '4px 0' });
  const keys = p.keys ?? CATEGORIES.slice(0, 6).map((c) => c.key);
  for (const k of keys) {
    wrap.add(CategoryTile({ category: k, onPick: p.onPick, minWidthPx: 104 }));
  }
  return wrap;
}
