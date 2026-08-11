/**
 * Bottom sheet showing a single provider with the standard ActionRow.
 * Users can Call / Navigate / View on Map without leaving the current
 * screen.
 */

import { El, openSheet, UIComponent } from '../framework';
import { Icon } from '../framework/icons';
import { ActionRow } from '../components/ActionRow';
import { metaOf } from '../data/categories';
import { i18n } from '../i18n';
import type { Provider } from '../services';

export function openProviderSheet(p: Provider): void {
  const t = i18n.t;
  const meta = metaOf(p.category);
  const catLabel = (t.category as Record<string, string>)[p.category] ?? p.category;

  openSheet((_close) => {
    const wrap = El('div').cls('col');

    // Header
    wrap.add(
      El('div').cls('row').style({ gap: 'var(--sp-3)', padding: '4px 0 var(--sp-3)' }).add(
        El('span').cls('job-icon').style({
          width: '56px', height: '56px', borderRadius: '18px',
          background: `var(--tone-${meta.tone}-soft)`,
          color: `var(--tone-${meta.tone})`,
        }).add(Icon(meta.icon, { size: 26 })),
        El('div').cls('col grow').style({ gap: '2px' }).add(
          El('div').cls('title truncate').text(p.name),
          El('div').cls('small truncate').text(`${catLabel} · ${p.distanceKm.toFixed(1)} km · ${p.eta ?? ''}`),
          El('div').cls('small').text(`★ ${p.rating.toFixed(1)} · ${p.reviews} reviews · ${p.openNow ? 'Open now' : 'Closed'}`),
        ),
      ),
    );

    // Primary actions
    wrap.add(ActionRow({ phone: p.phone, point: { lat: p.lat, lon: p.lon, label: p.name } }));

    // Meta
    wrap.add(
      El('div').cls('list').style({ marginTop: 'var(--sp-3)' }).add(
        El('div').cls('kv').add(El('span').cls('k').text('Phone'), El('span').cls('v mono').text(p.phone)),
        El('div').cls('kv').add(El('span').cls('k').text('Distance'), El('span').cls('v num').text(p.distanceKm.toFixed(2) + ' km')),
        El('div').cls('kv').add(El('span').cls('k').text('ETA'), El('span').cls('v').text(p.eta ?? '—')),
      ),
    );
    return wrap;
  });
}
