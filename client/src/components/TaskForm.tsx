import { useState } from 'react'
import type { Task } from '../types'

interface Props {
  onAddTask: (title: string, category: Task['category']) => Promise<boolean>
}

export function TaskForm({ onAddTask }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Task['category']>('Work')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    const ok = await onAddTask(title.trim(), category)
    setSubmitting(false)
    if (ok) setTitle('')
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Add a new task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input-title"
        disabled={submitting}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Task['category'])}
        className="select-category"
        disabled={submitting}
      >
        <option value="Work">Work</option>
        <option value="Personal">Personal</option>
        <option value="Urgent">Urgent</option>
      </select>
      <button type="submit" className="btn-add" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Task'}
      </button>
    </form>
  )
}
