import { Task } from './types'

// In-memory store simulating a database
export let tasks: Task[] = [
  { id: '1', title: 'Setup React Project', category: 'Work', completed: true },
  { id: '2', title: 'Design Task Manager UI', category: 'Personal', completed: false },
  { id: '3', title: 'Fix critical production bug', category: 'Urgent', completed: false },
]
