import { ReactNode } from 'react';

interface KeyValueRowProps {
  label: ReactNode;
  value: ReactNode;
  /** When true, render the value in a red "error" tone. */
  error?: boolean;
  /** When true, render the value in a green "success" tone. */
  success?: boolean;
  /** Additional classes appended to the value <code>. */
  valueClassName?: string;
}

/**
 * A single row in a key/value list — the recurring
 * "label on the left, monospace value on the right" pattern used across
 * Device, Location, Sandbox, Task and Ride pages.
 */
export default function KeyValueRow({
  label,
  value,
  error = false,
  success = false,
  valueClassName = '',
}: KeyValueRowProps) {
  const tone = error
    ? 'text-red-600'
    : success
      ? 'text-emerald-600'
      : 'text-muted';

  return (
    <div className="flex justify-between gap-3 border-b border-border py-2 text-[13px]">
      <span>{label}</span>
      <code className={`break-all text-right ${tone} ${valueClassName}`.trim()}>
        {value}
      </code>
    </div>
  );
}
