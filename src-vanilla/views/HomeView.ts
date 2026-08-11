/**
 * Sample view — demonstrates the fluent builder DSL with a reactive Store.
 *
 * A "view" is a pure function returning a `UIComponent`. It reads state from
 * the store and re-renders itself when the store changes by asking the shell
 * (router) to re-render the current route.
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

export function HomeView(): UIComponent {
  const state = appStore.state;

  const draftInput = TextField('Add a new task...').value(state.draft).onInput((v) =>
    appStore.update({ draft: v }),
  );

  return VerticalLayout().add(
    Card().add(
      H1('DailyGig — Vanilla Framework'),
      Muted('A tiny, typesafe, builder-pattern UI library. No React, no JSX.'),
    ),

    Card().add(
      FormLayout()
        .onSubmit(() => {
          const name = appStore.state.draft.trim();
          if (!name) return;
          appStore.update({
            tasks: [{ id: Date.now(), name }, ...appStore.state.tasks],
            draft: '',
          });
        })
        .add(
          HorizontalLayout().add(
            draftInput,
            PrimaryButton('Add').attr('type', 'submit'),
          ),
        ),
      When(state.tasks.length === 0, () => Muted('No tasks yet — add one above.')),
      UList().add(
        ...Each(state.tasks, (task) =>
          ListItem().add(
            HorizontalLayout().add(
              `#${task.id} — ${task.name}`,
              DangerButton('Delete').onClick(() =>
                appStore.update({ tasks: appStore.state.tasks.filter((t) => t.id !== task.id) }),
              ),
            ),
          ),
        ),
      ),
    ),

    Card().add(
      Paragraph(`Tasks in store: ${state.tasks.length}`),
      Button('Reset').onClick(() => appStore.update({ tasks: [], draft: '' })),
    ),
  );
}
