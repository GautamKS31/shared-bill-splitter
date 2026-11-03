import type { Balance } from '../api/billApi'

interface BalanceListProps {
  balances: Balance[]
  formatMoney: (cents: number) => string
}

export default function BalanceList({ balances, formatMoney }: BalanceListProps) {
  return (
    <section className="panel">
      <h2>Outstanding Balances</h2>

      {balances.length === 0 ? (
        <p className="empty">No balances available yet.</p>
      ) : (
        balances.map((balance) => (
          <div className="list-row" key={balance.memberId}>
            <strong>{balance.name}</strong>
            <strong>{formatMoney(balance.outstandingCents)}</strong>
          </div>
        ))
      )}
    </section>
  )
}
