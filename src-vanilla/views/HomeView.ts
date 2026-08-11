/**
 * Home — DASHBOARD ONLY.
 *
 * Strict rule enforced: Home never contains a "Post" or "Find" primary
 * action. Those live in their dedicated tabs. Home shows the user's
 * current activity, personalised suggestions, and local highlights.
 */

import { El, UIComponent } from '../framework';
import { Icon } from '../framework/icons';
import { SponsorStrip } from '../components/SponsorStrip';
import { EmptyState } from '../components/EmptyState';
import { appStore } from '../state';
import { FeedController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';
import { CATEGORIES, metaOf } from '../data/categories';
import { formatAgo } from '../data/mock';
import { haptics } from '../services';

export function HomeView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;

  // Kick off loads if empty.
  if (s.local.sponsors.length === 0 && !s.local.loading) void FeedController.loadSponsors();
  if (s.feed.jobs.length === 0 && !s.feed.loading) void FeedController.loadNearby();

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });

  // Large-title style header.
  const header = El('div').cls('app-header large');
  header.add(
    El('div').cls('app-header-inner').add(
      El('span').cls('muted small').text(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })),
      El('button').cls('btn ghost sm').attr('aria-label', 'About')
        .add(Icon('settings', { size: 20 }))
        .onClick(() => { void haptics.light(); router.navigate('/me'); }),
    ),
    El('div').cls('large-title').text(s.session.name ? t.app.hi(s.session.name) : t.app.welcome),
  );
  root.add(header);

  // Main scroller
  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');

  // --- Suggested categories (small carousel, deep-links into /post step 1)
  inner.add(El('div').cls('section-title').text('Suggested'));
  const hcarousel = El('div').cls('h-scroll').style({ padding: '4px 0' });
  const suggested = CATEGORIES.slice(0, 6);
  for (const cat of suggested) {
    const label = (t.category as Record<string, string>)[cat.key];
    hcarousel.add(
      El('button').cls('cat-tile').style({ minWidth: '104px' })
        .add(
          El('span').cls('cat-ico')
            .style({
              background: `var(--tone-${cat.tone}-soft)`,
              color: `var(--tone-${cat.tone})`,
            })
            .add(Icon(cat.icon, { size: 22 })),
          El('span').cls('cat-label').text(label),
        )
        .onClick(() => {
          void haptics.selection();
          // Deep-link into Post wizard with pre-selected category.
          appStore.update({ ui: { ...appStore.state.ui, categoryFilter: cat.key } });
          router.navigate('/post?cat=' + cat.key);
        }),
    );
  }
  inner.add(hcarousel);

  // --- Recent nearby preview (read-only). Full list lives in /work.
  inner.add(
    El('div').cls('row between').style({ padding: '0 var(--sp-2)' }).add(
      El('div').cls('section-title').style({ padding: '0', margin: '0' }).text('Recent nearby'),
      El('button').cls('btn plain sm').text('See all')
        .onClick(() => { void haptics.light(); router.navigate('/work'); }),
    ),
  );

  const jobsPreview = s.feed.jobs.slice(0, 3);
  if (jobsPreview.length === 0 && !s.feed.loading) {
    inner.add(EmptyState('🧭', 'Nothing nearby yet', 'Pull to refresh in Work tab.'));
  } else {
    const list = El('div').cls('list');
    for (const j of jobsPreview) {
      const meta = metaOf(j.category);
      const label = (t.category as Record<string, string>)[j.category] ?? j.category;
      list.add(
        El('button').cls('job-row').onClick(() => {
          void haptics.light();
          router.navigate('/job/' + j.id);
        }).add(
          El('span').cls('job-icon').style({
            background: `var(--tone-${meta.tone}-soft)`,
            color: `var(--tone-${meta.tone})`,
          }).add(Icon(meta.icon, { size: 20 })),
          El('div').cls('job-body').add(
            El('div').cls('job-title truncate').text(j.description),
            El('div').cls('job-meta truncate').text(`${label} · ${j.distanceKm.toFixed(1)} km · ${formatAgo(j.postedAt)}`),
          ),
          El('div').cls('job-price num').text('₹' + j.budget),
        ),
      );
    }
    inner.add(list);
  }

  // --- Local businesses
  inner.add(
    El('div').cls('row between').style({ padding: '0 var(--sp-2)' }).add(
      El('div').cls('section-title').style({ padding: '0', margin: '0' }).text(t.home.localBusinesses),
      El('button').cls('btn plain sm').text('See all')
        .onClick(() => { void haptics.light(); router.navigate('/local'); }),
    ),
  );

  if (s.local.sponsors.length === 0) inner.add(EmptyState('🏪', t.local.empty));
  else inner.add(SponsorStrip(s.local.sponsors));

  main.add(inner);
  root.add(main);
  return root;
}
