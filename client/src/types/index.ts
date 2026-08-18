export interface Task {
  id: string
  title: string
  category: 'Work' | 'Personal' | 'Urgent'
  completed: boolean
}

export type FilterStatus = 'all' | 'active' | 'completed'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
