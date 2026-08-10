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
import {
  Sofa, Sparkles, Droplets, Zap, Car, Bike, CircleDot,
  Wrench, Utensils, MoreHorizontal, type LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  key: CategoryKey;
  Icon: LucideIcon;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal' | 'orange' | 'slate';
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'move',     Icon: Sofa,             tone: 'orange' },
  { key: 'clean',    Icon: Sparkles,         tone: 'teal'   },
  { key: 'plumb',    Icon: Droplets,         tone: 'blue'   },
  { key: 'electric', Icon: Zap,              tone: 'amber'  },
  { key: 'cab',      Icon: Car,              tone: 'violet' },
  { key: 'auto',     Icon: Bike,             tone: 'amber'  },
  { key: 'puncture', Icon: CircleDot,        tone: 'slate'  },
  { key: 'mechanic', Icon: Wrench,           tone: 'rose'   },
  { key: 'cook',     Icon: Utensils,         tone: 'green'  },
  { key: 'other',    Icon: MoreHorizontal,   tone: 'slate'  },
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
