import { hapticTap } from '../composables/useNative';
import type { LucideIcon } from 'lucide-react';

export interface CategoryTileProps {
  /** Lucide icon component for this category. */
  Icon: LucideIcon;
  label: string;
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal' | 'orange' | 'slate';
  onClick?: () => void;
  size?: 'md' | 'lg';
}

/**
 * Colourful tile with a lucide icon and label.  The tile itself uses a
 * soft pastel gradient (light theme) / rich duotone (dark theme) so it
 * pops without feeling loud — think IG explore-page category cards.
 */
export default function CategoryTile({
  Icon, label, tone = 'blue', onClick, size = 'lg',
}: CategoryTileProps) {
  const cls = [
    'press flex flex-col items-center justify-center rounded-2xl',
    'shadow-[var(--shadow-card)] border border-[var(--color-hairline)]',
    size === 'lg' ? 'aspect-square p-4 gap-2' : 'p-3 gap-1.5',
    `tint-${tone}`,
  ].join(' ');

  const iconSize = size === 'lg' ? 30 : 22;

  return (
    <button className={cls} onClick={() => { hapticTap(); onClick?.(); }} aria-label={label}>
      <Icon size={iconSize} strokeWidth={2.2} aria-hidden />
      <span className={
        size === 'lg'
          ? 'text-center text-[13px] font-semibold leading-tight'
          : 'text-center text-[11px] font-semibold'
      }>
        {label}
      </span>
    </button>
  );
}
