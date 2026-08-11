/**
 * Named sheet contents. Each is a factory that composes a sheet body.
 * Callers use `openSheet(close => SomeSheet(close, opts))`.
 */

import { El, UIComponent, openSheet } from '../framework';
import { Icon } from '../framework/icons';
import { Column } from './layout';
import { List, ListRow } from './lists';
import { SectionTitle, Title } from './text';
import { Field, TextField } from './form';
import { PrimaryButton } from './buttons';
import { appStore } from '../state';
import { FeedController } from '../controllers';
import { i18n } from '../i18n';
import { haptics } from '../services';

// ---------------------------------------------------------------------------
// SheetContent — thin title + body wrapper.
// ---------------------------------------------------------------------------

export interface SheetContentProps {
  title?: string;
  children: (UIComponent | null | undefined)[];
}

export function SheetContent(p: SheetContentProps): UIComponent<'div'> {
  const stack: (UIComponent | null | undefined)[] = [];
  if (p.title) stack.push(El('div').cls('title').style({ padding: '4px 0 var(--sp-3)' }).text(p.title));
  stack.push(...p.children);
  return Column(stack);
}

// ---------------------------------------------------------------------------
// RadiusSheet — pick search radius
// ---------------------------------------------------------------------------

export function openRadiusSheet(): void {
  const t = i18n.t;
  openSheet(() => SheetContent({
    children: [
      SectionTitle(t.work.distance),
      List(
        [1, 3, 5, 10, 25].map((km) =>
          ListRow({
            title: t.work.withinKm(km),
            onClick: () => FeedController.setRadius(km),
            chevron: false,
            value: km === appStore.state.ui.radiusKm ? '✓' : undefined,
          }),
        ),
      ),
    ],
  }));
}

// ---------------------------------------------------------------------------
// SignInSheet — collect phone + name (mock; wire OTP later)
// ---------------------------------------------------------------------------

export function openSignInSheet(): void {
  const t = i18n.t;
  openSheet((close) => {
    let phone = '';
    let name = '';
    return SheetContent({
      title: t.common.signIn,
      children: [
        Field({ label: t.me.phone,    control: TextField({ placeholder: '+91 …',        inputMode: 'tel', onChange: (v) => (phone = v) }) }),
        Field({ label: t.me.yourName, control: TextField({ placeholder: t.me.yourName,                        onChange: (v) => (name = v) }) }),
        PrimaryButton({
          label: t.me.verifyAndSignIn,
          block: true,
          onClick: () => {
            void haptics.success();
            appStore.update({
              session: { userId: 'demo-user', name: name || 'Friend', phone },
            });
            close();
          },
        }),
      ],
    });
  });
}

// ---------------------------------------------------------------------------
// ProviderSheet — details + actions for a single provider
// ---------------------------------------------------------------------------

import { HeroCard } from './cards';
import { ActionRow } from '../components/ActionRow';
import { KeyValueList } from './lists';
import type { Provider } from '../services';
import { metaOf } from '../data/categories';

export function openProviderSheet(p: Provider): void {
  const t = i18n.t;
  const meta = metaOf(p.category);
  const catLabel = (t.category as Record<string, string>)[p.category] ?? p.category;

  openSheet(() => Column([
    HeroCard({
      icon: meta.icon, tone: meta.tone,
      title: p.name,
      subtitle: `${catLabel} · ${p.distanceKm.toFixed(1)} km · ${p.eta ?? ''}`,
    }),
    El('div').cls('small').text(`★ ${p.rating.toFixed(1)} · ${p.reviews} reviews · ${p.openNow ? 'Open now' : 'Closed'}`),
    ActionRow({ phone: p.phone, point: { lat: p.lat, lon: p.lon, label: p.name } }),
    KeyValueList({
      rows: [
        { k: 'Phone', v: p.phone },
        { k: 'Distance', v: p.distanceKm.toFixed(2) + ' km' },
        { k: 'ETA', v: p.eta ?? '—' },
      ],
    }),
  ]));
}
