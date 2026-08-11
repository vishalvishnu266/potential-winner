import { El, UIComponent } from '../framework';
import { Icon, IconName } from '../framework/icons';

export interface BigButtonOpts {
  title: string;
  subtitle?: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
}

export function BigButton(opts: BigButtonOpts): UIComponent<'button'> {
  const btn = El('button').cls('big-action');
  if (opts.variant === 'secondary') btn.cls('secondary');
  if (opts.variant === 'danger')    btn.cls('danger');

  if (opts.icon) {
    btn.add(
      El('span')
        .style({
          width: '40px', height: '40px', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.15)',
          flexShrink: '0',
        })
        .add(Icon(opts.icon, { size: 22 })),
    );
  }

  const text = El('div').cls('col').style({ gap: '2px', minWidth: '0', flex: '1', textAlign: 'left' });
  text.add(El('div').cls('big-title truncate').text(opts.title));
  if (opts.subtitle) text.add(El('div').cls('big-sub truncate').text(opts.subtitle));
  btn.add(text);

  if (opts.onClick) btn.onClick(opts.onClick);
  return btn;
}
