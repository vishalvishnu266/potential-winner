import { UIComponent } from '../framework';
import {
  Screen, LargeHeader, Scroller, Row, Column,
  Card, SectionTitle,
  IconButton, PlainButton, TintedButton, PrimaryButton,
  Avatar,
  SegmentedControl,
  List, ListRow, IconTile, KeyValueList,
  openSignInSheet,
} from '../ui';
import { Title, Small } from '../ui/text';
import { i18n, Locale } from '../i18n';
import { appStore, ThemeMode } from '../state';
import { UiController, OtaController } from '../controllers';
import { haptics } from '../services';
import { router } from '../router';

export function MeView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  const ota = OtaController.snapshot();

  return Screen([
    LargeHeader({
      title: t.me.title,
      trailing: IconButton({
        icon: 'device', ariaLabel: 'About',
        onClick: () => router.navigate('/about'),
      }),
    }),
    Scroller({
      children: [
        Card([
          Row([
            Avatar({ icon: 'user', size: 56 }),
            Column([
              Title(s.session.name ?? t.me.notSignedIn),
              Small(s.session.phone ?? t.me.signInHint),
            ]).cls('grow'),
            s.session.userId
              ? PlainButton({ label: t.common.signOut, size: 'sm',
                  onClick: () => appStore.update({ session: { userId: null, name: null, phone: null } }) })
              : TintedButton({ label: t.common.signIn, size: 'sm', onClick: () => openSignInSheet() }),
          ]),
        ]),

        SectionTitle(t.me.appearance),
        SegmentedControl<ThemeMode>({
          value: s.ui.theme,
          onChange: (v) => { void haptics.selection(); void UiController.setTheme(v); },
          options: [
            { value: 'light',  label: t.me.light },
            { value: 'dark',   label: t.me.dark },
            { value: 'system', label: t.me.system },
          ],
        }),

        SectionTitle(t.me.language),
        SegmentedControl<Locale>({
          value: s.ui.locale,
          onChange: (v) => { void haptics.selection(); void UiController.setLocale(v); },
          options: [
            { value: 'en', label: 'English' },
            { value: 'ta', label: 'தமிழ்' },
          ],
        }),

        SectionTitle('App'),
        KeyValueList({
          rows: [
            { k: 'Version', v: ota.version },
            { k: 'Platform', v: ota.platform },
          ],
        }),
        List([
          ListRow({
            leading: IconTile({ icon: 'refresh', tone: 'blue', size: 'sm' }),
            title: 'Check for update',
            chevron: true,
            onClick: () => OtaController.checkNow(),
          }),
        ]),

        PrimaryButton({
          label: 'Sign in with phone',
          block: true,
          onClick: () => openSignInSheet(),
        }).style({ display: s.session.userId ? 'none' : '' }),
      ],
    }),
  ]);
}
