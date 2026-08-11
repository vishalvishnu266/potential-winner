/** Post-a-job wizard — composed from named components only. */

import { El, UIComponent, createWizard, toast } from '../framework';
import {
  Screen, NavHeader, Scroller, Row, Column,
  Title, Subtitle, SectionTitle,
  PrimaryButton, GhostButton,
  Field, TextArea, Stepper, PresetChips,
  CategoryGrid,
  KeyValueList,
} from '../ui';
import { CategoryKey } from '../data/categories';
import { i18n } from '../i18n';
import { router } from '../router';
import { haptics } from '../services';

interface Draft {
  category: CategoryKey | null;
  description: string;
  budget: number;
  location: string;
}

export function PostJobView(query?: URLSearchParams): UIComponent {
  const t = i18n.t;
  const draft: Draft = {
    category: (query?.get('cat') as CategoryKey) || null,
    description: '',
    budget: 300,
    location: 'Current location',
  };

  const step1 = buildStep1(draft, () => wiz.next());
  const step2 = buildStep2(draft);
  const step3 = buildStep3(draft, submit);

  const wiz = createWizard([step1, step2, step3]);
  let backBtn!: UIComponent<'button'>;
  let nextBtn!: UIComponent<'button'>;

  function refreshNav(): void {
    const i = wiz.index();
    backBtn.text(i === 0 ? 'Cancel' : 'Back');
    nextBtn.el.style.display = i === wiz.count - 1 ? 'none' : '';
  }

  function validate(step: number): boolean {
    if (step === 0) return !!draft.category;
    if (step === 1) return draft.budget > 0;
    return true;
  }

  async function submit(): Promise<void> {
    void haptics.medium();
    await new Promise((r) => setTimeout(r, 400));
    void haptics.success();
    toast('Your job is live 🚀');
    router.navigate('/');
  }

  backBtn = GhostButton({
    label: 'Back',
    block: true,
    onClick: () => {
      if (wiz.index() === 0) { void haptics.light(); history.length > 1 ? history.back() : router.navigate('/'); }
      else { void haptics.selection(); wiz.prev(); refreshNav(); }
    },
  });
  nextBtn = PrimaryButton({
    label: 'Continue',
    block: true,
    onClick: () => {
      if (!validate(wiz.index())) { void haptics.warning(); return; }
      void haptics.selection();
      wiz.next(); refreshNav();
    },
  });

  const nav = Row([backBtn, nextBtn]);
  nav.style({ marginTop: 'var(--sp-4)', padding: '0 var(--sp-4)' });

  const view = Screen([
    NavHeader({ title: t.post.title, back: true }),
    Scroller({ children: [wiz.stepperEl, wiz.container, nav] }),
  ]);
  refreshNav();
  return view;
}

// ---------- Steps ----------------------------------------------------------

function buildStep1(draft: Draft, onPicked: () => void): UIComponent {
  const stack = Column([
    El('div').style({ padding: 'var(--sp-4) var(--sp-2) 0' }).add(
      Title('What do you need help with?'),
      El('div').style({ height: '4px' }),
      Subtitle('Pick one to get started.'),
    ),
    CategoryGrid({
      highlightedKey: draft.category,
      onPick: (k) => {
        draft.category = k;
        setTimeout(onPicked, 140);
      },
    }),
  ]);
  return stack;
}

function buildStep2(draft: Draft): UIComponent {
  const t = i18n.t;
  return Column([
    El('div').style({ padding: 'var(--sp-4) var(--sp-2) 0' }).add(
      Title('Tell us the details'),
      El('div').style({ height: '4px' }),
      Subtitle(draft.category ? t.post.looksLike((t.category as Record<string, string>)[draft.category]) : ''),
    ),
    El('div').style({ padding: '0 var(--sp-2)' }).add(
      Column([
        Field({
          label: t.post.shortNote,
          control: TextArea({
            placeholder: t.post.notePlaceholder,
            value: draft.description,
            onChange: (v) => { draft.description = v; },
          }),
        }),
        Field({
          label: t.post.budget,
          control: Stepper({
            value: draft.budget,
            min: 50,
            step: 50,
            prefix: '₹',
            onChange: (v) => { draft.budget = v; },
          }),
        }),
        PresetChips<number>({
          options: [200, 300, 500, 800, 1200],
          value: draft.budget,
          format: (v) => '₹' + v,
          onSelect: (v) => { draft.budget = v; },
        }),
      ]),
    ),
  ]);
}

function buildStep3(draft: Draft, onSubmit: () => Promise<void>): UIComponent {
  const t = i18n.t;
  const catLabel = draft.category
    ? (t.category as Record<string, string>)[draft.category]
    : '—';

  return Column([
    El('div').style({ padding: 'var(--sp-4) var(--sp-2) 0' }).add(
      Title('Confirm & post'),
      El('div').style({ height: '4px' }),
      Subtitle('Review the details before your job goes live.'),
    ),
    El('div').style({ padding: '0 var(--sp-2)' }).add(
      KeyValueList({
        rows: [
          { k: t.post.category, v: catLabel },
          { k: t.post.shortNote, v: draft.description || '—' },
          { k: t.post.budget, v: '₹' + draft.budget },
          { k: t.post.where, v: draft.location },
        ],
      }),
    ),
    El('div').style({ padding: 'var(--sp-4) var(--sp-2) 0' }).add(
      PrimaryButton({
        label: t.post.postJobNow,
        block: true,
        size: 'lg',
        onClick: () => { void onSubmit(); },
      }),
    ),
  ]);
}
