import { Hono } from 'hono'

// Helper function to validate request body
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const homes = new Hono<{ Bindings: Env }>()

// ==========================================
// POST /api/homes
// Create a new home
// ==========================================

homes.post('/api/homes', async (c) => {
  const body: unknown = await c.req.json<unknown>().catch(() => null)

  if (!isRecord(body) || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return c.json({ error: 'Name must be a non-empty string' }, 422)
  }

  const id = crypto.randomUUID()
  const name = body.name.trim()

  await c.env.DB.prepare('INSERT INTO homes (id, name) VALUES (?, ?)').bind(id, name).run()

  return c.json({ id, name }, 201)
})

// ==========================================
// POST /api/homes/:homeId/members
// Add a member to a home
// ==========================================

homes.post('/api/homes/:homeId/members', async (c) => {
  const homeId = c.req.param('homeId')

  const body: unknown = await c.req.json<unknown>().catch(() => null)

  if (!isRecord(body) || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return c.json({ error: 'Name must be a non-empty string' }, 422)
  }

  const id = crypto.randomUUID()
  const name = body.name.trim()

  const result = await c.env.DB.prepare(
    `INSERT INTO members (id, home_id, name, position)
     SELECT ?, ?, ?,
       COALESCE(
         (
           SELECT MAX(position) + 1
           FROM members
           WHERE home_id = ?
         ),
         0
       )
     WHERE EXISTS (
       SELECT 1 FROM homes WHERE id = ?
     )`,
  )
    .bind(id, homeId, name, homeId, homeId)
    .run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Home not found' }, 404)
  }

  return c.json({ id, homeId, name }, 201)
})

export default homes
