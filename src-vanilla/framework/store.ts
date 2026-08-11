/**
 * Tiny reactive store — observer pattern, fully typed.
 *
 * Usage:
 *   const counter = new Store({ count: 0 });
 *   counter.subscribe((s) => console.log(s.count));
 *   counter.update({ count: counter.state.count + 1 });
 */

export type Listener<S> = (state: Readonly<S>) => void;

export class Store<S extends object> {
  private _state: S;
  private readonly listeners = new Set<Listener<S>>();

  constructor(initial: S) {
    this._state = initial;
  }

  /** Immutable snapshot of the current state. */
  get state(): Readonly<S> {
    return this._state;
  }

  /** Shallow-merge a partial patch and notify subscribers. */
  update(patch: Partial<S>): void {
    this._state = { ...this._state, ...patch };
    this.notify();
  }

  /** Replace the entire state with the result of `producer(prev)`. */
  set(producer: (prev: Readonly<S>) => S): void {
    this._state = producer(this._state);
    this.notify();
  }

  subscribe(listener: Listener<S>): () => void {
    this.listeners.add(listener);
    // Fire once immediately so subscribers can render initial state.
    listener(this._state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l(this._state);
  }
}
