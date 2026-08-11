import { El, UIComponent } from '../framework';

export function KeyValueRow(k: string, v: string | UIComponent): UIComponent<'div'> {
  const row = El('div').cls('kv');
  row.add(El('span').cls('k').text(k));
  if (typeof v === 'string') row.add(El('span').cls('v truncate').text(v));
  else row.add(v);
  return row;
}
