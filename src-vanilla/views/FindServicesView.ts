/**
 * FindServicesView (`/find`) — browse & call nearby providers.
 *
 * View modes:
 *   - List: scrollable, pull-to-refresh, inline ActionRow.
 *   - Radar: FULL-SCREEN static radar with rings + upright icon pips.
 *     Uses real device geolocation (via LocationController).
 */

import { El, UIComponent, attachPullToRefresh } from '../framework';
import { Icon } from '../framework/icons';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { ActionRow } from '../components/ActionRow';
import { Radar, RadarPoint } from '../components/Radar';
import { CATEGORIES, metaOf, CategoryKey } from '../data/categories';
import { i18n } from '../i18n';
import { appStore } from '../state';
import { LocationController } from '../controllers';
import { haptics, providersService, Provider, headingService } from '../services';
import { openProviderSheet } from './ProviderSheet';

type ViewMode = 'list' | 'radar';

export function FindServicesView(query?: URLSearchParams): UIComponent {
  const t = i18n.t;
  const initialCat = (query?.get('cat') as CategoryKey | null) ?? null;

  let category: CategoryKey | null = initialCat;
  let mode: ViewMode = 'list';
  let providers: Provider[] = [];
  let loading = true;

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });

  // Header (only shown in list mode; radar mode is fully immersive)
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
      El('button').cls('btn ghost sm').attr('aria-label', 'Back')
        .add(Icon('chevron-left', { size: 22 }))
        .onClick(() => { void haptics.light(); history.length > 1 ? history.back() : (window.location.hash = '/'); }),
      seg,
    ),
    El('div').cls('large-title').text('Find nearby'),
  );

  const body = El('div').cls('col').style({ flex: '1 1 auto', minHeight: '0', display: 'flex', flexDirection: 'column' });
  root.add(header, body);

  listBtn.onClick(() => {
    if (mode === 'list') return;
    void haptics.selection();
    mode = 'list';
    render();
  });
  radarBtn.onClick(async () => {
    if (mode === 'radar') return;
    void haptics.selection();
    if (headingService.permission === 'prompt') await headingService.request();
    // Warm up location if not yet granted.
    await LocationController.requestNow();
    mode = 'radar';
    render();
  });

  async function load(): Promise<void> {
    loading = true; render();
    const { lat, lon } = appStore.state.location.coord;
    providers = await providersService.listNearby(lat, lon, 10, category ?? undefined);
    loading = false; render();
  }
  void load();

  function render(): void {
    body.el.replaceChildren();
    refreshSeg();
    header.el.style.display = mode === 'radar' ? 'none' : '';

    if (mode === 'list') renderList();
    else renderRadar();
  }

  function renderList(): void {
    const main = El('main').cls('app-main');
    const inner = El('div').cls('app-main-inner');

    // Category chips
    const chips = El('div').cls('h-scroll').style({ marginTop: '-4px' });
    const mk = (label: string, active: boolean, onClick: () => void): void => {
      const c = El('button').cls('chip').text(label).onClick(() => {
        void haptics.selection();
        onClick(); void load();
      });
      if (active) c.cls('active');
      chips.add(c);
    };
    mk('All', category === null, () => { category = null; });
    for (const cat of CATEGORIES) {
      const label = (t.category as Record<string, string>)[cat.key];
      mk(label, category === cat.key, () => { category = cat.key; });
    }
    inner.add(chips);

    if (loading) inner.add(SkeletonList(5));
    else if (providers.length === 0) inner.add(EmptyState('🧭', 'No nearby providers'));
    else {
      const list = El('div').cls('list');
      for (const p of providers) {
        const meta = metaOf(p.category);
        const catLabel = (t.category as Record<string, string>)[p.category] ?? p.category;
        const row = El('div').cls('col').style({ padding: 'var(--sp-3) var(--sp-4)', gap: 'var(--sp-2)' });
        row.add(
          El('div').cls('row').style({ gap: 'var(--sp-3)' }).add(
            El('span').cls('job-icon').style({
              background: `var(--tone-${meta.tone}-soft)`,
              color: `var(--tone-${meta.tone})`,
            }).add(Icon(meta.icon, { size: 22 })),
            El('div').cls('col grow').style({ gap: '2px' }).add(
              El('div').cls('job-title truncate').text(p.name),
              El('div').cls('job-meta truncate').text(`${catLabel} · ${p.distanceKm.toFixed(1)} km · ★ ${p.rating.toFixed(1)}`),
            ),
            El('button').cls('btn plain sm').attr('aria-label', 'Details')
              .add(Icon('chevron-right', { size: 20 }))
              .onClick(() => { void haptics.light(); openProviderSheet(p); }),
          ),
          ActionRow({ phone: p.phone, point: { lat: p.lat, lon: p.lon, label: p.name }, compact: true }),
        );
        const wrap = El('div').cls('list-row').style({ display: 'block', padding: '0' });
        wrap.el.appendChild(row.el);
        list.add(wrap);
      }
      inner.add(list);
    }

    main.add(inner);
    body.add(main);

    // Pull-to-refresh
    main.onMount((scroller) => attachPullToRefresh(scroller, {
      onRefresh: async () => { void haptics.medium(); await LocationController.requestNow(); await load(); void haptics.success(); },
    }));
  }

  function renderRadar(): void {
    // Full-screen container that fills the entire body area.
    const shell = El('div').style({
      flex: '1 1 auto', minHeight: '0',
      position: 'relative', display: 'flex', flexDirection: 'column',
    });

    // Top overlay bar (translucent) with back + toggle so the radar remains immersive.
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

    const points: RadarPoint[] = providers.map((p) => ({
      id: p.id,
      distanceKm: p.distanceKm,
      bearingDeg: bearingFrom(
        appStore.state.location.coord.lat,
        appStore.state.location.coord.lon,
        p.lat, p.lon,
      ),
      tone: metaOf(p.category).tone,
      label: p.name,
      icon: metaOf(p.category).icon,
    }));
    const maxKm = Math.max(...providers.map((p) => p.distanceKm), 1);

    const radar = Radar({
      points,
      maxKm: Math.min(10, Math.ceil(maxKm)),
      caption: providers.length
        ? `${providers.length} nearby · tap a pin to open`
        : 'No providers in range',
      onSelect: (id) => {
        const p = providers.find((x) => x.id === id);
        if (p) { void haptics.medium(); openProviderSheet(p); }
      },
    });

    // Heading permission prompt (iOS) if unavailable.
    if (headingService.permission !== 'granted') {
      topBar.add(
        El('button').cls('btn primary sm')
          .add(Icon('target', { size: 16 }), El('span').text('Enable compass'))
          .onClick(async () => { void haptics.light(); await headingService.request(); render(); }),
      );
    }

    shell.add(topBar, radar);
    body.add(shell);
  }

  return root;
}

/** Great-circle bearing from (lat1,lon1) to (lat2,lon2), degrees clockwise from north. */
function bearingFrom(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lon1), λ2 = toRad(lon2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}
