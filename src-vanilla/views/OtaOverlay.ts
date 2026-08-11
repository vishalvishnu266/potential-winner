/**
 * Persistent OTA overlay. Mounted once at boot; patches its own DOM in
 * response to service events (no re-render storm).
 */
import { El, UIComponent } from '../framework';
import { OtaController } from '../controllers';

export function OtaOverlay(): UIComponent<'div'> {
  const root = El('div').cls('ota-overlay');
  const spin = El('div').cls('ota-spin');
  const title = El('div').style({ fontWeight: '700', fontSize: '15px' });
  const hint  = El('div').cls('small').style({ marginTop: '4px' }).text('Do not close the app');

  root.add(El('div').cls('ota-card').add(spin, title, hint));

  OtaController.subscribe((s) => {
    const visible = s.isApplying || s.isDownloading;
    if (visible) root.cls('show'); else root.el.classList.remove('show');
    title.text(s.statusMessage || 'Updating…');
  });

  return root;
}
