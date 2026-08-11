/**
 * Home — foundation screen showing the daily-gig product surface.
 *
 * Pure view: reads store; mutates via controllers only.
 */

import { El, UIComponent } from '../framework';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { BigButton } from '../components/BigButton';
import { CategoryTile } from '../components/CategoryTile';
import { ModeToggle } from '../components/ModeToggle';
import { SponsorStrip } from '../components/SponsorStrip';
import { EmptyState } from '../components/EmptyState';
import { CATEGORIES, labelOf, CategoryKey } from '../data/categories';
import { appStore } from '../state';
import { UiController, FeedController } from '../controllers';
import { i18n } from '../i18n';
import { router } from '../router';

export function HomeView(): UIComponent {
  const t = i18n.t;
  const s = appStore.state;
  const wrap = El('div').cls('col').style({ gap: 'var(--sp-4)' });

  // Kick off async loads on first render if empty.
  if (s.local.sponsors.length === 0 && !s.local.loading) void FeedController.loadSponsors();

  // Header
  wrap.add(
    PageHeader({
      title: s.session.name ? t.app.hi(s.session.name) : t.app.welcome,
    }),
  );

  const main = El('div').cls('col').style({ gap: 'var(--sp-4)' });

  // Mode toggle
  main.add(
    ModeToggle({
      value: s.ui.mode,
      labels: t.modeToggle,
      onChange: (m) => UiController.setMode(m),
    }),
  );

  // Category picker
  const label = s.ui.mode === 'findHelp' ? t.home.pickHelp : t.home.pickWork;
  const catGrid = El('div').cls('cat-grid');
  for (const cat of CATEGORIES) {
    catGrid.add(
      CategoryTile({
        meta: cat,
        label: labelOf(t.category as Record<CategoryKey, string>, cat.key),
        onClick: () => {
          appStore.update({
            ui: { ...appStore.state.ui, categoryFilter: cat.key },
          });
          router.navigate('/work');
        },
      }),
    );
  }
  main.add(
    Section({ title: label }),
    catGrid,
  );

  // Big actions
  main.add(
    Section({ title: t.home.postNew }),
    BigButton({
      title: t.home.postNew,
      subtitle: t.post.whatDoYouNeed,
      icon: 'plus',
      variant: 'primary',
      onClick: () => router.navigate('/post'),
    }),
    BigButton({
      title: t.home.seeAll,
      subtitle: t.work.title,
      icon: 'search',
      variant: 'secondary',
      onClick: () => router.navigate('/work'),
    }),
    BigButton({
      title: t.home.sos,
      subtitle: t.home.sosSoon,
      icon: 'bell',
      variant: 'danger',
      onClick: () => { /* stub */ },
    }),
  );

  // Sponsors
  main.add(
    Section({ title: t.home.localBusinesses, action: { label: t.local.seeAllLocal, onClick: () => router.navigate('/local') } }),
    s.local.sponsors.length > 0
      ? SponsorStrip(s.local.sponsors)
      : EmptyState('🏪', t.local.empty),
  );

  wrap.add(El('main').cls('app-main').add(main));
  return wrap;
}
