interface BillFormProps {
  billTitle: string
  setBillTitle: (value: string) => void
  billAmount: string
  setBillAmount: (value: string) => void
  membersCount: number
  loading: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function BillForm({
  billTitle,
  setBillTitle,
  billAmount,
  setBillAmount,
  membersCount,
  loading,
  onSubmit,
}: BillFormProps) {
  return (
    <div className="panel">
      <h2>Create Bill</h2>

      <form onSubmit={onSubmit}>
        <input
          value={billTitle}
          onChange={(e) => setBillTitle(e.target.value)}
          placeholder="Bill title"
          required
        />

        <input
          type="number"
          min="0.01"
          step="0.01"
          value={billAmount}
          onChange={(e) => setBillAmount(e.target.value)}
          placeholder="Amount in rupees"
          required
        />

        <button type="submit" disabled={loading || membersCount === 0}>
          {loading ? 'Creating...' : 'Create and Split Bill'}
        </button>
      </form>

      {membersCount === 0 && <p className="empty">Add members before creating a bill.</p>}
    </div>
  )
}
