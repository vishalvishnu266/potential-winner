import { El, UIComponent } from '../framework';
import { Icon } from '../framework/icons';
import { router } from '../router';

export interface PageHeaderOpts {
  title: string;
  showBack?: boolean;
  right?: UIComponent | null;
}

export function PageHeader(opts: PageHeaderOpts): UIComponent<'header'> {
  const header = El('header').cls('app-header');
  const inner  = El('div').cls('app-header-inner');

  const left = El('div').cls('row').attr('style', 'min-width:0; gap:8px;');
  if (opts.showBack) {
    left.add(
      El('button')
        .cls('btn ghost sm')
        .attr('aria-label', 'Back')
        .onClick(() => history.length > 1 ? history.back() : router.navigate('/'))
        .add(Icon('chevron-left', { size: 22 })),
    );
  }
  left.add(El('h1').cls('title truncate').text(opts.title));

  inner.add(left);
  if (opts.right) inner.add(opts.right);
  header.add(inner);
  return header;
}
