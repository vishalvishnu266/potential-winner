/**
 * Wire pull-to-refresh onto a scrollable element (typically `.app-main`).
 * Fires `onRefresh` when the user pulls > `threshold` px past scrollTop=0.
 */

export interface PtrOptions {
  threshold?: number;
  onRefresh: () => Promise<void> | void;
}

export function attachPullToRefresh(scroller: HTMLElement, opts: PtrOptions): () => void {
  const threshold = opts.threshold ?? 60;
  let startY = 0;
  let pulling = false;
  let refreshing = false;

  const indicator = document.createElement('div');
  indicator.className = 'ptr-indicator';
  indicator.textContent = '↓';
  scroller.parentElement?.insertBefore(indicator, scroller);

  const onTouchStart = (e: TouchEvent): void => {
    if (refreshing) return;
    if (scroller.scrollTop <= 0 && e.touches.length === 1) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  };
  const onTouchMove = (e: TouchEvent): void => {
    if (!pulling || refreshing) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 8) {
      const p = Math.min(1, dy / (threshold * 1.6));
      indicator.style.transform = `translate(-50%, ${dy * 0.4}px) rotate(${p * 180}deg)`;
      indicator.classList.toggle('active', dy > threshold);
    }
  };
  const onTouchEnd = async (e: TouchEvent): Promise<void> => {
    if (!pulling || refreshing) return;
    const dy = (e.changedTouches[0]?.clientY ?? startY) - startY;
    pulling = false;
    if (dy > threshold) {
      refreshing = true;
      indicator.classList.remove('active');
      indicator.classList.add('refreshing');
      indicator.style.transform = '';
      try { await opts.onRefresh(); } finally {
        refreshing = false;
        indicator.classList.remove('refreshing');
      }
    } else {
      indicator.style.transform = '';
      indicator.classList.remove('active');
    }
  };

  scroller.addEventListener('touchstart', onTouchStart, { passive: true });
  scroller.addEventListener('touchmove',  onTouchMove,  { passive: true });
  scroller.addEventListener('touchend',   onTouchEnd,   { passive: true });

  return () => {
    scroller.removeEventListener('touchstart', onTouchStart);
    scroller.removeEventListener('touchmove',  onTouchMove);
    scroller.removeEventListener('touchend',   onTouchEnd);
    indicator.remove();
  };
}
