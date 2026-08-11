/**
 * FindWork — single fast list. Radar removed.
 * Distance-sorted by default; direction shown via BearingArrow on each row.
 */

import { UIComponent } from '../framework';
import {
  Screen, Scroller, LargeHeader,
  ChipRow,
  List, JobListRow,
  openRadiusSheet,
} from '../ui';
import { El } from '../framework';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { appStore } from '../state';
import { FeedController, LocationController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';
import { CATEGORIES, CategoryKey } from '../data/categories';

export function FindWorkView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.feed.jobs.length === 0 && !s.feed.loading) void FeedController.loadNearby();

  const filterOptions: { value: CategoryKey | 'all'; label: string }[] = [
    { value: 'all', label: t.work.allCats },
    ...CATEGORIES.map((c) => ({
      value: c.key,
      label: (t.category as Record<string, string>)[c.key],
    })),
  ];

  const filtered = (s.ui.categoryFilter === 'all'
    ? s.feed.jobs
    : s.feed.jobs.filter((j) => j.category === s.ui.categoryFilter)
  ).slice().sort((a, b) => a.distanceKm - b.distanceKm);

  return Screen([
    LargeHeader({
      title: t.work.title,
      trailing: El('button').cls('chip').text(t.work.withinKm(s.ui.radiusKm))
        .onClick(() => openRadiusSheet()),
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
  ]);
}
