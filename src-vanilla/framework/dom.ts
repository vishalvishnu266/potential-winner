/**
 * Typesafe fluent DOM DSL.
 *
 * Design goals
 * ------------
 * 1. Pure vanilla — no framework, no virtual DOM, no JSX.
 * 2. Builder pattern — every mutator returns `this` for chaining.
 * 3. Type-safe — the tag name determines the underlying element type, so
 *    `El('input').value('x')` only compiles because `<input>` has `.value`.
 * 4. Minimal surface — one class, a few helper functions. Everything else
 *    can be added in later iterations.
 */

/** All HTML tag names supported by TypeScript's DOM lib. */
export type Tag = keyof HTMLElementTagNameMap;

/** The concrete element type produced by a given tag name. */
export type ElementOf<T extends Tag> = HTMLElementTagNameMap[T];

/** A child accepted by `.add(...)`. Strings become text nodes; nulls are skipped. */
export type Child = UIComponent<Tag> | Node | string | number | boolean | null | undefined;

/**
 * A fluent, typesafe wrapper around a single DOM element.
 *
 * The generic `T` is the tag name (e.g. `"input"`). It flows through so any
 * method that only makes sense on a specific element (like `.value()` on
 * `<input>`) is only available on the right instance.
 */
export class UIComponent<T extends Tag = Tag> {
  /** The underlying DOM node. Prefer using fluent methods over touching this. */
  public readonly el: ElementOf<T>;

  constructor(tag: T) {
    this.el = document.createElement(tag) as ElementOf<T>;
  }

  // -------------------------------------------------------------------------
  // Content
  // -------------------------------------------------------------------------

  /** Replace text content. */
  text(value: string | number): this {
    this.el.textContent = String(value);
    return this;
  }

  /** Append children (components, DOM nodes, strings, numbers). Falsy skipped. */
  add(...children: Child[]): this {
    for (const child of children) {
      if (child === null || child === undefined || child === false || child === true) continue;
      if (child instanceof UIComponent) this.el.appendChild(child.el);
      else if (child instanceof Node) this.el.appendChild(child);
      else this.el.appendChild(document.createTextNode(String(child)));
    }
    return this;
  }

  /** Remove all children. */
  clear(): this {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    return this;
  }

  /** Insert children at the *start* of this element. */
  prepend(...children: Child[]): this {
    const frag = document.createDocumentFragment();
    for (const child of children) {
      if (child === null || child === undefined || child === false || child === true) continue;
      if (child instanceof UIComponent) frag.appendChild(child.el);
      else if (child instanceof Node) frag.appendChild(child);
      else frag.appendChild(document.createTextNode(String(child)));
    }
    this.el.insertBefore(frag, this.el.firstChild);
    return this;
  }

  /** Detach this element from its parent (no-op if unmounted). */
  remove(): this {
    this.el.parentNode?.removeChild(this.el);
    return this;
  }

  /** Remove a specific child component. Safe if the child is not mounted here. */
  removeChild(child: UIComponent | Node): this {
    const node = child instanceof UIComponent ? child.el : child;
    if (node.parentNode === this.el) this.el.removeChild(node);
    return this;
  }

  /** Replace this element in the DOM with another component or node. */
  replaceWith(other: UIComponent | Node): this {
    const node = other instanceof UIComponent ? other.el : other;
    this.el.parentNode?.replaceChild(node, this.el);
    return this;
  }

  /** Replace all children with the given ones (typed wrapper). */
  replaceChildren(...children: Child[]): this {
    this.clear();
    return this.add(...children);
  }

  /** Insert `child` right before `ref`. `ref` must already be a child of this element. */
  insertBefore(child: UIComponent | Node, ref: UIComponent | Node): this {
    const c = child instanceof UIComponent ? child.el : child;
    const r = ref instanceof UIComponent ? ref.el : ref;
    if (r.parentNode !== this.el) throw new Error('insertBefore(): ref is not a child of this element');
    this.el.insertBefore(c, r);
    return this;
  }

  /** Insert `child` right after `ref`. `ref` must already be a child of this element. */
  insertAfter(child: UIComponent | Node, ref: UIComponent | Node): this {
    const c = child instanceof UIComponent ? child.el : child;
    const r = ref instanceof UIComponent ? ref.el : ref;
    if (r.parentNode !== this.el) throw new Error('insertAfter(): ref is not a child of this element');
    this.el.insertBefore(c, r.nextSibling);
    return this;
  }

  /** Toggle presence in the DOM without discarding the element. */
  visible(flag: boolean): this {
    this.el.style.display = flag ? '' : 'none';
    return this;
  }

