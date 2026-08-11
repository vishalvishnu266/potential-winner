/**
 * PostJobView — THE ONLY place to post a job.
 *
 * Linear 3-step wizard:
 *   Step 1: Pick a category (deep-link via ?cat=… lands here pre-selected).
 *   Step 2: Describe + budget.
 *   Step 3: Confirm location + post.
 *
 * Back/next buttons are always visible. Progress dots at top show state.
 * Every step has ONE primary action so users can't get lost.
 */

import { El, UIComponent, createWizard, toast } from '../framework';
import { Icon } from '../framework/icons';
import { PageHeader } from '../components/PageHeader';
import { CATEGORIES, metaOf, CategoryKey } from '../data/categories';
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

  const root = El('div').cls('col').style({ height: '100%', minHeight: '0' });

  // Header
  root.add(PageHeader({
    title: t.post.title,
    showBack: true,
  }));

  const main = El('main').cls('app-main');
  const inner = El('div').cls('app-main-inner');

  // Build the three steps.
  const step1 = buildStep1(draft, () => { void haptics.light(); wiz.next(); refreshNavBar(); });
  const step2 = buildStep2(draft, () => { void haptics.light(); wiz.next(); refreshNavBar(); });
  const step3 = buildStep3(draft, async () => {
    void haptics.medium();
    // Mock post — swap for real API call in a controller later.
    await new Promise((r) => setTimeout(r, 400));
    void haptics.success();
    toast('Your job is live 🚀');
    router.navigate('/');
  });

  const wiz = createWizard([step1, step2, step3]);
  inner.add(wiz.stepperEl, wiz.container);

  // Nav bar (Back + Next). Kept simple, always at the bottom of the step.
  const navBar = El('div').cls('row').style({ marginTop: 'var(--sp-4)', padding: '0 var(--sp-4)' });
  const backBtn = El('button').cls('btn ghost grow').text('Back')
    .onClick(() => {
      if (wiz.index() === 0) { void haptics.light(); history.length > 1 ? history.back() : router.navigate('/'); }
      else { void haptics.selection(); wiz.prev(); refreshNavBar(); }
    });
  const nextBtn = El('button').cls('btn primary grow').text('Continue')
    .onClick(() => {
      if (wiz.index() === wiz.count - 1) return; // step 3 has its own submit
      if (!validate(wiz.index(), draft)) { void haptics.warning(); return; }
      void haptics.selection();
      wiz.next();
      refreshNavBar();
    });
  navBar.add(backBtn, nextBtn);
  inner.add(navBar);

  function refreshNavBar(): void {
    const i = wiz.index();
    backBtn.text(i === 0 ? 'Cancel' : 'Back');
    if (i === wiz.count - 1) {
      nextBtn.el.style.display = 'none';
    } else {
      nextBtn.el.style.display = '';
    }
  }
  refreshNavBar();

  main.add(inner);
  root.add(main);
  return root;
}

function validate(step: number, d: Draft): boolean {
  if (step === 0) return !!d.category;
  if (step === 1) return d.budget > 0;
  return true;
}

// ---------------------------------------------------------------------------
// Step 1 — Pick a category
// ---------------------------------------------------------------------------
function buildStep1(draft: Draft, onPick: () => void): UIComponent {
  const t = i18n.t;
  const wrap = El('div').cls('col');
  wrap.add(
    El('div').style({ padding: 'var(--sp-4) var(--sp-2) 0' }).add(
      El('div').cls('title').text('What do you need help with?'),
      El('div').cls('subtitle').style({ marginTop: '4px' })
        .text('Pick one to get started.'),
    ),
  );

  const grid = El('div').cls('cat-grid').style({ padding: '0 var(--sp-2)' });
  for (const cat of CATEGORIES) {
    const label = (t.category as Record<string, string>)[cat.key];
    const tile = El('button').cls('cat-tile');
    if (draft.category === cat.key) tile.style({ outline: '2px solid var(--c-primary)' });
    tile.add(
      El('span').cls('cat-ico')
        .style({
          background: `var(--tone-${cat.tone}-soft)`,
          color: `var(--tone-${cat.tone})`,
        })
        .add(Icon(cat.icon, { size: 22 })),
      El('span').cls('cat-label').text(label),
    );
    tile.onClick(() => {
      draft.category = cat.key;
      void haptics.selection();
      // Visually mark all + advance.
      for (const child of grid.el.children) (child as HTMLElement).style.outline = '';
      tile.el.style.outline = '2px solid var(--c-primary)';
      setTimeout(onPick, 140);
    });
    grid.add(tile);
  }
  wrap.add(grid);
  return wrap;
}

