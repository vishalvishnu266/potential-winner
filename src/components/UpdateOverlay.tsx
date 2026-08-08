import { useOta } from '../composables/useOta';

export default function UpdateOverlay() {
  const { isApplying, statusMessage } = useOta();

  // Only show the overlay during the *apply/reload* phase, NOT during the
  // silent 15-second polls. That way the user never sees "Checking version…"
  // as an intrusive dialog.
  if (!isApplying) return null;
  const message = statusMessage || 'Updating…';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/55 backdrop-blur-[4px] [-webkit-backdrop-filter:blur(4px)]">
      <div className="min-w-[220px] rounded-2xl bg-white px-7 py-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-primary" />
        <div className="text-[15px] font-bold text-text">{message}</div>
        <div className="mt-1 text-xs text-muted">Do not close the app</div>
      </div>
    </div>
  );
}
