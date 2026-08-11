/** JobDetail — HeroCard + ActionRow + KeyValueList + stage-aware CTA. */

import { UIComponent, toast } from '../framework';
import {
  Screen, NavHeader, Scroller,
  HeroCard, KeyValueList,
  PrimaryButton,
} from '../ui';
import { ActionRow } from '../components/ActionRow';
import { EmptyState } from '../components/EmptyState';
import { i18n } from '../i18n';
import { router } from '../router';
import { jobsService, haptics } from '../services';
import type { MockJob } from '../data/mock';
import { formatAgo } from '../data/mock';
import { metaOf } from '../data/categories';

type Stage = 'open' | 'accepted' | 'done' | 'rated';

export function JobDetailView(id: string): UIComponent {
  const t = i18n.t;
  let stage: Stage = 'open';
  let job: MockJob | null = null;

  const scroller = Scroller({ children: [EmptyState('⏳', 'Loading…')] });
  const screen = Screen([
    NavHeader({ title: t.job.title, back: true }),
    scroller,
  ]);

  const render = (): void => {
    const inner = scroller.el.querySelector('.app-main-inner') as HTMLElement;
    inner.replaceChildren();
    if (!job) { inner.appendChild(EmptyState('❔', 'Job not found', 'It may have been cancelled or already accepted.').el); return; }

    const meta = metaOf(job.category);
    const label = (t.category as Record<string, string>)[job.category] ?? job.category;

    inner.appendChild(HeroCard({
      icon: meta.icon, tone: meta.tone,
      title: job.description,
      subtitle: `${label} · ${job.distanceKm.toFixed(1)} km · ${formatAgo(job.postedAt)}`,
      price: job.budget,
    }).el);

    inner.appendChild(ActionRow({
      phone: null,
      point: { lat: job.lat, lon: job.lon, label: job.description },
    }).el);

    inner.appendChild(KeyValueList({
      rows: [
        { k: t.post.category, v: label },
        { k: t.post.budget, v: '₹' + job.budget },
        { k: t.work.distance, v: `${job.distanceKm.toFixed(2)} km` },
        { k: 'Posted', v: formatAgo(job.postedAt) },
        { k: 'Stage', v: stage },
      ],
    }).el);

    let cta: UIComponent;
    if (stage === 'open') {
      cta = PrimaryButton({
        label: t.job.acceptThisJob, block: true, size: 'lg',
        onClick: () => { stage = 'accepted'; toast(t.job.acceptedByHelper); void haptics.success(); render(); },
      });
    } else if (stage === 'accepted') {
      cta = PrimaryButton({
        label: t.job.markAsDone, block: true, size: 'lg',
        onClick: () => { stage = 'done'; toast(t.job.helperMarkedDone); void haptics.success(); render(); },
      });
    } else if (stage === 'done') {
      cta = PrimaryButton({
        label: t.job.iReceivedPayment, block: true, size: 'lg',
        onClick: () => { stage = 'rated'; toast(t.job.thanksForRating); void haptics.success(); render(); },
      });
    } else {
      cta = PrimaryButton({ label: 'Done', block: true, size: 'lg', onClick: () => router.navigate('/work') });
    }
    inner.appendChild(cta.el);
  };

  void jobsService.byId(id).then((j) => { job = j; render(); });
  return screen;
}
