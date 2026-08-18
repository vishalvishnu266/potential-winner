import type { Task, ApiResponse } from '../types'

const BASE_URL = '/api/tasks'

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json: ApiResponse<T> = await res.json()
  return json
}

export const taskApi = {
  getAll: () =>
    request<Task[]>(BASE_URL),

  create: (title: string, category: Task['category']) =>
    request<Task>(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({ title, category }),
    }),

  toggle: (id: string) =>
    request<Task>(`${BASE_URL}/${id}/toggle`, { method: 'PATCH' }),

  edit: (id: string, title: string) =>
    request<Task>(`${BASE_URL}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  delete: (id: string) =>
    request<null>(`${BASE_URL}/${id}`, { method: 'DELETE' }),
}
