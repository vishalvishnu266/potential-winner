import { InputHTMLAttributes, forwardRef } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Standard text input styled to match the app's surface/border tokens.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={[
        'w-full rounded-[10px] border border-border bg-surface px-3 py-2.5',
        'text-sm text-text outline-none focus:border-primary',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
});

export default Input;
