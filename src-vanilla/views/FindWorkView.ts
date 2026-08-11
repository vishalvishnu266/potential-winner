/** FindWork — list + full-screen radar. Composed from named components only. */

import { El, UIComponent } from '../framework';
import {
  Screen, Scroller, LargeHeader, RadarOverlayBar,
  SegmentedControl, ChipRow,
  List, JobListRow,
  openRadiusSheet,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { Radar, RadarPoint } from '../components/Radar';
import { appStore } from '../state';
import { FeedController, LocationController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';
import { CATEGORIES, metaOf, CategoryKey } from '../data/categories';
import { headingService } from '../services';

type ViewMode = 'list' | 'radar';
let mode: ViewMode = 'list';

export function FindWorkView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.feed.jobs.length === 0 && !s.feed.loading) void FeedController.loadNearby();

  const screen = Screen([]);
  const setMode = (m: ViewMode): void => { mode = m; rebuild(); };

  function rebuild(): void {
    screen.el.replaceChildren();

    if (mode === 'list') {
      const filterOptions: { value: CategoryKey | 'all'; label: string }[] = [
        { value: 'all', label: t.work.allCats },
        ...CATEGORIES.map((c) => ({
          value: c.key,
          label: (t.category as Record<string, string>)[c.key],
        })),
      ];

      const filtered = s.ui.categoryFilter === 'all'
        ? s.feed.jobs
        : s.feed.jobs.filter((j) => j.category === s.ui.categoryFilter);

      screen.add(
        LargeHeader({
          title: t.work.title,
          leading: SegmentedControl<ViewMode>({
            options: [{ value: 'list', label: 'List' }, { value: 'radar', label: 'Radar' }],
            value: 'list',
            onChange: async (m) => {
              if (m === 'radar' && headingService.permission === 'prompt') await headingService.request();
              if (m === 'radar') await LocationController.requestNow();
              setMode(m);
            },
            maxWidth: '180px',
          }),
          trailing: El('button').cls('chip').text(t.work.withinKm(s.ui.radiusKm)).onClick(() => openRadiusSheet()),
        }),
        Scroller({
          onPullToRefresh: async () => {
            await LocationController.requestNow();
            await FeedController.loadNearby();
          },
          children: [
            ChipRow<CategoryKey | 'all'>({
              options: filterOptions,
              value: s.ui.categoryFilter,
              onSelect: (v) => appStore.update({ ui: { ...appStore.state.ui, categoryFilter: v } }),
            }),
            s.feed.loading && s.feed.jobs.length === 0
              ? SkeletonList(6)
              : filtered.length === 0
                ? EmptyState('🧭', t.work.noJobs(s.ui.radiusKm))
                : List(filtered.map((j) => JobListRow({ job: j, onOpen: () => router.navigate('/job/' + j.id) }))),
          ],
        }),
      );
    } else {
      const filtered = s.ui.categoryFilter === 'all'
        ? s.feed.jobs
        : s.feed.jobs.filter((j) => j.category === s.ui.categoryFilter);

      const shell = El('div').style({
        flex: '1 1 auto', minHeight: '0',
        position: 'relative', display: 'flex', flexDirection: 'column',
      });

      const points: RadarPoint[] = filtered.map((j) => ({
        id: j.id,
        distanceKm: j.distanceKm,
        bearingDeg: bearingFrom(appStore.state.location.coord.lat, appStore.state.location.coord.lon, j.lat, j.lon),
        tone: metaOf(j.category).tone,
        label: j.description,
        icon: metaOf(j.category).icon,
      }));

      shell.add(
        RadarOverlayBar({
          onBack: () => setMode('list'),
          trailing: SegmentedControl<ViewMode>({
            options: [{ value: 'list', label: 'List' }, { value: 'radar', label: 'Radar' }],
            value: 'radar',
            onChange: (m) => setMode(m),
            maxWidth: '180px',
          }),
        }),
        Radar({
          points, maxKm: s.ui.radiusKm,
          caption: filtered.length ? t.work.radarHint(filtered.length) : 'No jobs in range',
          onSelect: (id) => router.navigate('/job/' + id),
        }),
      );
      screen.add(shell);
    }
  }

  rebuild();
  return screen;
}

function bearingFrom(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lon1), λ2 = toRad(lon2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
