import { El, UIComponent } from '../framework';

export interface SectionOpts {
  title: string;
  action?: { label: string; onClick: () => void } | null;
}

export function Section(opts: SectionOpts): UIComponent<'div'> {
  const head = El('div').cls('section-head').add(
    El('h3').text(opts.title),
    opts.action
      ? El('button').cls('link').text(opts.action.label).onClick(opts.action.onClick)
      : null,
  );
  return El('div').cls('col').style({ gap: 'var(--sp-2)' }).add(head);
}
