/** Home — dashboard only. Composed entirely from named UI components. */

import { UIComponent } from '../framework';
import {
  Screen, LargeHeader, Scroller,
  SectionTitle, Muted,
  IconButton, PlainButton, BigActionButton,
  CategoryCarousel,
  List, JobListRow, SponsorStrip,
  Row,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { appStore } from '../state';
import { FeedController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';

export function HomeView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  if (s.local.sponsors.length === 0 && !s.local.loading) void FeedController.loadSponsors();
  if (s.feed.jobs.length === 0 && !s.feed.loading) void FeedController.loadNearby();

  const preview = s.feed.jobs.slice(0, 3);

  return Screen([
    LargeHeader({
      title: s.session.name ? t.app.hi(s.session.name) : t.app.welcome,
      subtitle: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      trailing: IconButton({ icon: 'settings', ariaLabel: 'Settings', onClick: () => router.navigate('/me') }),
    }),
    Scroller({
      children: [
        BigActionButton({
          icon: 'phone',
          title: 'Find nearby services',
          subtitle: 'Cab · Auto · Puncture · Mechanic · Cook · Shops',
          variant: 'secondary',
          onClick: () => router.navigate('/find'),
        }),

        SectionTitle('Suggested'),
        CategoryCarousel({ onPick: (k) => router.navigate('/find?cat=' + k) }),

        Row([
          SectionTitle('Recent nearby'),
          PlainButton({ label: 'See all', size: 'sm', onClick: () => router.navigate('/work') }),
        ]),

        preview.length === 0
          ? EmptyState('🧭', 'Nothing nearby yet', 'Pull to refresh in Work tab.')
          : List(preview.map((j) => JobListRow({ job: j, onOpen: () => router.navigate('/job/' + j.id) }))),

        Row([
          SectionTitle(t.home.localBusinesses),
          PlainButton({ label: 'See all', size: 'sm', onClick: () => router.navigate('/local') }),
        ]),

        s.local.sponsors.length === 0
          ? EmptyState('🏪', t.local.empty)
          : SponsorStrip(s.local.sponsors.map((sp) => ({ name: sp.name, category: sp.category, distanceKm: sp.distanceKm }))),
      ],
    }),
  ]);
}
