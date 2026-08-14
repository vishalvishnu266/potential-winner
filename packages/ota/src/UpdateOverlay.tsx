import { useOta } from './useOta';

/**
 * Full-screen "applying update…" modal.  Only appears during the apply
 * phase — silent polls do not surface.
 *
 * Copy is intentionally minimal + English-only so the overlay works
 * even when the app JS bundle is mid-swap (i18n context may be gone).
 */
export default function UpdateOverlay() {
    const { isApplying, statusMessage } = useOta();
    if (!isApplying) return null;
    const message = statusMessage || 'Updating…';

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 backdrop-blur-[4px]">
            <div className="min-w-[220px] rounded-2xl bg-surface px-7 py-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <div
                    className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--color-hairline)]"
                    style={{ borderTopColor: 'var(--color-accent)' }}
                />
                <div className="text-[15px] font-bold text-text">{message}</div>
                <div className="mt-1 text-xs text-muted">Do not close the app</div>
            </div>
        </div>
    );
}
