import { El, UIComponent } from '../framework';

export type Mode = 'findHelp' | 'findWork';

export interface ModeToggleOpts {
  value: Mode;
  labels: { findHelp: string; findWork: string };
  onChange: (m: Mode) => void;
}

export function ModeToggle(opts: ModeToggleOpts): UIComponent<'div'> {
  const seg = El('div').cls('seg').attr('role', 'tablist');
  const mk = (m: Mode, label: string): void => {
    const btn = El('button')
      .attr('role', 'tab')
      .attr('aria-selected', m === opts.value)
      .text(label)
      .onClick(() => opts.onChange(m));
    if (m === opts.value) btn.cls('active');
    seg.add(btn);
  };
  mk('findHelp', opts.labels.findHelp);
  mk('findWork', opts.labels.findWork);
  return seg;
}
