import { ButtonHTMLAttributes, forwardRef } from 'react';
import { hapticTap } from '../composables/useNative';

export type BigButtonTone =
  | 'primary' | 'good' | 'warn' | 'bad'
  | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal' | 'orange' | 'slate';

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: BigButtonTone;
  fullWidth?: boolean;
  /** Emoji or SVG string shown to the left of the label. */
  icon?: React.ReactNode;
}

const TONE: Record<BigButtonTone, string> = {
  primary: 'bg-primary text-[var(--color-primary-fg)] border-primary',
  good:    'bg-[var(--color-good)] text-white border-transparent',
  warn:    'bg-[var(--color-warn)] text-black border-transparent',
  bad:     'bg-[var(--color-bad)]  text-white border-transparent',
  blue:    'tint-blue   border-transparent',
  green:   'tint-green  border-transparent',
  amber:   'tint-amber  border-transparent',
  rose:    'tint-rose   border-transparent',
  violet:  'tint-violet border-transparent',
  teal:    'tint-teal   border-transparent',
  orange:  'tint-orange border-transparent',
  slate:   'tint-slate  border-transparent',
};

/**
 * Big, high-contrast button meant for the "primary action" on any screen.
 * Minimum height 56 px so it comfortably fits an elderly thumb; a haptic
 * tap fires on every press for tactile feedback.
 */
const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(function BigButton(
  { tone = 'primary', fullWidth = true, icon, className = '', onClick, children, ...rest },
  ref,
) {
  const cls = [
    'press inline-flex items-center justify-center gap-3 rounded-2xl border-2 px-5 py-4',
    'min-h-14 text-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
    TONE[tone],
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={cls}
      onClick={(e) => { hapticTap(); onClick?.(e); }}
      {...rest}
    >
      {icon && <span className="text-2xl leading-none">{icon}</span>}
      <span>{children}</span>
    </button>
  );
});

export default BigButton;
