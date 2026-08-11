import { El, UIComponent } from '../framework';
import type { Sponsor } from '../data/mock';

export function SponsorStrip(sponsors: Sponsor[]): UIComponent<'div'> {
  const strip = El('div').cls('sponsor-strip');
  for (const s of sponsors) {
    strip.add(
      El('div').cls('sponsor-card').add(
        El('div').cls('sponsor-badge').text('Sponsor · ' + s.category),
        El('div').style({ fontWeight: '700' }).cls('truncate').text(s.name),
        El('div').cls('small truncate').text(`${s.distanceKm.toFixed(1)} km away`),
      ),
    );
  }
  return strip;
}
