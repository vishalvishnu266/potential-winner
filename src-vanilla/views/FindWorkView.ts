/**
 * FindWorkView — THE ONLY place to browse nearby jobs.
 * Now with List / Radar toggle.
 */

import { El, UIComponent, attachPullToRefresh, openSheet } from '../framework';
import { Icon } from '../framework/icons';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { Radar, RadarPoint } from '../components/Radar';
import { appStore } from '../state';
import { FeedController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';
import { CATEGORIES, metaOf } from '../data/categories';
import { formatAgo } from '../data/mock';
import { haptics, headingService } from '../services';

type ViewMode = 'list' | 'radar';
const ORIGIN = { lat: 12.9716, lon: 77.5946 };
let mode: ViewMode = 'list';

export function FindWorkView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.feed.jobs.length === 0 && !s.feed.loading) void FeedController.loadNearby();

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });

  // Header with view-mode toggle + radius chip
  const seg = El('div').cls('seg').style({ maxWidth: '180px' });
  const listBtn = El('button').text('List');
  const radarBtn = El('button').text('Radar');
  seg.add(listBtn, radarBtn);
  const refreshSeg = (): void => {
    listBtn.el.classList.toggle('active', mode === 'list');
    radarBtn.el.classList.toggle('active', mode === 'radar');
  };
  refreshSeg();
  listBtn.onClick(() => { if (mode === 'list') return; void haptics.selection(); mode = 'list'; renderBody(); refreshSeg(); });
  radarBtn.onClick(async () => {
    if (mode === 'radar') return;
    void haptics.selection();
    if (headingService.permission === 'prompt') await headingService.request();
    mode = 'radar'; renderBody(); refreshSeg();
  });

  const header = El('div').cls('app-header large').add(
    El('div').cls('app-header-inner').add(
      seg,
      El('button').cls('chip').text(t.work.withinKm(s.ui.radiusKm))
        .add(Icon('chevron-right', { size: 14 }))
        .onClick(() => openRadiusSheet()),
    ),
    El('div').cls('large-title').text(t.work.title),
  );
  root.add(header);

  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');

  // Category filter row
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

  const body = El('div').cls('col').style({ gap: 'var(--sp-3)' });
  inner.add(filterRow, body);
  main.add(inner);
  root.add(main);

  const filtered = s.ui.categoryFilter === 'all'
    ? s.feed.jobs
    : s.feed.jobs.filter((j) => j.category === s.ui.categoryFilter);

  const renderList = (): void => {
    if (s.feed.loading && s.feed.jobs.length === 0) { body.replaceChildren(SkeletonList(6).el); return; }
    if (filtered.length === 0) {
      body.replaceChildren(EmptyState('🧭', t.work.noJobs(s.ui.radiusKm)).el);
      return;
    }
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
    body.replaceChildren(list.el);
  };

  const renderRadar = (): void => {
    if (filtered.length === 0) { body.replaceChildren(EmptyState('🧭', t.work.noJobs(s.ui.radiusKm)).el); return; }
    const points: RadarPoint[] = filtered.map((j) => ({
      id: j.id,
      distanceKm: j.distanceKm,
      bearingDeg: bearingFrom(ORIGIN.lat, ORIGIN.lon, j.lat, j.lon),
      tone: metaOf(j.category).tone,
      label: j.description,
    }));
    body.replaceChildren(
      Radar({
        points, maxKm: s.ui.radiusKm,
        onSelect: (id) => { void haptics.light(); router.navigate('/job/' + id); },
      }).el,
      El('div').cls('small center').style({ textAlign: 'center', marginTop: 'var(--sp-2)' })
        .text(t.work.radarHint(filtered.length)).el,
    );
  };

  const renderBody = (): void => { mode === 'list' ? renderList() : renderRadar(); };
  renderBody();

  main.onMount((scroller) => attachPullToRefresh(scroller, {
    onRefresh: async () => { void haptics.medium(); await FeedController.loadNearby(); void haptics.success(); },
  }));

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

function bearingFrom(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lon1), λ2 = toRad(lon2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}
