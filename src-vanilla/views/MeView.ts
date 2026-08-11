/**
 * MeView — profile + settings.
 *
 * Consolidation: this screen is the ONLY place to change theme, language,
 * or sign in. No shortcuts to Post/Work here.
 */

import { El, UIComponent, openSheet } from '../framework';
import { Icon } from '../framework/icons';
import { i18n, Locale } from '../i18n';
import { appStore, ThemeMode } from '../state';
import { UiController, OtaController } from '../controllers';
import { haptics } from '../services';
import { router } from '../router';

export function MeView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });
  root.add(El('div').cls('app-header large').add(
    El('div').cls('app-header-inner').add(
      El('div'),
      El('button').cls('btn ghost sm').attr('aria-label', 'About')
        .add(Icon('device', { size: 20 }))
        .onClick(() => { void haptics.light(); router.navigate('/about'); }),
    ),
    El('div').cls('large-title').text(t.me.title),
  ));

  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');

  // Identity card
  inner.add(
    El('div').cls('card').add(
      El('div').cls('row').style({ gap: 'var(--sp-3)' }).add(
        El('span').style({
          width: '56px', height: '56px', borderRadius: '999px',
          background: 'var(--c-primary-soft)', color: 'var(--c-primary)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }).add(Icon('user', { size: 28 })),
        El('div').cls('col grow').style({ gap: '2px' }).add(
          El('div').cls('title').text(s.session.name ?? t.me.notSignedIn),
          El('div').cls('small').text(s.session.phone ?? t.me.signInHint),
        ),
        s.session.userId
          ? El('button').cls('btn plain sm').text(t.common.signOut)
              .onClick(() => { void haptics.light(); appStore.update({ session: { userId: null, name: null, phone: null } }); })
          : El('button').cls('btn tinted sm').text(t.common.signIn)
              .onClick(() => openSignIn()),
      ),
    ),
  );

  // Appearance
  inner.add(El('div').cls('section-title').text(t.me.appearance));
  const appearance = El('div').cls('seg');
  const themes: Array<[ThemeMode, string]> = [['light', t.me.light], ['dark', t.me.dark], ['system', t.me.system]];
  for (const [mode, label] of themes) {
    const b = El('button').text(label).onClick(() => { void haptics.selection(); void UiController.setTheme(mode); });
    if (s.ui.theme === mode) b.cls('active');
    appearance.add(b);
  }
  inner.add(appearance);

  // Language
  inner.add(El('div').cls('section-title').text(t.me.language));
  const lang = El('div').cls('seg');
  const langs: Array<[Locale, string]> = [['en', 'English'], ['ta', 'தமிழ்']];
  for (const [l, label] of langs) {
    const b = El('button').text(label).onClick(() => { void haptics.selection(); void UiController.setLocale(l); });
    if (s.ui.locale === l) b.cls('active');
    lang.add(b);
  }
  inner.add(lang);

  // OTA quick info
  const ota = OtaController.snapshot();
  inner.add(El('div').cls('section-title').text('App'));
  inner.add(
    El('div').cls('list').add(
      El('div').cls('kv').add(El('span').cls('k').text('Version'), El('span').cls('v num').text(ota.version)),
      El('div').cls('kv').add(El('span').cls('k').text('Platform'), El('span').cls('v').text(ota.platform)),
      El('button').cls('list-row').onClick(() => { void haptics.light(); void OtaController.checkNow(); }).add(
        El('span').cls('grow').text('Check for update'),
        El('span').cls('list-chev').add(Icon('refresh', { size: 18 })),
      ),
    ),
  );

  main.add(inner);
  root.add(main);
  return root;
}

// ---------------------------------------------------------------------------
// Sign-in sheet
// ---------------------------------------------------------------------------
function openSignIn(): void {
  const t = i18n.t;
  openSheet((close) => {
    const wrap = El('div').cls('col');
    wrap.add(
      El('div').cls('title').style({ padding: '4px 0 var(--sp-3)' }).text(t.common.signIn),
      El('span').cls('field-label').text(t.me.phone),
    );
    const phone = El('input').cls('input').attr('inputmode', 'tel').attr('placeholder', '+91 …');
    const name  = El('input').cls('input').attr('placeholder', t.me.yourName);
    wrap.add(phone, El('span').cls('field-label').text(t.me.yourName), name);
    wrap.add(
      El('button').cls('btn primary block').style({ marginTop: 'var(--sp-3)' }).text(t.me.verifyAndSignIn)
        .onClick(() => {
          void haptics.success();
          appStore.update({
            session: {
              userId: 'demo-user',
              name: (name.el as HTMLInputElement).value || 'Friend',
              phone: (phone.el as HTMLInputElement).value || '',
            },
          });
          close();
        }),
    );
    return wrap;
  });
}
