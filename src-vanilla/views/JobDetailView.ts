/**
 * JobDetailView — hero + details + ActionRow (Call / Navigate / Map)
 * + a single stage-aware primary CTA.
 */

import { El, UIComponent, toast } from '../framework';
import { Icon } from '../framework/icons';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ActionRow } from '../components/ActionRow';
import { i18n } from '../i18n';
import { router } from '../router';
import { jobsService, haptics } from '../services';
import type { MockJob } from '../data/mock';
import { formatAgo } from '../data/mock';
import { metaOf } from '../data/categories';

type Stage = 'open' | 'accepted' | 'done' | 'rated';

export function JobDetailView(id: string): UIComponent {
  const t = i18n.t;
  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });
  root.add(PageHeader({ title: t.job.title, showBack: true }));

  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');
  main.add(inner);
  root.add(main);

  inner.add(El('div').cls('empty').text('Loading…'));

  let stage: Stage = 'open';
  let job: MockJob | null = null;

  const render = (): void => {
    inner.replaceChildren();
    if (!job) {
      inner.add(EmptyState('❔', 'Job not found', 'It may have been cancelled or already accepted.'));
      return;
    }

    const meta = metaOf(job.category);
    const label = (t.category as Record<string, string>)[job.category] ?? job.category;

    // Hero card
    inner.add(
      El('div').cls('card').add(
        El('div').cls('row').style({ gap: 'var(--sp-3)', alignItems: 'flex-start' }).add(
          El('span').cls('job-icon').style({
            width: '48px', height: '48px', borderRadius: '14px',
            background: `var(--tone-${meta.tone}-soft)`,
            color: `var(--tone-${meta.tone})`,
          }).add(Icon(meta.icon, { size: 22 })),
          El('div').cls('col grow').style({ gap: '4px' }).add(
            El('div').cls('title').text(job.description),
            El('div').cls('small').text(`${label} · ${job.distanceKm.toFixed(1)} km · ${formatAgo(job.postedAt)}`),
          ),
          El('div').cls('title num').text('₹' + job.budget),
        ),
      ),
    );

    // Action row (Call disabled on jobs — no phone on job object yet; Navigate + Map enabled)
    inner.add(
      ActionRow({
        phone: null,
        point: { lat: job.lat, lon: job.lon, label: job.description },
      }),
    );

    // Details
    const list = El('div').cls('list');
    const rows: Array<[string, string]> = [
      [t.post.category, label],
      [t.post.budget, '₹' + job.budget],
      [t.work.distance, `${job.distanceKm.toFixed(2)} km`],
      ['Posted', formatAgo(job.postedAt)],
      ['Stage', stage],
    ];
    for (const [k, v] of rows) {
      list.add(El('div').cls('kv').add(
        El('span').cls('k').text(k),
        El('span').cls('v truncate').text(v),
      ));
    }
    inner.add(list);

    // Primary CTA
    const primary = El('button').cls('btn primary big block');
    if (stage === 'open') {
      primary.text(t.job.acceptThisJob).onClick(async () => {
        void haptics.medium();
        stage = 'accepted';
        toast(t.job.acceptedByHelper);
        void haptics.success();
        render();
      });
    } else if (stage === 'accepted') {
      primary.text(t.job.markAsDone).onClick(async () => {
        void haptics.medium();
        stage = 'done';
        toast(t.job.helperMarkedDone);
        void haptics.success();
        render();
      });
    } else if (stage === 'done') {
      primary.text(t.job.iReceivedPayment).onClick(async () => {
        void haptics.medium();
        stage = 'rated';
        toast(t.job.thanksForRating);
        void haptics.success();
        render();
      });
    } else {
      primary.text('Done').onClick(() => router.navigate('/work'));
    }
    inner.add(primary);
  };

  void jobsService.byId(id).then((j) => { job = j; render(); });
  return root;
}
