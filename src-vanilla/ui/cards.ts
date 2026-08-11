/** Card + hero + sponsor components. */

import { El, UIComponent } from '../framework';
import { IconTile } from './lists';
import { PriceLabel, Small, Title } from './text';
import type { IconName } from '../framework/icons';
import type { Tone } from '../data/categories';

/** Plain surface card. */
export function Card(children: (UIComponent | null | undefined)[]): UIComponent<'div'> {
  const card = El('div').cls('card');
  for (const c of children) if (c) card.add(c);
  return card;
}

/** Hero card shown at top of detail pages. */
export interface HeroCardProps {
  icon: IconName;
  tone: Tone;
  title: string;
  subtitle: string;
  price?: number;
}

export function HeroCard(p: HeroCardProps): UIComponent<'div'> {
  const row = El('div').cls('row').style({ gap: 'var(--sp-3)', alignItems: 'flex-start' });
  row.add(
    IconTile({ icon: p.icon, tone: p.tone, size: 'lg' }),
    El('div').cls('col grow').style({ gap: '4px' }).add(
      Title(p.title),
      Small(p.subtitle),
    ),
  );
  if (p.price !== undefined) row.add(PriceLabel(p.price));
  return Card([row]);
}

/** Horizontal sponsor card in a scroll strip. */
export interface SponsorCardProps {
  name: string;
  category: string;
  distanceKm: number;
}

export function SponsorCard(p: SponsorCardProps): UIComponent<'div'> {
  return El('div').cls('sponsor-card').add(
    El('div').cls('sponsor-badge').text('Sponsor · ' + p.category),
    El('div').style({ fontWeight: '700' }).cls('truncate').text(p.name),
    El('div').cls('small truncate').text(`${p.distanceKm.toFixed(1)} km away`),
  );
}

/** Horizontally scrolling strip of sponsors. */
export function SponsorStrip(items: SponsorCardProps[]): UIComponent<'div'> {
  const strip = El('div').cls('sponsor-strip');
  for (const it of items) strip.add(SponsorCard(it));
  return strip;
}
