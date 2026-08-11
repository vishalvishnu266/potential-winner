/**
 * Canonical job categories — mirrors src/data/categories.ts but references
 * the framework's `IconName` (not lucide-react).
 */

import type { IconName } from '../framework/icons';

export type CategoryKey =
  | 'move' | 'clean' | 'plumb' | 'electric'
  | 'cab' | 'auto' | 'puncture' | 'mechanic'
  | 'cook' | 'other';

export type Tone =
  | 'blue' | 'green' | 'amber' | 'rose'
  | 'violet' | 'teal' | 'orange' | 'slate';

export interface CategoryMeta {
  key: CategoryKey;
  icon: IconName;
  tone: Tone;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'move',     icon: 'truck',    tone: 'orange' },
  { key: 'clean',    icon: 'brush',    tone: 'teal'   },
  { key: 'plumb',    icon: 'droplets', tone: 'blue'   },
  { key: 'electric', icon: 'zap',      tone: 'amber'  },
  { key: 'cab',      icon: 'car',      tone: 'violet' },
  { key: 'auto',     icon: 'taxi',     tone: 'amber'  },
  { key: 'puncture', icon: 'disc',     tone: 'slate'  },
  { key: 'mechanic', icon: 'wrench',   tone: 'rose'   },
  { key: 'cook',     icon: 'pot',      tone: 'green'  },
  { key: 'other',    icon: 'grid',     tone: 'slate'  },
];

export function metaOf(key: string): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function labelOf(labels: Record<CategoryKey, string>, key: string): string {
  return labels[(key as CategoryKey)] ?? labels.other;
}
