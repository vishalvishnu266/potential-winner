import './App.css'
import { useTasks } from './hooks/useTasks'
import { TaskForm } from './components/TaskForm'
import { TaskItem } from './components/TaskItem'
import { FilterTabs } from './components/FilterTabs'
import { ErrorBanner } from './components/ErrorBanner'

export default function App() {
  const {
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
  } = useTasks()

  return (
    <div className="task-app">
      <header className="app-header">
        <h1>Task Manager</h1>
        <p>{tasks.filter((t) => !t.completed).length} pending tasks</p>
      </header>

      {actionError && <ErrorBanner message={actionError} />}

      <TaskForm onAddTask={addTask} />

      <FilterTabs tasks={tasks} filter={filter} setFilter={setFilter} />

      {loading ? (
        <p className="loading-msg">Loading tasks…</p>
      ) : (
        <ul className="task-list">
          {filteredTasks.length === 0 ? (
            <p className="empty-msg">No tasks found in this view.</p>
          ) : (
            filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={toggleComplete}
                onDeleteTask={deleteTask}
                onEditTask={editTask}
              />
            ))
          )}
        </ul>
      )}
    </div>
  )
}
