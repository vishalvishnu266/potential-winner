import type { Task, FilterStatus } from '../types'

interface Props {
  tasks: Task[]
  filter: FilterStatus
  setFilter: (f: FilterStatus) => void
}

export function FilterTabs({ tasks, filter, setFilter }: Props) {
  return (
    <div className="filter-tabs">
      {(['all', 'active', 'completed'] as FilterStatus[]).map((f) => {
        const count =
          f === 'all'
            ? tasks.length
            : f === 'active'
            ? tasks.filter((t) => !t.completed).length
            : tasks.filter((t) => t.completed).length
        return (
          <button
            key={f}
            type="button"
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
          </button>
        )
      })}
    </div>
  )
}
