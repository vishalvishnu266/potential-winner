# src-vanilla — Fluent Builder Framework (experimental)

A tiny, typesafe, Vaadin-flavored UI library for building the Capacitor app
without any external framework. Lives alongside the React app; nothing here
imports React.

## Run it

```bash
npm run dev
# then open: http://localhost:5173/vanilla.html
```

## Layout

```
src-vanilla/
├── framework/       # The library itself (dom, tags, store, router)
│   ├── dom.ts       # UIComponent<T> — typesafe fluent wrapper
│   ├── tags.ts      # Vaadin-style factories (H1, Button, TextField, ...)
│   ├── store.ts     # Reactive Store<S> with subscribe/update
│   ├── router.ts    # Hash router
│   └── index.ts     # Barrel export
├── views/           # Route views (pure functions returning UIComponent)
│   ├── HomeView.ts
│   └── AboutView.ts
├── state.ts         # Global appStore
├── shell.ts         # Persistent nav-bar chrome
└── main.ts          # Entrypoint: wires router + store + views
```

## The DSL in 30 seconds

```ts
import { VerticalLayout, H1, PrimaryButton, TextField, El } from './framework';

VerticalLayout().cls('card').add(
  H1('Hello'),
  TextField('type here').onInput((v) => console.log(v)),
  PrimaryButton('Save').onClick(() => alert('saved')),
).mount('#app');
```

- Every builder method returns `this` → infinitely chainable.
- `El('input').value('x')` compiles; `El('div').value('x')` is a type error.
- No JSX, no transpiler magic — just TypeScript + DOM.

## Iteration roadmap

- [ ] Path params in `Router` (`/job/:id` → context)
- [ ] `onMount` / `onUnmount` lifecycle hooks on `UIComponent`
- [ ] Two-way binding helper: `TextField().bind(store, 'draft')`
- [ ] Slice stores + selectors (avoid full re-render)
- [ ] Wrap Capacitor plugins as services (Camera, Geolocation, ...)
- [ ] Port one real page from `src/pages/` as proof of concept
