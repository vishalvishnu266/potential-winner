import { HandHelping, Hammer } from 'lucide-react';
import { hapticTap } from '../composables/useNative';
import { useT } from '../i18n';

export type AppMode = 'help' | 'work';

export interface ModeToggleProps {
  value: AppMode;
  onChange: (m: AppMode) => void;
}

/**
 * Instagram-style segmented control on a rounded pill background.
 * The active option has a solid white pill sliding underneath.
 */
export default function ModeToggle({ value, onChange }: ModeToggleProps) {
  const t = useT();

  const Item = ({
    m, label, Icon,
  }: { m: AppMode; label: string; Icon: typeof HandHelping }) => {
    const active = value === m;
    return (
      <button
        role="tab"
        aria-selected={active}
        onClick={() => { hapticTap(); onChange(m); }}
        className={
          'press relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full ' +
          'py-2.5 text-sm font-semibold transition-colors ' +
          (active ? 'text-text' : 'text-muted')
        }
      >
        <Icon size={18} strokeWidth={2.2} aria-hidden />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div
      role="tablist"
      className="segmented relative flex items-center"
    >
      {/* Sliding pill (indicates active tab) */}
      <span
        aria-hidden
        className={
          'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-card)] ' +
          'transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ' +
          (value === 'help' ? 'translate-x-1' : 'translate-x-[calc(100%+3px)]')
        }
      />
      <Item m="help" label={t.modeToggle.findHelp} Icon={HandHelping} />
      <Item m="work" label={t.modeToggle.findWork} Icon={Hammer} />
    </div>
  );
}
