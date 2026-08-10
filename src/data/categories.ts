/**
 * Canonical set of job categories.  Keeping them in one file so every
 * screen (home, post, filter, feed) uses the exact same slug + emoji +
 * label + colour tone.
 */

export type CategoryKey =
  | 'move' | 'clean' | 'plumb' | 'electric'
  | 'cab' | 'auto' | 'puncture' | 'mechanic'
  | 'cook' | 'other';

/**
 * Category metadata contains only *locale-independent* fields (icon,
 * colour tone).  The human label is looked up per-render via the i18n
 * bundle (`t.category[key]`) — see `labelOf()` for a helper.
 */
/*
 * Icon-choice rationale
 * ---------------------
 * Every icon here is picked to be *self-descriptive* at a glance —
 * i.e. a user seeing only the icon (no label, no colour) should be
 * able to guess the category.  Ambiguous alternatives that we
 * intentionally avoided:
 *   • Sofa            → looks like furniture, not the *action* of shifting.
 *                       Truck reads as "moving" globally.
 *   • Sparkles        → reads as "AI / magic", not cleaning.
 *                       Brush is the universal cleaning motif.
 *   • Bike            → motorcycle, not an auto-rickshaw.
 *                       CarTaxiFront is the closest 3-wheeler feel + says "taxi".
 *   • CircleDot       → opaque abstract shape.
 *                       Disc3 shows a tyre-like disc for puncture.
 *   • Utensils        → cutlery reads as "dining", not "cooking".
 *                       CookingPot is literally a pot on a stove.
 *   • MoreHorizontal  → three dots reads as "menu", not "more categories".
 *                       Grid3x3 clearly shows "a group of other things".
 */
import {
  Truck, Brush, Droplets, Zap, Car, CarTaxiFront, Disc3,
  Wrench, CookingPot, Grid3x3, type LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  key: CategoryKey;
  Icon: LucideIcon;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal' | 'orange' | 'slate';
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'move',     Icon: Truck,        tone: 'orange' },  // moving truck
  { key: 'clean',    Icon: Brush,        tone: 'teal'   },  // cleaning brush
  { key: 'plumb',    Icon: Droplets,     tone: 'blue'   },  // water drops
  { key: 'electric', Icon: Zap,          tone: 'amber'  },  // lightning bolt
  { key: 'cab',      Icon: Car,          tone: 'violet' },  // car
  { key: 'auto',     Icon: CarTaxiFront, tone: 'amber'  },  // taxi (auto-rickshaw stand-in)
  { key: 'puncture', Icon: Disc3,        tone: 'slate'  },  // tyre disc
  { key: 'mechanic', Icon: Wrench,       tone: 'rose'   },  // spanner
  { key: 'cook',     Icon: CookingPot,   tone: 'green'  },  // pot on stove
  { key: 'other',    Icon: Grid3x3,      tone: 'slate'  },  // grid of "other things"
];

export function metaOf(key: string): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

/**
 * Look up a localised label for a category key.  Pass in `t.category`
 * (the object obtained from `useT()`).  Kept as a helper so calls stay
 * short: `labelOf(t.category, key)`.
 */
export function labelOf(
  labels: Record<CategoryKey, string>,
  key: string,
): string {
  return labels[(key as CategoryKey)] ?? labels.other;
}

// ---------------------------------------------------------------------------
// Keyword classifier — used when a user posts a job as free text / voice.
// ---------------------------------------------------------------------------
// One flat dictionary of {keyword → category}.  Multilingual keywords
// (Hindi transliteration, common Indian English) are welcome — just add
// them here.  The classifier picks the category with the most hits.
// ---------------------------------------------------------------------------

const KEYWORDS: Record<CategoryKey, string[]> = {
  move:     ['move', 'shift', 'furniture', 'sofa', 'bed', 'shifting', 'khisak', 'uthana'],
  clean:    ['clean', 'wipe', 'mop', 'sweep', 'safai', 'jhaadu', 'jhadu', 'dusting'],
  plumb:    ['tap', 'leak', 'pipe', 'nal', 'toilet', 'plumber', 'plumbing', 'flush'],
  electric: ['light', 'wire', 'fan', 'switch', 'bulb', 'current', 'bijli', 'electric'],
  cab:      ['cab', 'car', 'drop', 'airport', 'taxi', 'ola', 'uber'],
  auto:     ['auto', 'rickshaw', 'tuktuk', 'tuk-tuk'],
  puncture: ['puncture', 'tyre', 'tire', 'flat', 'pancher'],
  mechanic: ['mechanic', 'engine', 'bike repair', 'car repair', 'garage'],
  cook:     ['cook', 'chef', 'khaana', 'roti', 'tiffin', 'meal'],
  other:    [],
};

/**
 * Very small keyword-count classifier — 0 deps, ~1 ms on any device.
 * Returns 'other' when nothing matches.
 */
export function classify(text: string): CategoryKey {
  const t = text.toLowerCase();
  let best: CategoryKey = 'other';
  let bestScore = 0;
  for (const key of Object.keys(KEYWORDS) as CategoryKey[]) {
    let score = 0;
    for (const w of KEYWORDS[key]) {
      if (w && t.includes(w)) score += 1;
    }
    if (score > bestScore) { best = key; bestScore = score; }
  }
  return best;
}
