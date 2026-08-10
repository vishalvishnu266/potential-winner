import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { hapticTap } from '../composables/useNative';

export type BigButtonTone =
  | 'primary'    // gradient (violet → pink) — the app's signature CTA
  | 'good'       // green gradient
  | 'warn'       // amber
  | 'bad'        // red gradient
  | 'ghost'      // subtle, on-surface
  | 'outline';   // hairline border

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: BigButtonTone;
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  /** Icon element — usually a lucide icon. Rendered before the label. */
  icon?: ReactNode;
  /** Icon element rendered *after* the label (e.g. trailing chevron). */
  trailing?: ReactNode;
  loading?: boolean;
}

// Per the design brief: buttons are SOLID colours only — no gradients on
// interactive surfaces.  Shadows kept subtle to imply lift.
const TONES: Record<BigButtonTone, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-brand)] border border-transparent',
  good:    'bg-[var(--color-good)]    text-white shadow-sm border border-transparent',
  warn:    'bg-[var(--color-warn)]    text-black shadow-sm border border-transparent',
  bad:     'bg-[var(--color-bad)]     text-white shadow-sm border border-transparent',
  ghost:   'bg-[var(--color-surface-2)] text-text border border-transparent hover:bg-[var(--color-surface)]',
  outline: 'bg-transparent text-text border border-border',
};

const SIZES = {
  md: 'min-h-11 px-4 py-2.5 text-sm rounded-xl',
  lg: 'min-h-14 px-5 py-3.5 text-base rounded-2xl',
};

/**
 * A modern, opinionated primary button.  Uses gradient fills for tone
 * variants, soft shadow lift on the primary CTA, and animates on press.
 * Icons come from lucide-react — pass them as `icon={<Plus size={20} />}`.
 */
const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(function BigButton(
  {
    tone = 'primary', size = 'lg', fullWidth = true,
    icon, trailing, loading, className = '',
    onClick, children, disabled, ...rest
  },
  ref,
) {
  const cls = [
    'press inline-flex items-center justify-center gap-2 font-bold',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    SIZES[size],
    TONES[tone],
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cls}
      onClick={(e) => { if (!loading) { hapticTap(); onClick?.(e); } }}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      <span>{children}</span>
      {trailing}
    </button>
  );
});

export default BigButton;
