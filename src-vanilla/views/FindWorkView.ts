/**
 * FindWorkView — THE ONLY place to browse nearby jobs.
 * Full-screen radar mode + real coords via LocationController.
 */

import { El, UIComponent, attachPullToRefresh, openSheet } from '../framework';
import { Icon } from '../framework/icons';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { Radar, RadarPoint } from '../components/Radar';
import { appStore } from '../state';
import { FeedController, LocationController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';
import { CATEGORIES, metaOf } from '../data/categories';
import { formatAgo } from '../data/mock';
import { haptics, headingService } from '../services';

type ViewMode = 'list' | 'radar';
let mode: ViewMode = 'list';

export function FindWorkView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.feed.jobs.length === 0 && !s.feed.loading) void FeedController.loadNearby();

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });

  const seg = El('div').cls('seg').style({ maxWidth: '180px' });
  const listBtn = El('button').text('List');
  const radarBtn = El('button').text('Radar');
  seg.add(listBtn, radarBtn);
  const refreshSeg = (): void => {
    listBtn.el.classList.toggle('active', mode === 'list');
    radarBtn.el.classList.toggle('active', mode === 'radar');
  };
  refreshSeg();

  const header = El('div').cls('app-header large').add(
    El('div').cls('app-header-inner').add(
      seg,
      El('button').cls('chip').text(t.work.withinKm(s.ui.radiusKm))
        .add(Icon('chevron-right', { size: 14 }))
        .onClick(() => openRadiusSheet()),
    ),
    El('div').cls('large-title').text(t.work.title),
  );

  const body = El('div').cls('col').style({ flex: '1 1 auto', minHeight: '0', display: 'flex', flexDirection: 'column' });
  root.add(header, body);

  listBtn.onClick(() => { if (mode === 'list') return; void haptics.selection(); mode = 'list'; render(); });
  radarBtn.onClick(async () => {
    if (mode === 'radar') return;
    void haptics.selection();
    if (headingService.permission === 'prompt') await headingService.request();
    await LocationController.requestNow();
    mode = 'radar'; render();
  });

  function render(): void {
    body.el.replaceChildren();
    refreshSeg();
    header.el.style.display = mode === 'radar' ? 'none' : '';
    mode === 'list' ? renderList() : renderRadar();
  }

  function renderList(): void {
    const main = El('main').cls('app-main');
    const inner = El('div').cls('app-main-inner');

    const filterRow = El('div').cls('h-scroll').style({ marginTop: '-4px' });
    const mk = (label: string, active: boolean, onClick: () => void): void => {
      const c = El('button').cls('chip').text(label).onClick(() => { void haptics.selection(); onClick(); });
      if (active) c.cls('active');
      filterRow.add(c);
    };
    mk(t.work.allCats, s.ui.categoryFilter === 'all', () =>
      appStore.update({ ui: { ...appStore.state.ui, categoryFilter: 'all' } }));
    for (const cat of CATEGORIES) {
      const label = (t.category as Record<string, string>)[cat.key];
      mk(label, s.ui.categoryFilter === cat.key, () =>
        appStore.update({ ui: { ...appStore.state.ui, categoryFilter: cat.key } }));
    }
    inner.add(filterRow);

    const filtered = s.ui.categoryFilter === 'all'
      ? s.feed.jobs
      : s.feed.jobs.filter((j) => j.category === s.ui.categoryFilter);

    if (s.feed.loading && s.feed.jobs.length === 0) inner.add(SkeletonList(6));
    else if (filtered.length === 0) inner.add(EmptyState('🧭', t.work.noJobs(s.ui.radiusKm)));
    else {
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
    body.add(main);

    main.onMount((scroller) => attachPullToRefresh(scroller, {
      onRefresh: async () => { void haptics.medium(); await LocationController.requestNow(); await FeedController.loadNearby(); void haptics.success(); },
    }));
  }

  function renderRadar(): void {
    const filtered = s.ui.categoryFilter === 'all'
      ? s.feed.jobs
      : s.feed.jobs.filter((j) => j.category === s.ui.categoryFilter);

    const shell = El('div').style({
      flex: '1 1 auto', minHeight: '0',
      position: 'relative', display: 'flex', flexDirection: 'column',
    });

    const topBar = El('div').style({
      position: 'absolute', top: 'var(--safe-t)', left: '0', right: '0', zIndex: '3',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px',
    });
    topBar.add(
      El('button').cls('btn ghost sm').attr('aria-label', 'Back')
        .style({ background: 'var(--c-surface)', boxShadow: 'var(--sh-1)' })
        .add(Icon('chevron-left', { size: 22 }))
        .onClick(() => { void haptics.selection(); mode = 'list'; render(); }),
      El('div').cls('seg').style({ background: 'var(--c-surface)', boxShadow: 'var(--sh-1)', maxWidth: '180px' }).add(
        El('button').text('List').onClick(() => { void haptics.selection(); mode = 'list'; render(); }),
        El('button').cls('active').text('Radar'),
      ),
    );

    const points: RadarPoint[] = filtered.map((j) => ({
      id: j.id,
      distanceKm: j.distanceKm,
      bearingDeg: bearingFrom(
        appStore.state.location.coord.lat,
        appStore.state.location.coord.lon,
        j.lat, j.lon,
      ),
      tone: metaOf(j.category).tone,
      label: j.description,
      icon: metaOf(j.category).icon,
    }));

    const radar = Radar({
      points,
      maxKm: s.ui.radiusKm,
      caption: filtered.length ? t.work.radarHint(filtered.length) : 'No jobs in range',
      onSelect: (id) => { void haptics.medium(); router.navigate('/job/' + id); },
    });

    shell.add(topBar, radar);
    body.add(shell);
  }

  render();
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
