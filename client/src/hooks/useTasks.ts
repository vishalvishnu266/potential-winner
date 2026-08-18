import { useState, useEffect } from 'react'
import type { Task, FilterStatus } from '../types'
import { taskApi } from '../api/taskApi'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Clear transient error after 4 seconds
  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(null), 4000)
    return () => clearTimeout(t)
  }, [actionError])

  // Load tasks on mount
  useEffect(() => {
    setLoading(true)
    taskApi.getAll().then((res) => {
      console.log('[useTasks] getAll response:', res)
      if (res.success && res.data) {
        setTasks(res.data)
      } else {
        setActionError(res.error ?? 'Failed to load tasks')
      }
      setLoading(false)
    })
  }, [])

  const addTask = async (title: string, category: Task['category']) => {
    const res = await taskApi.create(title, category)
    console.log('[useTasks] create response:', res)
    if (res.success && res.data) {
      setTasks((prev) => [res.data!, ...prev])
    } else {
      setActionError(res.error ?? 'Failed to create task')
    }
    return res.success
  }

  const toggleComplete = async (id: string) => {
    const res = await taskApi.toggle(id)
    console.log('[useTasks] toggle response:', res)
    if (res.success && res.data) {
      // State updated ONLY on server success
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data! : t)))
    } else {
      setActionError(res.error ?? 'Failed to update task')
    }
  }

  const editTask = async (id: string, newTitle: string) => {
    const res = await taskApi.edit(id, newTitle)
    console.log('[useTasks] edit response:', res)
    if (res.success && res.data) {
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data! : t)))
    } else {
      setActionError(res.error ?? 'Failed to edit task')
    }
    return res.success
  }

  const deleteTask = async (id: string) => {
    const res = await taskApi.delete(id)
    console.log('[useTasks] delete response:', res)
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } else {
      setActionError(res.error ?? 'Failed to delete task')
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  return {
    tasks,
    filteredTasks,
    filter,
    setFilter,
    loading,
    actionError,
    addTask,
    toggleComplete,
    editTask,
    deleteTask,
  }
}
