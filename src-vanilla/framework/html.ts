/**
 * html`` — a tiny tagged-template DOM builder.
 *
 * The proposed authoring standard for the vanilla codebase. Components and
 * views should read like markup, not like nested function calls:
 *
 *   export function ActionRow({ title, onClick }: Props): HTMLElement {
 *     return el(html`
 *       <button class="action-row" @click=${onClick}>
 *         <span class="action-row__title">${title}</span>
 *       </button>
 *     `);
 *   }
 *
 * Design rules (deliberately small so the mental model stays simple):
 *
 *   - `${'text'}` / `${123}`         → text node (auto-escaped)
 *   - `${node}` / `${[nodes]}`       → inserted as-is (Node | UIComponent | HTMLElement[])
 *   - `${cond && html`...`}`         → conditional block (falsy skipped)
 *   - `attr=${value}`                → attribute (stringified)
 *   - `?attr=${bool}`                → boolean attribute (added / removed)
 *   - `.prop=${value}`               → JS property (e.g. `.value=${x}` on <input>)
 *   - `@event=${handler}`            → addEventListener('event', handler)
 *
 * Returns a `DocumentFragment`. Most components should return a single root
 * element — use the `el()` helper for that:
 *
 *   const root = el(html`<div class="card">…</div>`);
 *
 * No Shadow DOM, no VDOM, no framework. Global styles in
 * `src-vanilla/styles/*.css` continue to apply.
 */

import { UIComponent } from './dom';

// --- Interpolation marker --------------------------------------------------
// We swap each ${…} slot for a stable marker before handing the joined string
// to the browser HTML parser, then walk the resulting fragment and hydrate
// the markers back into real values (attributes, listeners, children).

const MARKER = '\uE000tf-slot-';
const MARKER_RX = /\uE000tf-slot-(\d+)\uE001/g;
const MARKER_END = '\uE001';

type SlotValue = unknown;

/** Anything the helper knows how to insert as a child. */
type ChildLike =
  | string
  | number
  | boolean
  | null
  | undefined
  | Node
  | UIComponent
  | DocumentFragment
  | ChildLike[];

function isUIComponent(v: unknown): v is UIComponent {
  return v instanceof UIComponent;
}

function escapeText(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;',
  );
}

function toNode(value: ChildLike): Node | null {
  if (value === null || value === undefined || value === false || value === true) {
    return null;
  }
  if (value instanceof Node) return value;
  if (isUIComponent(value)) return value.el;
  if (Array.isArray(value)) {
    const frag = document.createDocumentFragment();
    for (const v of value) {
      const n = toNode(v);
      if (n) frag.appendChild(n);
    }
    return frag;
  }
  // Primitive → text node.
  return document.createTextNode(String(value));
}

