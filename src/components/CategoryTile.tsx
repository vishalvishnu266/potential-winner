import { hapticTap } from '../composables/useNative';

export interface CategoryTileProps {
  emoji: string;
  /** Already-localised label. Caller passes `labelOf(t.category, key)`. */
  label: string;
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal' | 'orange' | 'slate';
  onClick?: () => void;
  size?: 'md' | 'lg';
}

/**
 * The main "picker" tile used on the home screen.  Huge emoji + short
 * label so it's readable at arm's length and understandable without
 * literacy.
 */
export default function CategoryTile({
  emoji, label, tone = 'blue', onClick, size = 'lg',
}: CategoryTileProps) {
  const cls = [
    'press flex flex-col items-center justify-center rounded-3xl',
    'border border-border shadow-sm',
    size === 'lg' ? 'aspect-square p-4 gap-2' : 'p-3 gap-1',
    `tint-${tone}`,
  ].join(' ');

  return (
    <button
      className={cls}
      onClick={() => { hapticTap(); onClick?.(); }}
      aria-label={label}
    >
      <span
        className={size === 'lg' ? 'text-5xl leading-none' : 'text-3xl leading-none'}
        aria-hidden
      >
        {emoji}
      </span>
      <span className={size === 'lg'
        ? 'text-center text-sm font-semibold leading-tight'
        : 'text-center text-xs font-semibold'}>
        {label}
      </span>
    </button>
  );
}