  /**
   * Run `fn` after the element is inserted into the DOM. Returns the
   * receiver so it stays chainable. Falls back to a microtask if the
   * element is already connected.
   */
  onMount(fn: (el: ElementOf<T>) => void | (() => void)): this {
    const run = (): void => {
      const cleanup = fn(this.el);
      if (typeof cleanup === 'function') {
        this._cleanups.push(cleanup);
      }
    };
    if (this.el.isConnected) queueMicrotask(run);
    else {
      // Use a MutationObserver on document.body to detect first insertion.
      const mo = new MutationObserver(() => {
        if (this.el.isConnected) { mo.disconnect(); run(); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      this._cleanups.push(() => mo.disconnect());
    }
    return this;
  }

  /** Register a cleanup to run when `.dispose()` is invoked. */
  onUnmount(fn: () => void): this {
    this._cleanups.push(fn);
    return this;
  }

  /** Run all registered cleanups. Idempotent. */
  dispose(): void {
    while (this._cleanups.length) {
      const fn = this._cleanups.pop();
      try { fn?.(); } catch { /* noop */ }
    }
  }

  private _cleanups: Array<() => void> = [];

  // -------------------------------------------------------------------------
  // Attributes / classes / styles
  // -------------------------------------------------------------------------

  id(value: string): this {
    this.el.id = value;
    return this;
  }

  /** Space-separated class string, or an array of class names. */
  cls(value: string | string[]): this {
    const list = Array.isArray(value) ? value : value.split(/\s+/);
    for (const c of list) if (c) this.el.classList.add(c);
    return this;
  }

  /** Conditional class helper. */
  clsIf(cond: boolean, value: string | string[]): this {
    return cond ? this.cls(value) : this;
  }

  attr(name: string, value: string | number | boolean): this {
    if (value === false) this.el.removeAttribute(name);
    else this.el.setAttribute(name, value === true ? '' : String(value));
    return this;
  }

  style(styles: Partial<CSSStyleDeclaration>): this {
    Object.assign(this.el.style, styles);
    return this;
  }

  // -------------------------------------------------------------------------
  // Element-specific helpers (typesafe via conditional constraints)
  // -------------------------------------------------------------------------

  /**
   * Set the value of an `<input>` / `<textarea>` / `<select>`.
   * The `this` constraint below means this only compiles when the receiver is
   * one of those element types.
   */
  value<Self extends UIComponent<'input' | 'textarea' | 'select'>>(
    this: Self,
    val: string | number,
  ): Self {
    (this.el as HTMLInputElement).value = String(val);
    return this;
  }

  placeholder<Self extends UIComponent<'input' | 'textarea'>>(this: Self, val: string): Self {
    (this.el as HTMLInputElement).placeholder = val;
    return this;
  }

  href<Self extends UIComponent<'a'>>(this: Self, url: string): Self {
    (this.el as HTMLAnchorElement).href = url;
    return this;
  }

  type<Self extends UIComponent<'input' | 'button'>>(this: Self, val: string): Self {
    (this.el as HTMLInputElement).type = val;
    return this;
  }

  disabled<Self extends UIComponent<'input' | 'button' | 'textarea' | 'select'>>(
    this: Self,
    flag = true,
  ): Self {
    (this.el as HTMLButtonElement).disabled = flag;
    return this;
  }

  // -------------------------------------------------------------------------
  // Events — strongly typed via HTMLElementEventMap
  // -------------------------------------------------------------------------

  on<K extends keyof HTMLElementEventMap>(
    eventName: K,
    handler: (ev: HTMLElementEventMap[K]) => void,
  ): this {
    this.el.addEventListener(eventName, handler as EventListener);
    return this;
  }

  onClick(handler: (ev: MouseEvent) => void): this {
    return this.on('click', handler);
  }

  /** Convenience: input event with the current string value pre-extracted. */
  onInput(handler: (value: string) => void): this {
    this.el.addEventListener('input', (e) => {
      handler((e.target as HTMLInputElement).value);
    });
    return this;
  }

  /** Convenience: submit event with `preventDefault()` already called. */
  onSubmit(handler: (ev: SubmitEvent) => void): this {
    this.el.addEventListener('submit', (e) => {
      e.preventDefault();
      handler(e as SubmitEvent);
    });
    return this;
  }

  // -------------------------------------------------------------------------
  // Mounting
  // -------------------------------------------------------------------------

  /** Mount into a host element, replacing existing children. */
  mount(host: HTMLElement | string): this {
    const target = typeof host === 'string' ? document.querySelector(host) : host;
    if (!target) throw new Error(`mount(): host not found: ${String(host)}`);
    while (target.firstChild) target.removeChild(target.firstChild);
    target.appendChild(this.el);
    return this;
  }
}

// ---------------------------------------------------------------------------
// Factory helpers — the fluent API entrypoints
// ---------------------------------------------------------------------------

/** Generic factory: `El('div').cls('card')`. Preserves the tag type. */
export function El<T extends Tag>(tag: T): UIComponent<T> {
  return new UIComponent(tag);
}

/**
 * Conditional-render helper. Returns the built component when `cond` is
 * truthy, otherwise `null` (which `.add(...)` will silently skip).
 */
export function When<T extends Tag>(
  cond: unknown,
  build: () => UIComponent<T>,
): UIComponent<T> | null {
  return cond ? build() : null;
}

/**
 * List-render helper. Maps an iterable to components; returns an array that
 * `.add(...items)` accepts via spread.
 */
export function Each<Item, T extends Tag>(
  items: Iterable<Item>,
  build: (item: Item, index: number) => UIComponent<T>,
): UIComponent<T>[] {
  const out: UIComponent<T>[] = [];
  let i = 0;
  for (const item of items) out.push(build(item, i++));
  return out;
}
