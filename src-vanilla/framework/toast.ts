/** Global toast host. Call `toast('Saved')` from anywhere. */

let host: HTMLElement | null = null;

function ensureHost(): HTMLElement {
  if (host && host.isConnected) return host;
  host = document.createElement('div');
  host.className = 'toast-host';
  document.body.appendChild(host);
  return host;
}

export function toast(message: string, opts: { durationMs?: number } = {}): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  ensureHost().appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const dur = opts.durationMs ?? 1800;
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 260);
  }, dur);
}
