
import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

// Validate that the request body is a JSON object.
function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

// ==========================================
// POST /api/homes
// Create a new home
// ==========================================

app.post('/api/homes', async (c) => {
  const body: unknown = await c.req.json<unknown>().catch(() => null)

  // Validate name
  if (
    !isRecord(body) ||
    typeof body.name !== 'string' ||
    body.name.trim().length === 0
  ) {
    return c.json(
      { error: 'Name must be a non-empty string' },
      422
    )
  }

  const id = crypto.randomUUID()
  const name = body.name.trim()

  await c.env.DB.prepare(
    'INSERT INTO homes (id, name) VALUES (?, ?)'
  )
    .bind(id, name)
    .run()

  return c.json(
    {
      id,
      name
    },
    201
  )
})

// ==========================================
// POST /api/homes/:homeId/members
// Add a member to a home
// ==========================================

app.post('/api/homes/:homeId/members', async (c) => {
  const homeId = c.req.param('homeId')

  const body: unknown = await c.req.json<unknown>().catch(() => null)

  // Validate name
  if (
    !isRecord(body) ||
    typeof body.name !== 'string' ||
    body.name.trim().length === 0
  ) {
    return c.json(
      { error: 'Name must be a non-empty string' },
      422
    )
  }

  const id = crypto.randomUUID()
  const name = body.name.trim()

  // Add the member with the next joining position.
  // The INSERT statement only succeeds when the home exists.

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
     )`
  )
    .bind(id, homeId, name, homeId, homeId)
    .run()

  if (result.meta.changes === 0) {
    return c.json(
      { error: 'Home not found' },
      404
    )
  }

  return c.json(
    {
      id,
      homeId,
      name
    },
    201
  )
})


//
// POST /api/homes/:homeId/bills
// Create a bill and split it between all home members.
//

app.post('/api/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')

  // 1. Check whether the home exists.
  const home = await c.env.DB.prepare(
    'SELECT id FROM homes WHERE id = ?'
  )
    .bind(homeId)
    .first<{ id: string }>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  // 2. Read and validate the request body.
  const body: unknown = await c.req.json<unknown>().catch(() => null)

  if (
    !isRecord(body) ||
    typeof body.title !== 'string' ||
    body.title.trim().length === 0 ||
    typeof body.totalCents !== 'number' ||
    !Number.isSafeInteger(body.totalCents) ||
    body.totalCents <= 0
  ) {
    return c.json(
      { error: 'Title must be non-empty and totalCents must be a positive whole number' },
      422
    )
  }

  const title = body.title.trim()
  const totalCents = body.totalCents

  // 3. Get all members in the order they joined.
  const memberResult = await c.env.DB.prepare(
    `SELECT id
     FROM members
     WHERE home_id = ?
     ORDER BY position ASC`
  )
    .bind(homeId)
    .all<{ id: string }>()

  const members = memberResult.results

  // 4. A bill cannot be created without members.
  if (members.length === 0) {
    return c.json(
      { error: 'Cannot create a bill for a home without members' },
      422
    )
  }

  // 5. Calculate each member's share.
  const memberCount = members.length

  const baseShare = Math.floor(totalCents / memberCount)
  const remainingCents = totalCents % memberCount

  const billId = crypto.randomUUID()

  const shares = members.map((member, index) => ({
    id: crypto.randomUUID(),
    memberId: member.id,
    amountCents:
      baseShare + (index < remainingCents ? 1 : 0),
    paidAt: null
  }))

  // 6. Prepare the bill insertion.
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO bills (id, home_id, title, total_cents)
       VALUES (?, ?, ?, ?)`
    ).bind(billId, homeId, title, totalCents),

    // 7. Prepare one share insertion for each member.
    ...shares.map((share) =>
      c.env.DB.prepare(
        `INSERT INTO shares
         (id, home_id, bill_id, member_id, amount_cents)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        share.id,
        homeId,
        billId,
        share.memberId,
        share.amountCents
      )
    )
  ]

  // 8. Execute all insertions atomically.
  // If an insertion fails, the batch is rolled back.
  await c.env.DB.batch(statements)

  // 9. Return the created bill and shares.
  return c.json(
    {
      id: billId,
      homeId,
      title,
      totalCents,
      shares
    },
    201
  )
})


// ==========================================
// Handle invalid routes
// ==========================================

app.notFound((c) => {
  return c.json(
    { error: 'Route not found' },
    404
  )
})

// ==========================================
// Handle unexpected server errors
// ==========================================

app.onError((error, c) => {
  console.error('API error:', error)

  return c.json(
    { error: 'Internal server error' },
    500
  )
})

export default app
