/**
 * FindServicesView (`/find`) — the missing UX.
 *
 * Users can browse cabs, autos, puncture shops, mechanics, cooks, etc. near
 * them and directly Call / Navigate / View on map, WITHOUT posting a job.
 *
 * Controls at the top: category chips (horizontal snap) + List/Radar toggle.
 * Every row shows an inline ActionRow. Tapping the row opens a ProviderSheet
 * with the same actions + more meta. Tapping a Radar dot does the same.
 */

import { El, UIComponent, attachPullToRefresh } from '../framework';
import { Icon } from '../framework/icons';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeletons';
import { ActionRow } from '../components/ActionRow';
import { Radar, RadarPoint } from '../components/Radar';
import { CATEGORIES, metaOf, CategoryKey } from '../data/categories';
import { i18n } from '../i18n';
import { haptics, providersService, Provider, headingService } from '../services';
import { openProviderSheet } from './ProviderSheet';

type ViewMode = 'list' | 'radar';

// A tiny local origin store — later swap for real geolocation service.
const ORIGIN = { lat: 12.9716, lon: 77.5946 };

export function FindServicesView(query?: URLSearchParams): UIComponent {
  const t = i18n.t;
  const initialCat = (query?.get('cat') as CategoryKey | null) ?? null;

  let category: CategoryKey | null = initialCat;
  let mode: ViewMode = 'list';
  let providers: Provider[] = [];
  let loading = true;

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });

  // Header
  const header = El('div').cls('app-header large').add(
    El('div').cls('app-header-inner').add(
      El('div').style({ width: '32px' }),
      // View-mode toggle in the header for quick access
      El('div').cls('seg').style({ maxWidth: '180px' }),
    ),
    El('div').cls('large-title').text('Find nearby services'),
  );
  const seg = header.el.querySelector('.seg') as HTMLDivElement;
  const listBtn  = document.createElement('button');
  listBtn.textContent = 'List';
  const radarBtn = document.createElement('button');
  radarBtn.textContent = 'Radar';
  seg.appendChild(listBtn);
  seg.appendChild(radarBtn);
  root.add(header);

  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');
  main.add(inner);
  root.add(main);

  // Category chip row
  const chips = El('div').cls('h-scroll').style({ marginTop: '-4px' });
  const rebuildChips = (): void => {
    chips.el.replaceChildren();
    const mk = (label: string, active: boolean, onClick: () => void): void => {
      const c = El('button').cls('chip').text(label).onClick(() => {
        void haptics.selection();
        onClick();
        rebuildChips();
        void load();
      });
      if (active) c.cls('active');
      chips.add(c);
    };
    mk('All', category === null, () => { category = null; });
    for (const cat of CATEGORIES) {
      const label = (t.category as Record<string, string>)[cat.key];
      mk(label, category === cat.key, () => { category = cat.key; });
    }
  };
  rebuildChips();

  // Body slot — swapped for list vs radar
  const body = El('div').cls('col').style({ gap: 'var(--sp-3)' });

  const refreshSeg = (): void => {
    listBtn.className  = mode === 'list'  ? 'active' : '';
    radarBtn.className = mode === 'radar' ? 'active' : '';
  };
  listBtn.addEventListener('click', () => {
    if (mode === 'list') return;
    void haptics.selection();
    mode = 'list'; refreshSeg(); renderBody();
  });
  radarBtn.addEventListener('click', async () => {
    if (mode === 'radar') return;
    void haptics.selection();
    if (headingService.permission === 'prompt') await headingService.request();
    mode = 'radar'; refreshSeg(); renderBody();
  });
  refreshSeg();

  inner.add(chips, body);

  const renderList = (): void => {
    if (loading) { body.replaceChildren(SkeletonList(5).el); return; }
    if (providers.length === 0) {
      body.replaceChildren(EmptyState('🧭', 'No nearby providers', 'Try a different category or come back later.').el);
      return;
    }
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
      const rowWrap = El('div').cls('list-row').style({ display: 'block', padding: '0' });
      rowWrap.el.appendChild(row.el);
      list.add(rowWrap);
    }
    body.replaceChildren(list.el);
  };

  const renderRadar = (): void => {
    if (loading) { body.replaceChildren(SkeletonList(1).el); return; }
    if (providers.length === 0) {
      body.replaceChildren(EmptyState('🧭', 'No nearby providers').el);
      return;
    }
    const points: RadarPoint[] = providers.map((p) => ({
      id: p.id,
      distanceKm: p.distanceKm,
      bearingDeg: bearingFrom(ORIGIN.lat, ORIGIN.lon, p.lat, p.lon),
      tone: metaOf(p.category).tone,
      label: p.name,
    }));
    const maxKm = Math.max(...providers.map((p) => p.distanceKm), 3);
    body.replaceChildren(
      Radar({
        points, maxKm: Math.min(10, Math.ceil(maxKm)),
        onSelect: (id) => {
          const p = providers.find((x) => x.id === id);
          if (p) { void haptics.light(); openProviderSheet(p); }
        },
      }).el,
      El('div').cls('small center').style({ textAlign: 'center', marginTop: 'var(--sp-2)' })
        .text(`${providers.length} nearby · tap a dot to open`).el,
    );
  };

  const renderBody = (): void => { mode === 'list' ? renderList() : renderRadar(); };

  async function load(): Promise<void> {
    loading = true; renderBody();
    providers = await providersService.listNearby(ORIGIN.lat, ORIGIN.lon, 10, category ?? undefined);
    loading = false; renderBody();
  }
  void load();

  // Pull-to-refresh
  main.onMount((scroller) => attachPullToRefresh(scroller, {
    onRefresh: async () => { void haptics.medium(); await load(); void haptics.success(); },
  }));

  return root;
}

/** Great-circle bearing from (lat1,lon1) to (lat2,lon2) — degrees clockwise from north. */
function bearingFrom(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lon1), λ2 = toRad(lon2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}
