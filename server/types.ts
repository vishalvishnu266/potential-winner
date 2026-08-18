export interface Task {
  id: string
  title: string
  category: 'Work' | 'Personal' | 'Urgent'
  completed: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
