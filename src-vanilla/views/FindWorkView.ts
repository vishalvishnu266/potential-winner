/**
 * FindWorkView — THE ONLY place to browse nearby jobs.
 *
 * Controls (consolidated at top):
 *   1. Radius pill (opens a bottom sheet to change 1/3/5/10 km).
 *   2. Category chips (horizontal snap-scroll).
 * Pull-to-refresh on the list.
 */

import { El, UIComponent, attachPullToRefresh, openSheet } from '../framework';
import { Icon } from '../framework/icons';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { appStore } from '../state';
import { FeedController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';
import { CATEGORIES, metaOf, CategoryKey } from '../data/categories';
import { formatAgo } from '../data/mock';
import { haptics } from '../services';

export function FindWorkView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.feed.jobs.length === 0 && !s.feed.loading) void FeedController.loadNearby();

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });

  // Header w/ radius chip on the right.
  const header = El('div').cls('app-header large').add(
    El('div').cls('app-header-inner').add(
      El('div').style({ width: '32px' }), // spacer for symmetry
      El('button').cls('chip').text(t.work.withinKm(s.ui.radiusKm))
        .add(Icon('chevron-right', { size: 14 }))
        .onClick(() => openRadiusSheet()),
    ),
    El('div').cls('large-title').text(t.work.title),
  );
  root.add(header);

  // Category filter row (below the sticky header, still stuck-ish).
  const filterRow = El('div').cls('h-scroll').style({ marginTop: '-4px' });
  const mk = (label: string, active: boolean, onClick: () => void): UIComponent => {
    const c = El('button').cls('chip').text(label).onClick(() => { void haptics.selection(); onClick(); });
    if (active) c.cls('active');
    return c;
  };
  filterRow.add(mk(t.work.allCats, s.ui.categoryFilter === 'all', () =>
    appStore.update({ ui: { ...appStore.state.ui, categoryFilter: 'all' } })));
  for (const cat of CATEGORIES) {
    const label = (t.category as Record<string, string>)[cat.key];
    filterRow.add(mk(label, s.ui.categoryFilter === cat.key, () =>
      appStore.update({ ui: { ...appStore.state.ui, categoryFilter: cat.key } })));
  }

  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');

  inner.add(filterRow);

  // List
  const filtered = s.ui.categoryFilter === 'all'
    ? s.feed.jobs
    : s.feed.jobs.filter((j) => j.category === s.ui.categoryFilter);

  if (s.feed.loading && s.feed.jobs.length === 0) {
    inner.add(SkeletonList(6));
  } else if (filtered.length === 0) {
    inner.add(EmptyState('🧭', t.work.noJobs(s.ui.radiusKm)));
  } else {
    const list = El('div').cls('list');
    for (const j of filtered) {
      const meta = metaOf(j.category);
      const label = (t.category as Record<string, string>)[j.category] ?? j.category;
      list.add(
        El('button').cls('job-row').onClick(() => {
          void haptics.light();
          router.navigate('/job/' + j.id);
        }).add(
          El('span').cls('job-icon').style({
            background: `var(--tone-${meta.tone}-soft)`,
            color: `var(--tone-${meta.tone})`,
          }).add(Icon(meta.icon, { size: 22 })),
          El('div').cls('job-body').add(
            El('div').cls('job-title truncate').text(j.description),
            El('div').cls('job-meta truncate').text(`${label} · ${j.distanceKm.toFixed(1)} km · ${formatAgo(j.postedAt)}`),
          ),
          El('div').cls('job-price num').text('₹' + j.budget),
          El('span').cls('list-chev').add(Icon('chevron-right', { size: 18 })),
        ),
      );
    }
    inner.add(list);
  }

  main.add(inner);
  root.add(main);

  // Wire pull-to-refresh once mounted.
  main.onMount((scroller) =>
    attachPullToRefresh(scroller, {
      onRefresh: async () => {
        void haptics.medium();
        await FeedController.loadNearby();
        void haptics.success();
      },
    }),
  );

  return root;
}

function openRadiusSheet(): void {
  const t = i18n.t;
  openSheet((close) => {
    const wrap = El('div').cls('col');
    wrap.add(El('div').cls('section-title').text(t.work.distance));
    const list = El('div').cls('list');
    for (const km of [1, 3, 5, 10, 25]) {
      const row = El('button').cls('list-row').onClick(() => {
        void haptics.selection();
        FeedController.setRadius(km);
        close();
      });
      row.add(
        El('span').cls('grow').text(t.work.withinKm(km)),
        km === appStore.state.ui.radiusKm
          ? El('span').cls('list-chev').add(Icon('check', { size: 20 })).style({ color: 'var(--c-primary)' })
          : El('span'),
      );
      list.add(row);
    }
    wrap.add(list);
    return wrap;
  });
}
