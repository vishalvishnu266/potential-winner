import { Router, Request, Response } from 'express'
import { tasks } from './db'
import { simulateDelay, maybeFailRandomly } from './simulate'
import { Task, ApiResponse } from './types'

const router = Router()

// GET /api/tasks — fetch all tasks
router.get('/', async (_req: Request, res: Response<ApiResponse<Task[]>>) => {
  await simulateDelay()
  try {
    maybeFailRandomly()
    console.log('[GET /api/tasks] ✅ Returning', tasks.length, 'tasks')
    res.json({ success: true, data: tasks })
  } catch (err: any) {
    console.error('[GET /api/tasks] ❌', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/tasks — create a task
router.post('/', async (req: Request, res: Response<ApiResponse<Task>>) => {
  await simulateDelay()
  try {
    maybeFailRandomly()
    const { title, category } = req.body as Pick<Task, 'title' | 'category'>
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      category,
      completed: false,
    }
    tasks.push(newTask)
    console.log('[POST /api/tasks] ✅ Created task:', newTask)
    res.status(201).json({ success: true, data: newTask })
  } catch (err: any) {
    console.error('[POST /api/tasks] ❌', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/tasks/:id/toggle — toggle completed
router.patch('/:id/toggle', async (req: Request, res: Response<ApiResponse<Task>>) => {
  await simulateDelay()
  try {
    maybeFailRandomly()
    const task = tasks.find((t) => t.id === req.params.id)
    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' })
      return
    }
    task.completed = !task.completed
    console.log(`[PATCH /api/tasks/${req.params.id}/toggle] ✅ completed=${task.completed}`)
    res.json({ success: true, data: task })
  } catch (err: any) {
    console.error(`[PATCH /api/tasks/${req.params.id}/toggle] ❌`, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/tasks/:id — edit title
router.patch('/:id', async (req: Request, res: Response<ApiResponse<Task>>) => {
  await simulateDelay()
  try {
    maybeFailRandomly()
    const task = tasks.find((t) => t.id === req.params.id)
    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' })
      return
    }
    task.title = req.body.title ?? task.title
    console.log(`[PATCH /api/tasks/${req.params.id}] ✅ title="${task.title}"`)
    res.json({ success: true, data: task })
  } catch (err: any) {
    console.error(`[PATCH /api/tasks/${req.params.id}] ❌`, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', async (req: Request, res: Response<ApiResponse<null>>) => {
  await simulateDelay()
  try {
    maybeFailRandomly()
    const idx = tasks.findIndex((t) => t.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Task not found' })
      return
    }
    tasks.splice(idx, 1)
    console.log(`[DELETE /api/tasks/${req.params.id}] ✅ Task deleted`)
    res.json({ success: true, data: null })
  } catch (err: any) {
    console.error(`[DELETE /api/tasks/${req.params.id}] ❌`, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
