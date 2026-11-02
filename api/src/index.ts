import { Hono } from 'hono'
import balanceRoutes from './routes/balances'
import billRoutes from './routes/bills'
import homeRoutes from './routes/homes'
import paymentRoutes from './routes/payments'

const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

// Register application routes
app.route('/', homeRoutes)
app.route('/', billRoutes)
app.route('/', paymentRoutes)
app.route('/', balanceRoutes)

// Handle unknown routes
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404)
})

// Handle unexpected errors
app.onError((error, c) => {
  console.error('API error:', error)

  return c.json({ error: 'Internal server error' }, 500)
})

export default app
