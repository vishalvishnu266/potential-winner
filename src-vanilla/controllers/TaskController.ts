/**
 * TaskController — orchestrates between services (storage/http) and the
 * store. Views MUST go through this controller instead of mutating the
 * store directly or calling services.
 */

import { appStore, Task } from '../state';
import { storage } from '../services';

const STORAGE_KEY = 'vanilla:tasks';

async function persist(): Promise<void> {
  await storage.set(STORAGE_KEY, appStore.state.tasks);
}

export const TaskController = {
  /** Load persisted tasks (called once at boot). */
  async load(): Promise<void> {
    const saved = await storage.get<Task[]>(STORAGE_KEY);
    if (saved && Array.isArray(saved)) appStore.update({ tasks: saved });
  },

  setDraft(value: string): void {
    appStore.update({ draft: value });
  },

  async create(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    const task: Task = { id: Date.now(), name: trimmed };
    appStore.update({ tasks: [task, ...appStore.state.tasks], draft: '' });
    await persist();
  },

  async remove(id: number): Promise<void> {
    appStore.update({ tasks: appStore.state.tasks.filter((t) => t.id !== id) });
    await persist();
  },

  async reset(): Promise<void> {
    appStore.update({ tasks: [], draft: '' });
    await persist();
  },
};
