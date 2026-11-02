import { Hono } from 'hono'

// Helper function to validate request body
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const bills = new Hono<{ Bindings: Env }>()

// ==========================================
// POST /api/homes/:homeId/bills
// Create a bill and split it among members
// ==========================================

bills.post('/api/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')

  // 1. Check whether the home exists.
  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
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
      {
        error: 'Title must be non-empty and totalCents must be a positive whole number',
      },
      422,
    )
  }

  const title = body.title.trim()
  const totalCents = body.totalCents

  // 3. Get all members in joining order.
  const memberResult = await c.env.DB.prepare(
    `SELECT id
     FROM members
     WHERE home_id = ?
     ORDER BY position ASC`,
  )
    .bind(homeId)
    .all<{ id: string }>()

  const members = memberResult.results

  // 4. A bill cannot be created without members.
  if (members.length === 0) {
    return c.json(
      {
        error: 'Cannot create a bill for a home without members',
      },
      422,
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
    amountCents: baseShare + (index < remainingCents ? 1 : 0),
    paidAt: null,
  }))

  // 6. Prepare the bill insertion.
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO bills (id, home_id, title, total_cents)
       VALUES (?, ?, ?, ?)`,
    ).bind(billId, homeId, title, totalCents),

    // 7. Prepare one share insertion for each member.
    ...shares.map((share) =>
      c.env.DB.prepare(
        `INSERT INTO shares
         (id, home_id, bill_id, member_id, amount_cents)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(share.id, homeId, billId, share.memberId, share.amountCents),
    ),
  ]

  // 8. Execute all insertions atomically.
  await c.env.DB.batch(statements)

  // 9. Return the created bill and shares.
  return c.json(
    {
      id: billId,
      homeId,
      title,
      totalCents,
      shares,
    },
    201,
  )
})

// Export the bills routes
export default bills
