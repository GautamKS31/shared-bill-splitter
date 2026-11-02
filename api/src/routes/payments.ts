import { Hono } from 'hono'

const payments = new Hono<{ Bindings: Env }>()

type ShareRow = {
  id: string
  member_id: string
  amount_cents: number
  paid_at: string | null
  idempotency_key: string | null
}

// POST /api/bills/:billId/shares/:shareId/pay

payments.post('/api/bills/:billId/shares/:shareId/pay', async (c) => {
  const billId = c.req.param('billId')
  const shareId = c.req.param('shareId')

  // 1. Validate Idempotency-Key.
  const idempotencyKey = c.req.header('Idempotency-Key')?.trim()

  if (!idempotencyKey) {
    return c.json({ error: 'Idempotency-Key header is required' }, 400)
  }

  // 2. Check whether the bill exists.
  const bill = await c.env.DB.prepare('SELECT id FROM bills WHERE id = ?')
    .bind(billId)
    .first<{ id: string }>()

  if (!bill) {
    return c.json({ error: 'Bill not found' }, 404)
  }

  // 3. Find the share belonging to this bill.
  const share = await c.env.DB.prepare(
    `SELECT id, member_id, amount_cents, paid_at, idempotency_key
       FROM shares
       WHERE id = ? AND bill_id = ?`,
  )
    .bind(shareId, billId)
    .first<ShareRow>()

  if (!share) {
    return c.json({ error: 'Share not found' }, 404)
  }

  // 4. Handle an already-paid share.
  if (share.paid_at !== null) {
    if (share.idempotency_key === idempotencyKey) {
      return c.json(
        {
          id: share.id,
          memberId: share.member_id,
          amountCents: share.amount_cents,
          paidAt: share.paid_at,
        },
        200,
      )
    }

    return c.json({ error: 'Share has already been paid' }, 409)
  }

  // 5. Generate payment timestamp.
  const paidAt = new Date().toISOString()

  // 6. Update only if the share is still unpaid.
  const result = await c.env.DB.prepare(
    `UPDATE shares
       SET paid_at = ?, idempotency_key = ?
       WHERE id = ?
         AND bill_id = ?
         AND paid_at IS NULL`,
  )
    .bind(paidAt, idempotencyKey, shareId, billId)
    .run()

  if (result.meta.changes === 1) {
    return c.json(
      {
        id: share.id,
        memberId: share.member_id,
        amountCents: share.amount_cents,
        paidAt,
      },
      200,
    )
  }

  // 7. Another request may have paid the share first.
  const latestShare = await c.env.DB.prepare(
    `SELECT id, member_id, amount_cents, paid_at, idempotency_key
       FROM shares
       WHERE id = ? AND bill_id = ?`,
  )
    .bind(shareId, billId)
    .first<ShareRow>()

  if (!latestShare) {
    return c.json({ error: 'Share not found' }, 404)
  }

  // Same key: return the original payment.
  if (latestShare.paid_at !== null && latestShare.idempotency_key === idempotencyKey) {
    return c.json(
      {
        id: latestShare.id,
        memberId: latestShare.member_id,
        amountCents: latestShare.amount_cents,
        paidAt: latestShare.paid_at,
      },
      200,
    )
  }

  return c.json({ error: 'Share has already been paid' }, 409)
})

export default payments
