import { useState } from 'react'
import type { Task } from '../types'

interface Props {
  task: Task
  onToggleComplete: (id: string) => Promise<void>
  onDeleteTask: (id: string) => Promise<void>
  onEditTask: (id: string, newTitle: string) => Promise<boolean>
}

export function TaskItem({ task, onToggleComplete, onDeleteTask, onEditTask }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setBusy(true)
    const ok = await onEditTask(task.id, editTitle.trim())
    setBusy(false)
    if (ok) setIsEditing(false)
  }

  const handleToggle = async () => {
    setBusy(true)
    await onToggleComplete(task.id)
    setBusy(false)
  }

  const handleDelete = async () => {
    setBusy(true)
    await onDeleteTask(task.id)
    // No setBusy(false) — component unmounts on success
  }

  return (
    <li className={`task-item ${task.completed ? 'completed' : ''} ${busy ? 'busy' : ''}`}>
      <div className="task-left">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggle}
          disabled={busy}
        />
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-edit"
            disabled={busy}
            autoFocus
          />
        ) : (
          <span className="task-title">{task.title}</span>
        )}
        <span className={`badge badge-${task.category.toLowerCase()}`}>{task.category}</span>
      </div>

      <div className="task-actions">
        {busy && <span className="spinner" title="Saving…" />}
        {isEditing ? (
          <button type="button" onClick={handleSave} className="btn-save" disabled={busy}>
            Save
          </button>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)} className="btn-edit" disabled={busy}>
            Edit
          </button>
        )}
        <button type="button" onClick={handleDelete} className="btn-delete" disabled={busy}>
          Delete
        </button>
      </div>
    </li>
  )
}
