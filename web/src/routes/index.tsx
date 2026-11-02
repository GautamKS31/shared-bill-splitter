import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  addMember,
  type Balance,
  type Bill,
  createBill,
  createHome,
  getBalances,
  type Home as HomeType,
  type Member,
  payShare,
} from '../api/billApi'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [home, setHome] = useState<HomeType | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [balances, setBalances] = useState<Balance[]>([])

  const [homeName, setHomeName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [billTitle, setBillTitle] = useState('')
  const [billAmount, setBillAmount] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(cents / 100)

  const refreshBalances = async (homeId: string) => {
    const result = await getBalances(homeId)
    setBalances(result.balances)
  }

  const handleError = (err: unknown) => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const response = err.response as {
        data?: { error?: string }
      }
      setError(response.data?.error || 'Something went wrong')
    } else {
      setError('Unable to connect to the server. Please try again.')
    }
  }

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await createHome(homeName)
      setHome(result)
      setHomeName('')
      setMessage('Home created successfully!')
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!home) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const member = await addMember(home.id, memberName)
      setMembers((previous) => [...previous, member])
      setMemberName('')
      await refreshBalances(home.id)
      setMessage('Member added successfully!')
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!home) return

    const amount = Number(billAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid bill amount.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await createBill(home.id, billTitle, Math.round(amount * 100))

      setBills((previous) => [...previous, result])
      setBillTitle('')
      setBillAmount('')
      await refreshBalances(home.id)
      setMessage('Bill created and split successfully!')
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePayShare = async (bill: Bill, shareId: string) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await payShare(bill.id, shareId)

      setBills((previous) =>
        previous.map((item) =>
          item.id === bill.id
            ? {
                ...item,
                shares: item.shares.map((share) =>
                  share.id === shareId ? { ...share, paidAt: new Date().toISOString() } : share,
                ),
              }
            : item,
        ),
      )

      if (home) await refreshBalances(home.id)
      setMessage('Payment successful!')
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Shared Bill Splitter</h1>
          <p>Manage household expenses easily.</p>
        </div>
        <span className="status">Expense Manager</span>
      </header>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {!home ? (
        <section className="panel welcome">
          <h2>Create your home</h2>
          <p>Start by creating a household to manage shared expenses.</p>

          <form onSubmit={handleCreateHome}>
            <input
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              placeholder="Enter home name"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Home'}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="welcome">
            <p>YOUR HOUSEHOLD</p>
            <h2>{home.name}</h2>
            <span>{members.length} members</span>
          </section>

          <section className="summary-grid">
            <div className="summary-card">
              <span>Total Members</span>
              <strong>{members.length}</strong>
            </div>
            <div className="summary-card">
              <span>Total Bills</span>
              <strong>{bills.length}</strong>
            </div>
            <div className="summary-card">
              <span>Outstanding Members</span>
              <strong>{balances.filter((item) => item.outstandingCents > 0).length}</strong>
            </div>
          </section>

          <section className="content-grid">
            <div className="panel">
              <h2>Add Member</h2>
              <form onSubmit={handleAddMember}>
                <input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Member name"
                  required
                />
                <button type="submit" disabled={loading}>
                  Add Member
                </button>
              </form>

              <h3>Members</h3>
              {members.length === 0 ? (
                <p className="empty">No members added yet.</p>
              ) : (
                members.map((member) => (
                  <div className="list-row" key={member.id}>
                    <span>{member.name}</span>
                  </div>
                ))
              )}
            </div>

            <div className="panel">
              <h2>Create Bill</h2>
              <form onSubmit={handleCreateBill}>
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
                <button type="submit" disabled={loading || members.length === 0}>
                  Create and Split Bill
                </button>
              </form>
              {members.length === 0 && <p className="empty">Add members before creating a bill.</p>}
            </div>
          </section>

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
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handlePayShare(bill, share.id)}
                          >
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
        </>
      )}
    </main>
  )
}
