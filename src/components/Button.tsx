import { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center cursor-pointer rounded-[10px] border font-semibold transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none';

const variants: Record<ButtonVariant, string> = {
  default: 'border-border bg-surface text-text',
  primary: 'border-primary bg-primary text-white',
  danger: 'border-red-200 bg-red-100 text-red-700',
  ghost: 'border-transparent bg-transparent text-text',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'p-3 text-sm',
  lg: 'px-4 py-3.5 text-base',
};

/**
 * Reusable Button component that centralises the app's button styles.
 *
 * Replaces the ad-hoc `btn`, `btnPrimary`, `btnDanger` class strings that
 * were duplicated across pages.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    fullWidth = false,
    className = '',
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  const cls = [
    base,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});

export default Button;
