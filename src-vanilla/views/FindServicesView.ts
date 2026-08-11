/** FindServices — list + radar. Composed from named components only. */

import { El, UIComponent } from '../framework';
import {
  Screen, Scroller, LargeHeader, RadarOverlayBar, FloatingBackButton,
  SegmentedControl, ChipRow,
  List, ProviderListRow,
  openProviderSheet,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { Radar, RadarPoint } from '../components/Radar';
import { CATEGORIES, metaOf, CategoryKey } from '../data/categories';
import { i18n } from '../i18n';
import { appStore } from '../state';
import { LocationController } from '../controllers';
import { headingService, providersService, Provider } from '../services';

type ViewMode = 'list' | 'radar';

export function FindServicesView(query?: URLSearchParams): UIComponent {
  const t = i18n.t;
  let category: CategoryKey | null = (query?.get('cat') as CategoryKey | null) ?? null;
  let mode: ViewMode = 'list';
  let providers: Provider[] = [];
  let loading = true;

  const screen = Screen([]);

  async function load(): Promise<void> {
    loading = true; rebuild();
    const { lat, lon } = appStore.state.location.coord;
    providers = await providersService.listNearby(lat, lon, 10, category ?? undefined);
    loading = false; rebuild();
  }

  function rebuild(): void {
    screen.el.replaceChildren();
    mode === 'list' ? screen.add(buildList()) : screen.add(buildRadar());
  }

  function buildList(): UIComponent {
    const chipOpts: { value: CategoryKey | null; label: string }[] = [
      { value: null, label: 'All' },
      ...CATEGORIES.map((c) => ({
        value: c.key as CategoryKey | null,
        label: (t.category as Record<string, string>)[c.key],
      })),
    ];

    return Screen([
      LargeHeader({
        title: 'Find nearby',
        leading: FloatingBackButton(),
        trailing: SegmentedControl<ViewMode>({
          options: [{ value: 'list', label: 'List' }, { value: 'radar', label: 'Radar' }],
          value: 'list',
          onChange: async (m) => {
            if (m === 'radar' && headingService.permission === 'prompt') await headingService.request();
            if (m === 'radar') await LocationController.requestNow();
            mode = m; rebuild();
          },
          maxWidth: '180px',
        }),
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
            : providers.length === 0
              ? EmptyState('🧭', 'No nearby providers')
              : List(providers.map((p) => ProviderListRow({ provider: p, onOpen: () => openProviderSheet(p) }))),
        ],
      }),
    ]);
  }

  function buildRadar(): UIComponent {
    const shell = El('div').style({
      flex: '1 1 auto', minHeight: '0',
      position: 'relative', display: 'flex', flexDirection: 'column',
    });

    const points: RadarPoint[] = providers.map((p) => ({
      id: p.id,
      distanceKm: p.distanceKm,
      bearingDeg: bearingFrom(appStore.state.location.coord.lat, appStore.state.location.coord.lon, p.lat, p.lon),
      tone: metaOf(p.category).tone,
      label: p.name,
      icon: metaOf(p.category).icon,
    }));
    const maxKm = Math.max(...providers.map((p) => p.distanceKm), 1);

    shell.add(
      RadarOverlayBar({
        onBack: () => { mode = 'list'; rebuild(); },
        trailing: SegmentedControl<ViewMode>({
          options: [{ value: 'list', label: 'List' }, { value: 'radar', label: 'Radar' }],
          value: 'radar',
          onChange: (m) => { mode = m; rebuild(); },
          maxWidth: '180px',
        }),
      }),
      Radar({
        points,
        maxKm: Math.min(10, Math.ceil(maxKm)),
        caption: providers.length ? `${providers.length} nearby · tap a pin to open` : 'No providers in range',
        onSelect: (id) => {
          const p = providers.find((x) => x.id === id);
          if (p) openProviderSheet(p);
        },
      }),
    );
    return shell;
  }

  void load();
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
