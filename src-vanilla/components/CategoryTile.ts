import { El, UIComponent } from '../framework';
import { Icon, IconName } from '../framework/icons';
import { CategoryMeta } from '../data/categories';

export interface CategoryTileOpts {
  meta: CategoryMeta;
  label: string;
  onClick?: () => void;
}

export function CategoryTile(opts: CategoryTileOpts): UIComponent<'button'> {
  const tile = El('button').cls('cat-tile');
  const iconWrap = El('span')
    .cls('cat-ico')
    .style({
      background: `var(--tone-${opts.meta.tone}-soft)`,
      color: `var(--tone-${opts.meta.tone})`,
    })
    .add(Icon(opts.meta.icon as IconName, { size: 22 }));
  tile.add(iconWrap, El('span').cls('cat-label').text(opts.label));
  if (opts.onClick) tile.onClick(opts.onClick);
  return tile;
}
