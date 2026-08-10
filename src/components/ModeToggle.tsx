import { hapticTap } from '../composables/useNative';
import { useT } from '../i18n';

export type AppMode = 'help' | 'work';

export interface ModeToggleProps {
  value: AppMode;
  onChange: (m: AppMode) => void;
}

/**
 * Big two-way switch at the top of the home screen that flips the whole
 * app between "I need help" and "I want work".
 */
export default function ModeToggle({ value, onChange }: ModeToggleProps) {
  const t = useT();
  const opt = (m: AppMode, label: string, emoji: string, tone: string) => {
    const active = value === m;
    return (
      <button
        role="tab"
        aria-selected={active}
        onClick={() => { hapticTap(); onChange(m); }}
        className={[
          'press flex-1 flex items-center justify-center gap-2 rounded-2xl',
          'py-4 text-base font-bold',
          active
            ? `${tone} shadow-md`
            : 'bg-transparent text-muted',
        ].join(' ')}
      >
        <span className="text-2xl leading-none" aria-hidden>{emoji}</span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div
      role="tablist"
      className="flex gap-1 rounded-2xl border border-border bg-[var(--color-surface-2)] p-1"
    >
      {opt('help', t.modeToggle.findHelp, '🙋', 'tint-blue')}
      {opt('work', t.modeToggle.findWork, '🛠️', 'tint-green')}
    </div>
  );
}
