import { UIComponent } from '../framework';
import { Screen, LargeHeader, Scroller, List, LocalShopRow } from '../ui';
import { EmptyState } from '../components/EmptyState';
import { appStore } from '../state';
import { FeedController } from '../controllers';
import { i18n } from '../i18n';

export function LocalView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.local.sponsors.length === 0 && !s.local.loading) void FeedController.loadSponsors();

  return Screen([
    LargeHeader({ title: t.local.title, subtitle: t.local.subtitle }),
    Scroller({
      onPullToRefresh: () => FeedController.loadSponsors(),
      children: [
        s.local.sponsors.length === 0
          ? EmptyState('🏪', t.local.empty)
          : List(s.local.sponsors.map((sp) =>
              LocalShopRow({ name: sp.name, category: sp.category, distanceKm: sp.distanceKm }),
            )),
      ],
    }),
  ]);
}