/**
 * Tagged-template DOM builder. See file header for the full contract.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: SlotValue[]
): DocumentFragment {
  // 1. Weave the template with unique markers for each interpolation.
  let source = '';
  for (let i = 0; i < strings.length; i++) {
    source += strings[i];
    if (i < values.length) source += `${MARKER}${i}${MARKER_END}`;
  }

  // 2. Parse via <template> so <tr>, <td>, etc. don't get eaten.
  const tpl = document.createElement('template');
  tpl.innerHTML = source;
  const frag = tpl.content;

  // 3. Hydrate every element: rewrite attributes containing markers into
  //    real attributes / listeners / properties.
  const walker = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  let cur: Node | null = walker.currentNode;
  while ((cur = walker.nextNode())) elements.push(cur as Element);

  for (const el of elements) hydrateElement(el, values);

  // 4. Hydrate text nodes containing markers into real child nodes.
  hydrateTextNodes(frag, values);

  return frag;
}

function hydrateElement(el: Element, values: SlotValue[]): void {
  // Copy the attribute list because we may mutate it while iterating.
  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    const raw = attr.value;
    const name = attr.name;

    // Only touch attributes whose value contains a marker.
    if (!MARKER_RX.test(raw)) {
      // reset lastIndex because we used the global regex in a test
      MARKER_RX.lastIndex = 0;
      continue;
    }
    MARKER_RX.lastIndex = 0;

    // Sigils on the attribute NAME control how the value binds.
    if (name.startsWith('@')) {
      // Event listener: @click=${fn}
      const eventName = name.slice(1);
      const handler = singleSlotValue(raw, values);
      el.removeAttribute(name);
      if (typeof handler === 'function') {
        el.addEventListener(eventName, handler as EventListener);
      }
      continue;
    }

    if (name.startsWith('?')) {
      // Boolean attribute: ?disabled=${bool}
      const realName = name.slice(1);
      const val = singleSlotValue(raw, values);
      el.removeAttribute(name);
      if (val) el.setAttribute(realName, '');
      else el.removeAttribute(realName);
      continue;
    }

    if (name.startsWith('.')) {
      // JS property: .value=${x}
      const propName = name.slice(1);
      const val = singleSlotValue(raw, values);
      el.removeAttribute(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any)[propName] = val;
      continue;
    }

    // Normal attribute: may contain multiple slots interleaved with static
    // text (e.g. class="btn ${variant} ${size}").
    const resolved = raw.replace(MARKER_RX, (_m, idx) => {
      const v = values[Number(idx)];
      return v === null || v === undefined || v === false ? '' : String(v);
    });
    el.setAttribute(name, resolved);
  }
}

/** Extract a single interpolation from an attribute value, or null. */
function singleSlotValue(raw: string, values: SlotValue[]): unknown {
  const m = /^\uE000tf-slot-(\d+)\uE001$/.exec(raw);
  if (m) return values[Number(m[1])];
  // Mixed (`foo${x}bar`) — fall back to stringified concat.
  return raw.replace(MARKER_RX, (_m, idx) => {
    const v = values[Number(idx)];
    return v === null || v === undefined || v === false ? '' : String(v);
  });
}

/** Walk text nodes and replace markers with real Nodes. */
function hydrateTextNodes(root: DocumentFragment | Element, values: SlotValue[]): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let cur: Node | null = walker.currentNode;
  while ((cur = walker.nextNode())) texts.push(cur as Text);

  for (const textNode of texts) {
    const data = textNode.data;
    if (!data.includes(MARKER)) continue;

    const parent = textNode.parentNode;
    if (!parent) continue;

    // Split "before ${a} middle ${b} after" into a sequence of static text
    // pieces and slot indices, then replace the original text node.
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    MARKER_RX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MARKER_RX.exec(data))) {
      const [full, idxStr] = m;
      const start = m.index;
      if (start > lastIndex) {
        frag.appendChild(document.createTextNode(data.slice(lastIndex, start)));
      }
      const slotValue = values[Number(idxStr)] as ChildLike;
      const node = toNode(slotValue);
      if (node) frag.appendChild(node);
      lastIndex = start + full.length;
    }
    if (lastIndex < data.length) {
      frag.appendChild(document.createTextNode(data.slice(lastIndex)));
    }
    parent.replaceChild(frag, textNode);
  }
}

// --- Public helpers --------------------------------------------------------

/**
 * Extract the first (and by convention, only) element from a fragment.
 * Use this when a component returns a single root element:
 *
 *   return el(html`<div class="card">…</div>`);
 */
export function el<T extends HTMLElement = HTMLElement>(frag: DocumentFragment): T {
  const first = frag.firstElementChild;
  if (!first) throw new Error('el(): template produced no elements');
  return first as T;
}

/**
 * Escape a string for safe interpolation into an html`` attribute or text
 * slot. Text slots are auto-escaped, so this is only needed when composing
 * raw HTML strings (rare — prefer nested html`` blocks instead).
 */
export const escape = escapeText;
