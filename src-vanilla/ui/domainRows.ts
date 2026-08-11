/**
 * Domain rows — the app's real primary content items.
 * These are the reusable "job row", "provider row" etc. that were previously
 * inlined in every list.
 */

import { El, UIComponent } from '../framework';
import { Icon } from '../framework/icons';
import { IconTile } from './lists';
import { ActionRow } from '../components/ActionRow';
import { haptics } from '../services';
import { formatAgo, MockJob } from '../data/mock';
import type { Provider } from '../services';
import { metaOf } from '../data/categories';
import { i18n } from '../i18n';

// ---------------------------------------------------------------------------
// JobListRow — used in FindWork list + Home preview
// ---------------------------------------------------------------------------

export interface JobListRowProps {
  job: MockJob;
  onOpen: () => void;
}

export function JobListRow(p: JobListRowProps): UIComponent<'button'> {
  const t = i18n.t;
  const meta = metaOf(p.job.category);
  const label = (t.category as Record<string, string>)[p.job.category] ?? p.job.category;

  return El('button').cls('job-row').onClick(() => {
    void haptics.light();
    p.onOpen();
  }).add(
    IconTile({ icon: meta.icon, tone: meta.tone }),
    El('div').cls('job-body').add(
      El('div').cls('job-title truncate').text(p.job.description),
      El('div').cls('job-meta truncate').text(`${label} · ${p.job.distanceKm.toFixed(1)} km · ${formatAgo(p.job.postedAt)}`),
    ),
    El('div').cls('job-price num').text('₹' + p.job.budget),
    El('span').cls('list-chev').add(Icon('chevron-right', { size: 18 })),
  );
}

// ---------------------------------------------------------------------------
// ProviderListRow — used in FindServices list
// ---------------------------------------------------------------------------

export interface ProviderListRowProps {
  provider: Provider;
  onOpen: () => void;
}

export function ProviderListRow(p: ProviderListRowProps): UIComponent<'div'> {
  const t = i18n.t;
  const meta = metaOf(p.provider.category);
  const catLabel = (t.category as Record<string, string>)[p.provider.category] ?? p.provider.category;

  const inner = El('div').cls('col').style({ padding: 'var(--sp-3) var(--sp-4)', gap: 'var(--sp-2)' });
  inner.add(
    El('div').cls('row').style({ gap: 'var(--sp-3)' }).add(
      IconTile({ icon: meta.icon, tone: meta.tone }),
      El('div').cls('col grow').style({ gap: '2px' }).add(
        El('div').cls('job-title truncate').text(p.provider.name),
        El('div').cls('job-meta truncate').text(`${catLabel} · ${p.provider.distanceKm.toFixed(1)} km · ★ ${p.provider.rating.toFixed(1)}`),
      ),
      El('button').cls('btn plain sm').attr('aria-label', 'Details')
        .add(Icon('chevron-right', { size: 20 }))
        .onClick(() => { void haptics.light(); p.onOpen(); }),
    ),
    ActionRow({
      phone: p.provider.phone,
      point: { lat: p.provider.lat, lon: p.provider.lon, label: p.provider.name },
      compact: true,
    }),
  );

  const row = El('div').cls('list-row').style({ display: 'block', padding: '0' });
  row.el.appendChild(inner.el);
  return row;
}

// ---------------------------------------------------------------------------
// LocalShopRow — used on /local
// ---------------------------------------------------------------------------

export interface LocalShopRowProps {
  name: string;
  category: string;
  distanceKm: number;
  onContact?: () => void;
}

export function LocalShopRow(p: LocalShopRowProps): UIComponent<'div'> {
  return El('div').cls('job-row').add(
    IconTile({ icon: 'store', tone: 'slate' }),
    El('div').cls('job-body').add(
      El('div').cls('job-title truncate').text(p.name),
      El('div').cls('job-meta truncate').text(`${p.category} · ${p.distanceKm.toFixed(1)} km`),
    ),
    El('button').cls('btn tinted sm')
      .add(Icon('phone', { size: 14 }), El('span').text('Contact'))
      .onClick(() => { void haptics.light(); p.onContact?.(); }),
  );
}
