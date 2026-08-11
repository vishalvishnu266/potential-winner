/**
 * HomeView — pure View.
 *
 * Rules enforced here:
 *   - Reads state ONLY from `appStore.state`.
 *   - Mutates state ONLY by calling controller methods.
 *   - Never imports services, storage, fetch, or Capacitor plugins.
 */

import {
  Card,
  H1,
  Paragraph,
  Muted,
  VerticalLayout,
  HorizontalLayout,
  PrimaryButton,
  Button,
  TextField,
  FormLayout,
  UList,
  ListItem,
  DangerButton,
  UIComponent,
  Each,
  When,
} from '../framework';
import { appStore } from '../state';
import { TaskController } from '../controllers';

export function HomeView(): UIComponent {
  const state = appStore.state;

  return VerticalLayout().add(
    Card().add(
      H1('DailyGig — Vanilla Framework'),
      Muted('Typesafe fluent DSL. No React, no JSX. MVC with a data-service layer.'),
    ),

    Card().add(
      FormLayout()
        .onSubmit(() => TaskController.create(appStore.state.draft))
        .add(
          HorizontalLayout().add(
            TextField('Add a new task...')
              .value(state.draft)
              .onInput((v) => TaskController.setDraft(v)),
            PrimaryButton('Add').attr('type', 'submit'),
          ),
        ),
      When(state.tasks.length === 0, () => Muted('No tasks yet — add one above.')),
      UList().add(
        ...Each(state.tasks, (task) =>
          ListItem().add(
            HorizontalLayout().add(
              `#${task.id} — ${task.name}`,
              DangerButton('Delete').onClick(() => TaskController.remove(task.id)),
            ),
          ),
        ),
      ),
    ),

    Card().add(
      Paragraph(`Tasks in store: ${state.tasks.length}`),
      Button('Reset').onClick(() => TaskController.reset()),
    ),
  );
}
