/**
 * LocalView — nearby shops list. Single CTA per shop (call / directions).
 */

import { El, UIComponent } from '../framework';
import { Icon } from '../framework/icons';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { appStore } from '../state';
import { FeedController } from '../controllers';
import { i18n } from '../i18n';
import { haptics } from '../services';

export function LocalView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.local.sponsors.length === 0 && !s.local.loading) void FeedController.loadSponsors();

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });
  root.add(
    El('div').cls('app-header large').add(
      El('div').cls('app-header-inner').add(El('div'), El('div')),
      El('div').cls('large-title').text(t.local.title),
      El('div').cls('subtitle').style({ padding: '0 var(--sp-4) var(--sp-2)', maxWidth: 'var(--content-max)', margin: '0 auto' }).text(t.local.subtitle),
    ),
  );

  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');

  if (s.local.sponsors.length === 0) inner.add(EmptyState('🏪', t.local.empty));
  else {
    const list = El('div').cls('list');
    for (const sp of s.local.sponsors) {
      list.add(
        El('div').cls('job-row').add(
          El('span').cls('job-icon').style({ background: 'var(--tone-slate-soft)', color: 'var(--tone-slate)' }).add(Icon('store', { size: 20 })),
          El('div').cls('job-body').add(
            El('div').cls('job-title truncate').text(sp.name),
            El('div').cls('job-meta truncate').text(`${sp.category} · ${sp.distanceKm.toFixed(1)} km`),
          ),
          El('button').cls('btn tinted sm')
            .add(Icon('phone', { size: 14 }), El('span').text('Contact'))
            .onClick(() => { void haptics.light(); }),
        ),
      );
    }
    inner.add(list);
  }

  main.add(inner);
  root.add(main);
  return root;
}
