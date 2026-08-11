import {
  Card,
  H1,
  H2,
  Paragraph,
  UList,
  ListItem,
  VerticalLayout,
  Anchor,
  UIComponent,
} from '../framework';

export function AboutView(): UIComponent {
  return VerticalLayout().add(
    Card().add(
      H1('About this framework'),
      Paragraph('A minimal, typesafe fluent UI DSL for Capacitor apps.'),
      H2('Principles'),
      UList().add(
        ListItem().add('Pure vanilla — no virtual DOM, no framework'),
        ListItem().add('Builder pattern — every call returns `this`'),
        ListItem().add('Type-safe — tag names carry through generics'),
        ListItem().add('MVC — views read a Store, controllers mutate it'),
        ListItem().add('Grow it feature-by-feature per iteration'),
      ),
      H2('Next up'),
      UList().add(
        ListItem().add('Path params in the router (e.g. /job/:id)'),
        ListItem().add('Component lifecycle hooks (onMount/onUnmount)'),
        ListItem().add('Two-way binding helpers (input.bind(store, "field"))'),
        ListItem().add('Wrap Capacitor plugins as services'),
      ),
      Paragraph('Return to the ').add(Anchor('home', '#/').cls('')),
    ),
  );
}
