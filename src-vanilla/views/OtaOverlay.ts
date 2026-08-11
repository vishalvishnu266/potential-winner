/**
 * OtaOverlay — a persistent, self-updating fixed-position component.
 *
 * Does NOT participate in route rendering. Mount once at boot; it subscribes
 * to OTA state and patches its own DOM. This is the "targeted update"
 * pattern we want to use for anything long-lived (canvas, GPS, etc.).
 */

import { El, UIComponent, VerticalLayout } from '../framework';
import { OtaController } from '../controllers';

export function OtaOverlay(): UIComponent<'div'> {
  const root = El('div').style({
    position: 'fixed',
    inset: '0',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(4px)',
    zIndex: '1000',
  });

  const card = VerticalLayout()
    .style({
      minWidth: '220px',
      background: 'white',
      color: '#0b1220',
      padding: '20px 28px',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      textAlign: 'center',
      alignItems: 'center',
    });

  const spinner = El('div').style({
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#4f8cff',
    borderRadius: '50%',
    margin: '0 auto 12px',
    animation: 'ota-spin 1s linear infinite',
  });

  // Inject the keyframe once.
  if (!document.getElementById('ota-spin-style')) {
    const style = document.createElement('style');
    style.id = 'ota-spin-style';
    style.textContent = '@keyframes ota-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  const title = El('div').style({ fontWeight: '700', fontSize: '15px' });
  const hint = El('div')
    .style({ marginTop: '4px', fontSize: '12px', color: '#64748b' })
    .text('Do not close the app');

  card.add(spinner, title, hint);
  root.add(card);

  OtaController.subscribe((s) => {
    const visible = s.isApplying || s.isDownloading;
    root.el.style.display = visible ? 'flex' : 'none';
    title.text(s.statusMessage || 'Updating…');
  });

  return root;
}
