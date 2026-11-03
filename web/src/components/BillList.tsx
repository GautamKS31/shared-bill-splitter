import type { Bill, Member } from '../api/billApi'

interface BillListProps {
  bills: Bill[]
  members: Member[]
  loading: boolean
  onPay: (bill: Bill, shareId: string) => void
  formatMoney: (cents: number) => string
}

export default function BillList({ bills, members, loading, onPay, formatMoney }: BillListProps) {
  return (
    <section className="panel">
      <h2>Bills and Payments</h2>

      {bills.length === 0 ? (
        <p className="empty">No bills created yet.</p>
      ) : (
        bills.map((bill) => (
          <div className="bill-card" key={bill.id}>
            <div className="bill-heading">
              <div>
                <h3>{bill.title}</h3>
                <p>{formatMoney(bill.totalCents)}</p>
              </div>

              <span>{bill.shares.length} shares</span>
            </div>

            {bill.shares.map((share) => {
              const member = members.find((item) => item.id === share.memberId)

              return (
                <div className="list-row" key={share.id}>
                  <div>
                    <strong>{member?.name || 'Member'}</strong>
                    <p>{formatMoney(share.amountCents)}</p>
                  </div>

                  {share.paidAt ? (
                    <span className="paid">Paid</span>
                  ) : (
                    <button type="button" disabled={loading} onClick={() => onPay(bill, share.id)}>
                      Pay
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}
    </section>
  )
}