// ---------------------------------------------------------------------------
// Step 2 — Describe + budget
// ---------------------------------------------------------------------------
function buildStep2(draft: Draft, _onNext: () => void): UIComponent {
  const t = i18n.t;
  const wrap = El('div').cls('col');
  wrap.add(
    El('div').style({ padding: 'var(--sp-4) var(--sp-2) 0' }).add(
      El('div').cls('title').text('Tell us the details'),
      El('div').cls('subtitle').style({ marginTop: '4px' })
        .text(draft.category ? t.post.looksLike((t.category as Record<string, string>)[draft.category]) : ''),
    ),
  );

  const form = El('div').cls('col').style({ padding: '0 var(--sp-2)', gap: 'var(--sp-3)' });

  form.add(El('span').cls('field-label').text(t.post.shortNote));
  const notes = El('textarea').cls('input textarea')
    .attr('placeholder', t.post.notePlaceholder);
  notes.el.value = draft.description;
  notes.el.addEventListener('input', () => { draft.description = (notes.el as HTMLTextAreaElement).value; });
  form.add(notes);

  form.add(El('span').cls('field-label').text(t.post.budget));
  const budgetRow = El('div').cls('row').style({ gap: 'var(--sp-2)' });
  const dec = El('button').cls('btn').style({ minWidth: '44px' }).text('−');
  const val = El('div').cls('title num center').style({ flex: '1', textAlign: 'center' }).text('₹' + draft.budget);
  const inc = El('button').cls('btn').style({ minWidth: '44px' }).text('+');
  const step = 50;
  dec.onClick(() => { draft.budget = Math.max(50, draft.budget - step); val.text('₹' + draft.budget); void haptics.selection(); });
  inc.onClick(() => { draft.budget += step; val.text('₹' + draft.budget); void haptics.selection(); });
  budgetRow.add(dec, val, inc);
  form.add(budgetRow);

  const chips = El('div').cls('row wrap').style({ gap: 'var(--sp-2)' });
  for (const v of [200, 300, 500, 800, 1200]) {
    chips.add(El('button').cls('chip').text('₹' + v).onClick(() => {
      draft.budget = v; val.text('₹' + v); void haptics.selection();
    }));
  }
  form.add(chips);

  wrap.add(form);
  return wrap;
}

// ---------------------------------------------------------------------------
// Step 3 — Confirm + post
// ---------------------------------------------------------------------------
function buildStep3(draft: Draft, onSubmit: () => Promise<void>): UIComponent {
  const t = i18n.t;
  const wrap = El('div').cls('col');
  wrap.add(
    El('div').style({ padding: 'var(--sp-4) var(--sp-2) 0' }).add(
      El('div').cls('title').text('Confirm & post'),
      El('div').cls('subtitle').style({ marginTop: '4px' }).text('Review the details before your job goes live.'),
    ),
  );

  const summary = El('div').cls('list').style({ margin: '0 var(--sp-2)' });
  const catLabel = draft.category ? (t.category as Record<string, CategoryKey | string>)[draft.category] as string : '—';
  const rows: Array<[string, string]> = [
    [t.post.category, catLabel],
    [t.post.shortNote, draft.description || '—'],
    [t.post.budget, '₹' + draft.budget],
    [t.post.where, draft.location],
  ];
  for (const [k, v] of rows) {
    summary.add(
      El('div').cls('kv').add(
        El('span').cls('k').text(k),
        El('span').cls('v truncate').text(v),
      ),
    );
  }
  wrap.add(summary);

  const submit = El('button').cls('btn primary big block').style({ margin: 'var(--sp-4) var(--sp-2) 0' })
    .text(t.post.postJobNow)
    .onClick(() => { void onSubmit(); });
  wrap.add(submit);
  return wrap;
}
