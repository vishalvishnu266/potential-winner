/**
 * Button family — every visual variant is a distinct named factory.
 *
 * Props are plain, semantic, and typed. No `className`/`style` overrides;
 * if a new variant is needed, add a new named component.
 */

import { El, UIComponent } from '../framework';
import { Icon, IconName } from '../framework/icons';
import { haptics } from '../services';

/** Shared props */
export interface BaseButtonProps {
  label?: string;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  block?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Haptic style; primary defaults to medium, others to light. */
  haptic?: 'none' | 'light' | 'medium' | 'success';
}

function apply(btn: UIComponent<'button'>, p: BaseButtonProps, defaultHaptic: BaseButtonProps['haptic']): UIComponent<'button'> {
  if (p.size === 'sm') btn.cls('sm');
  if (p.size === 'lg') btn.cls('big');
  if (p.block) btn.cls('block');
  if (p.disabled) btn.disabled(true);
  if (p.ariaLabel) btn.attr('aria-label', p.ariaLabel);
  if (p.icon) btn.add(Icon(p.icon, { size: p.size === 'sm' ? 16 : 18 }));
  if (p.label) btn.add(El('span').text(p.label));
  if (p.onClick) {
    btn.onClick(() => {
      const h = p.haptic ?? defaultHaptic;
      if (h === 'light')   void haptics.light();
      if (h === 'medium')  void haptics.medium();
      if (h === 'success') void haptics.success();
      p.onClick!();
    });
  }
  return btn;
}

/** Green filled — primary CTAs. */
export function PrimaryButton(p: BaseButtonProps): UIComponent<'button'> {
  return apply(El('button').cls('btn primary'), p, 'medium');
}

/** Green-tinted background, green text — secondary emphasis. */
export function TintedButton(p: BaseButtonProps): UIComponent<'button'> {
  return apply(El('button').cls('btn tinted'), p, 'light');
}

/** No fill, primary text — inline actions like "See all". */
export function PlainButton(p: BaseButtonProps): UIComponent<'button'> {
  return apply(El('button').cls('btn plain'), p, 'light');
}

/** Neutral surface with hairline border. */
export function OutlineButton(p: BaseButtonProps): UIComponent<'button'> {
  return apply(El('button').cls('btn'), p, 'light');
}

/** Transparent, muted text — sidebar/nav actions. */
export function GhostButton(p: BaseButtonProps): UIComponent<'button'> {
  return apply(El('button').cls('btn ghost'), p, 'light');
}

/** Red filled — destructive actions. */
export function DangerButton(p: BaseButtonProps): UIComponent<'button'> {
  return apply(El('button').cls('btn danger'), p, 'medium');
}

/** Red-tinted — destructive, softer. */
export function DangerTintedButton(p: BaseButtonProps): UIComponent<'button'> {
  return apply(El('button').cls('btn danger-tinted'), p, 'light');
}

/** Small, chrome-less, icon-only. Requires ariaLabel. */
export interface IconButtonProps {
  icon: IconName;
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  haptic?: 'none' | 'light' | 'medium';
}

export function IconButton(p: IconButtonProps): UIComponent<'button'> {
  const btn = El('button').cls('btn ghost' + (p.size === 'md' ? '' : ' sm'))
    .attr('aria-label', p.ariaLabel)
    .add(Icon(p.icon, { size: p.size === 'md' ? 22 : 20 }));
  if (p.disabled) btn.disabled(true);
  if (p.onClick) {
    btn.onClick(() => {
      const h = p.haptic ?? 'light';
      if (h === 'light')  void haptics.light();
      if (h === 'medium') void haptics.medium();
      p.onClick!();
    });
  }
  return btn;
}

/** Hero-style card-button — the app's biggest tap targets. */
export interface BigActionButtonProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
}

export function BigActionButton(p: BigActionButtonProps): UIComponent<'button'> {
  const btn = El('button').cls('big-action');
  if (p.variant === 'secondary') btn.cls('secondary');
  if (p.variant === 'danger') btn.cls('danger');

  btn.add(
    El('span').style({
      width: '40px', height: '40px', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      borderRadius: '12px',
      background: p.variant === 'secondary' ? 'var(--c-primary-soft)' : 'rgba(255,255,255,0.15)',
      color: p.variant === 'secondary' ? 'var(--c-primary)' : '#fff',
      flexShrink: '0',
    }).add(Icon(p.icon, { size: 22 })),
    El('div').cls('col grow').style({ gap: '2px', minWidth: '0', textAlign: 'left' }).add(
      El('div').cls('big-title truncate').text(p.title),
      p.subtitle
        ? El('div').cls('big-sub truncate').text(p.subtitle)
        : null as unknown as UIComponent,
    ),
  );

  if (p.onClick) {
    btn.onClick(() => {
      void (p.variant === 'danger' ? haptics.warning() : haptics.medium());
      p.onClick!();
    });
  }
  return btn;
}
