/**
 * FindServices — single fast list. Radar removed.
 * Distance-sorted by default; direction shown via BearingArrow on each row.
 */

import { UIComponent } from '../framework';
import {
  Screen, Scroller, LargeHeader, FloatingBackButton,
  ChipRow,
  List, ProviderListRow,
  openProviderSheet,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { CATEGORIES, CategoryKey } from '../data/categories';
import { i18n } from '../i18n';
import { appStore } from '../state';
import { LocationController } from '../controllers';
import { providersService, Provider } from '../services';

export function FindServicesView(query?: URLSearchParams): UIComponent {
  const t = i18n.t;
  let category: CategoryKey | null = (query?.get('cat') as CategoryKey | null) ?? null;
  let providers: Provider[] = [];
  let loading = true;

  const screen = Screen([]);

  const chipOpts: { value: CategoryKey | null; label: string }[] = [
    { value: null, label: 'All' },
    ...CATEGORIES.map((c) => ({
      value: c.key as CategoryKey | null,
      label: (t.category as Record<string, string>)[c.key],
    })),
  ];

  function render(): void {
    const sorted = providers.slice().sort((a, b) => a.distanceKm - b.distanceKm);
    screen.el.replaceChildren();
    screen.add(
      LargeHeader({
        title: 'Find nearby',
        leading: FloatingBackButton(),
      }),
      Scroller({
        onPullToRefresh: async () => { await LocationController.requestNow(); await load(); },
        children: [
          ChipRow<CategoryKey | null>({
            options: chipOpts,
            value: category,
            onSelect: (v) => { category = v; void load(); },
          }),
          loading
            ? SkeletonList(5)
            : sorted.length === 0
              ? EmptyState('🧭', 'No nearby providers')
              : List(sorted.map((p) => ProviderListRow({ provider: p, onOpen: () => openProviderSheet(p) }))),
        ],
      }),
    );
  }

  async function load(): Promise<void> {
    loading = true; render();
    const { lat, lon } = appStore.state.location.coord;
    providers = await providersService.listNearby(lat, lon, 10, category ?? undefined);
    loading = false; render();
  }

  void load();
  return screen;
}
