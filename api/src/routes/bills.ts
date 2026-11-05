import { Hono } from 'hono'

// Helper function to validate request body
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const bills = new Hono<{ Bindings: Env }>()

// Create a bill and split it among members

bills.post('/api/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')


  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<{ id: string }>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }
//2 Zero, negative or invalid amount
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

  // 1 Home with no members
  const memberResult = await c.env.DB.prepare(
    `SELECT id
     FROM members
     WHERE home_id = ?
     ORDER BY position ASC`,
  )
    .bind(homeId)
    .all<{ id: string }>()

  const members = memberResult.results

  if (members.length === 0) {
    return c.json(
      {
        error: 'Cannot create a bill for a home without members',
      },
      422,
    )
  }
// 3 Divided Evenly
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

  await c.env.DB.batch(statements)
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


// Retrieve all bills and their shares

bills.get('/api/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<{ id: string }>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const billResult = await c.env.DB.prepare(
    `SELECT id, home_id, title, total_cents
     FROM bills
     WHERE home_id = ?
     ORDER BY rowid DESC`,
  )
    .bind(homeId)
    .all<{
      id: string
      home_id: string
      title: string
      total_cents: number
    }>()

  const billsWithShares = await Promise.all(
    billResult.results.map(async (bill) => {
      const shareResult = await c.env.DB.prepare(
        `SELECT id, member_id, amount_cents, paid_at
         FROM shares
         WHERE bill_id = ?
         ORDER BY rowid ASC`,
      )
        .bind(bill.id)
        .all<{
          id: string
          member_id: string
          amount_cents: number
          paid_at: string | null
        }>()

      return {
        id: bill.id,
        homeId: bill.home_id,
        title: bill.title,
        totalCents: bill.total_cents,
        shares: shareResult.results.map((share) => ({
          id: share.id,
          memberId: share.member_id,
          amountCents: share.amount_cents,
          paidAt: share.paid_at,
        })),
      }
    }),
  )

  return c.json({ bills: billsWithShares }, 200)
})


export default bills
