import { El, UIComponent } from '../framework';

export function EmptyState(emoji: string, title: string, hint?: string): UIComponent<'div'> {
  const wrap = El('div').cls('empty');
  wrap.add(
    El('div').cls('emoji').text(emoji),
    El('div').style({ fontWeight: '700', marginTop: '8px' }).text(title),
  );
  if (hint) wrap.add(El('div').cls('small').style({ marginTop: '4px' }).text(hint));
  return wrap;
}
