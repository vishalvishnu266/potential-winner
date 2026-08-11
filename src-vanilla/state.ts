/** Global application state. Keep this small; add slices as the app grows. */

import { Store } from './framework';

export interface Task {
  id: number;
  name: string;
}

export interface AppState {
  tasks: Task[];
  draft: string;
}

export const appStore = new Store<AppState>({
  tasks: [
    { id: 1, name: 'Try the fluent DSL' },
    { id: 2, name: 'Read src-vanilla/framework/dom.ts' },
  ],
  draft: '',
});
