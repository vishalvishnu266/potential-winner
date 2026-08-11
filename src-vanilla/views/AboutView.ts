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
  Button,
  Span,
  HorizontalLayout,
} from '../framework';
import { OtaController } from '../controllers';

export function AboutView(): UIComponent {
  const ota = OtaController.snapshot();

  return VerticalLayout().add(
    Card().add(
      H1('About'),
      Paragraph('Minimal typesafe fluent UI DSL for Capacitor apps.'),
      H2('MVC layers'),
      UList().add(
        ListItem().add('framework/  — UIComponent, tags, Store, Router'),
        ListItem().add('services/   — http, storage, db, ota (only I/O)'),
        ListItem().add('controllers/— orchestrate services + store'),
        ListItem().add('views/      — read state, call controllers'),
      ),
    ),
    Card().add(
      H2('OTA'),
      Paragraph(`Bundle version: ${ota.version}`),
      Paragraph(`Platform: ${ota.platform}`),
      Paragraph(`Status: ${ota.statusMessage}`),
      HorizontalLayout().add(
        Button('Check for update').onClick(() => OtaController.checkNow()),
      ),
      Span(''),
      Paragraph('').add(Anchor('← Back to Home', '#/')),
    ),
  );
}
