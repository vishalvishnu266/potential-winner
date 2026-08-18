import express from 'express'
import cors from 'cors'
import taskRoutes from './routes'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/tasks', taskRoutes)

app.listen(PORT, () => {
  console.log(`\n🚀 Task API server running at http://localhost:${PORT}`)
  console.log('   Endpoints:')
  console.log('     GET    /api/tasks')
  console.log('     POST   /api/tasks')
  console.log('     PATCH  /api/tasks/:id/toggle')
  console.log('     PATCH  /api/tasks/:id')
  console.log('     DELETE /api/tasks/:id')
  console.log('\n   ⚠️  ~20% random failure rate is enabled to simulate server errors.\n')
})
