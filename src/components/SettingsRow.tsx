import { ButtonHTMLAttributes, ReactNode } from 'react';

interface SettingsRowProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  label: ReactNode;
  /** Optional right-hand value (e.g. "English"). */
  value?: ReactNode;
  /** Show a trailing chevron. Defaults to true for navigational rows. */
  chevron?: boolean | ReactNode;
  /** Render as a non-interactive row (no button semantics). */
  readOnly?: boolean;
}

const rowClass =
  'flex w-full items-center justify-between border-t border-border bg-transparent ' +
  'p-3.5 text-left text-sm text-text disabled:opacity-60 first-of-type:border-t-0';

/**
 * A single row inside a Settings-style grouped list. Handles the chevron,
 * optional value display, and the divider between rows.
 */
export default function SettingsRow({
  label,
  value,
  chevron = true,
  readOnly = false,
  className = '',
  ...rest
}: SettingsRowProps) {
  const chevronNode =
    chevron === false ? null : typeof chevron === 'boolean' ? (
      <span className="text-[18px] text-gray-400">›</span>
    ) : (
      chevron
    );

  const trailing = value ? (
    <span className="text-[13px] text-muted">
      {value} {chevron !== false && '›'}
    </span>
  ) : (
    chevronNode
  );

  const cls = [rowClass, readOnly ? 'cursor-default' : 'cursor-pointer', className]
    .filter(Boolean)
    .join(' ');

  if (readOnly) {
    return (
      <div className={cls}>
        <div>{label}</div>
        {trailing}
      </div>
    );
  }

  return (
    <button type="button" className={cls} {...rest}>
      <span>{label}</span>
      {trailing}
    </button>
  );
}
