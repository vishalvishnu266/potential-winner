/** Text primitives — semantic named wrappers. */

import { El, UIComponent } from '../framework';

export function Title(text: string): UIComponent<'div'> {
  return El('div').cls('title').text(text);
}

export function Subtitle(text: string): UIComponent<'div'> {
  return El('div').cls('subtitle').text(text);
}

export function Text(text: string): UIComponent<'span'> {
  return El('span').text(text);
}

export function Muted(text: string): UIComponent<'span'> {
  return El('span').cls('muted').text(text);
}

export function Small(text: string): UIComponent<'div'> {
  return El('div').cls('small').text(text);
}

export function SectionTitle(text: string): UIComponent<'div'> {
  return El('div').cls('section-title').text(text);
}

/** ₹ prefix + tabular numerals. */
export function PriceLabel(rupees: number): UIComponent<'div'> {
  return El('div').cls('title num').text('₹' + rupees);
}

export function DistanceLabel(km: number): UIComponent<'span'> {
  return El('span').cls('num').text(km.toFixed(1) + ' km');
}
