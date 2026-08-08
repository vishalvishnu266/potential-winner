import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/**
 * A rounded surface card with a border — the "grouped list" container
 * used on Settings and elsewhere.
 */
export default function Card({
  children,
  padded = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'overflow-hidden rounded-2xl border border-border bg-surface',
        padded ? 'p-4' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
