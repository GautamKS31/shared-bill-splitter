import { Hono } from 'hono'

const balances = new Hono<{ Bindings: Env }>()

type BalanceRow = {
  member_id: string
  name: string
  outstanding_cents: number
}

// Calculate the outstanding amount for every member.

balances.get('/api/homes/:homeId/balances', async (c) => {
  const homeId = c.req.param('homeId')

  // 1. Check whether the home exists.
  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<{ id: string }>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  // 2. Calculate outstanding balances.
  const result = await c.env.DB.prepare(
    `SELECT
       m.id AS member_id,
       m.name AS name,
       COALESCE(
         SUM(
           CASE
             WHEN s.paid_at IS NULL THEN s.amount_cents
             ELSE 0
           END
         ),
         0
       ) AS outstanding_cents
     FROM members m
     LEFT JOIN shares s
       ON s.member_id = m.id
       AND s.home_id = m.home_id
     WHERE m.home_id = ?
     GROUP BY m.id, m.name, m.position
     ORDER BY m.position ASC`,
  )
    .bind(homeId)
    .all<BalanceRow>()

  // 3. Convert database field names to API response names.
  const response = result.results.map((row) => ({
    memberId: row.member_id,
    name: row.name,
    outstandingCents: row.outstanding_cents,
  }))

  // 4. Return the balances.
  return c.json({ balances: response }, 200)
})

export default balances
