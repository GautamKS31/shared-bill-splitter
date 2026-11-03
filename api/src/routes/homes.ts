import { Hono } from 'hono'

// Validate request body
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const homes = new Hono<{ Bindings: Env }>()

// POST /api/homes
// Create a new home
homes.post('/api/homes', async (c) => {
  const body: unknown = await c.req.json<unknown>().catch(() => null)

  if (!isRecord(body) || typeof body.name !== 'string' || !body.name.trim()) {
    return c.json({ error: 'Name must be a non-empty string' }, 422)
  }

  const id = crypto.randomUUID()
  const name = body.name.trim()

  await c.env.DB.prepare('INSERT INTO homes (id, name) VALUES (?, ?)').bind(id, name).run()

  return c.json({ id, name }, 201)
})

// GET /api/homes
// Retrieve all homes
homes.get('/api/homes', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id, name
     FROM homes
     ORDER BY created_at DESC`,
  ).all<{ id: string; name: string }>()

  return c.json({ homes: result.results }, 200)
})

// GET /api/homes/:homeId
// Retrieve one home
homes.get('/api/homes/:homeId', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id, name FROM homes WHERE id = ?')
    .bind(homeId)
    .first<{ id: string; name: string }>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  return c.json(home, 200)
})

// POST /api/homes/:homeId/members
// Add a member to a home, preventing duplicate names
homes.post('/api/homes/:homeId/members', async (c) => {
  const homeId = c.req.param('homeId')
  const body: unknown = await c.req.json<unknown>().catch(() => null)

  if (!isRecord(body) || typeof body.name !== 'string' || !body.name.trim()) {
    return c.json({ error: 'Name must be a non-empty string' }, 422)
  }

  const name = body.name.trim()

  // Check whether the home exists.
  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<{ id: string }>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  // Check duplicates without considering letter case or surrounding spaces.
  const existingMember = await c.env.DB.prepare(
    `SELECT id
     FROM members
     WHERE home_id = ?
       AND lower(trim(name)) = lower(trim(?))
     LIMIT 1`,
  )
    .bind(homeId, name)
    .first<{ id: string }>()

  if (existingMember) {
    return c.json({ error: 'This member already exists in this home.' }, 409)
  }

  const id = crypto.randomUUID()

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO members (id, home_id, name, position)
       SELECT ?, ?, ?,
         COALESCE(
           (SELECT MAX(position) + 1 FROM members WHERE home_id = ?),
           0
         )
       WHERE EXISTS (SELECT 1 FROM homes WHERE id = ?)`,
    )
      .bind(id, homeId, name, homeId, homeId)
      .run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Home not found' }, 404)
    }

    return c.json({ id, homeId, name }, 201)
  } catch (error) {
    // The unique database index also protects against simultaneous requests.
    // Check again to distinguish a duplicate from another database error.
    const duplicate = await c.env.DB.prepare(
      `SELECT id
       FROM members
       WHERE home_id = ?
         AND lower(trim(name)) = lower(trim(?))
       LIMIT 1`,
    )
      .bind(homeId, name)
      .first<{ id: string }>()

    if (duplicate) {
      return c.json({ error: 'This member already exists in this home.' }, 409)
    }

    throw error
  }
})

// GET /api/homes/:homeId/members
// Retrieve members in joining order
homes.get('/api/homes/:homeId/members', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<{ id: string }>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const result = await c.env.DB.prepare(
    `SELECT id, home_id AS homeId, name
     FROM members
     WHERE home_id = ?
     ORDER BY position ASC`,
  )
    .bind(homeId)
    .all<{ id: string; homeId: string; name: string }>()

  return c.json({ members: result.results }, 200)
})

export default homes
