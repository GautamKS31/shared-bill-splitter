import { createFileRoute } from '@tanstack/react-router'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

import {
  addMember,
  type Balance,
  type Bill,
  createBill,
  createHome,
  getBalances,
  getBills,
  getHome,
  getHomes,
  getMembers,
  type Home as HomeType,
  type Member,
  payShare,
} from '../api/billApi'

import BalanceList from '../components/BalanceList'
import BillForm from '../components/BillForm'
import BillList from '../components/BillList'
import HomeForm from '../components/HomeForm'
import HomeSelector from '../components/HomeSelector'
import MemberForm from '../components/MemberForm'

const STORAGE_KEY = 'shared-bill-splitter-home-id'

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response as {
      data?: { error?: string }
    }

    return response.data?.error || 'Something went wrong.'
  }

  return 'Unable to connect to the server. Please try again.'
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(cents / 100)

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  // Home and dashboard data
  const [homes, setHomes] = useState<HomeType[]>([])
  const [home, setHome] = useState<HomeType | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [balances, setBalances] = useState<Balance[]>([])

  // Form values
  const [homeName, setHomeName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [billTitle, setBillTitle] = useState('')
  const [billAmount, setBillAmount] = useState('')

  // UI states
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showHomeForm, setShowHomeForm] = useState(false)

  // Load one home's complete dashboard data.
  const loadHomeData = useCallback(async (homeId: string) => {
    const [homeResult, membersResult, billsResult, balancesResult] = await Promise.all([
      getHome(homeId),
      getMembers(homeId),
      getBills(homeId),
      getBalances(homeId),
    ])

    setHome(homeResult)
    setMembers(membersResult.members)
    setBills(billsResult.bills)
    setBalances(balancesResult.balances)

    localStorage.setItem(STORAGE_KEY, homeId)
  }, [])

  // Load all homes and restore the previously selected home.
  useEffect(() => {
    let cancelled = false

    const loadHomes = async () => {
      try {
        const result = await getHomes()

        if (cancelled) return

        setHomes(result.homes)

        const savedHomeId = localStorage.getItem(STORAGE_KEY)

        const selectedHome = result.homes.find((item) => item.id === savedHomeId) || result.homes[0]

        if (selectedHome) {
          await loadHomeData(selectedHome.id)
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setShowHomeForm(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err))
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
        }
      }
    }

    void loadHomes()

    return () => {
      cancelled = true
    }
  }, [loadHomeData])

  // Switch between existing homes.
  const handleHomeChange = async (homeId: string) => {
    setLoading(true)
    setError('')
    setMessage('')

    // Clear the previous home's data while loading.
    setHome(null)
    setMembers([])
    setBills([])
    setBalances([])

    try {
      await loadHomeData(homeId)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Refresh outstanding balances.
  const refreshBalances = async (homeId: string) => {
    const result = await getBalances(homeId)
    setBalances(result.balances)
  }

  // Create a new home.
  const handleCreateHome = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await createHome(homeName)

      setHomes((previous) => [result, ...previous])
      setHomeName('')
      setShowHomeForm(false)

      await loadHomeData(result.id)

      setMessage('New home created successfully!')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Add a member to the selected home.
  const handleAddMember = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!home) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await addMember(home.id, memberName)

      setMembers((previous) => [...previous, result])
      setMemberName('')

      await refreshBalances(home.id)

      setMessage('Member added successfully!')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Create a bill and split it between household members.
  const handleCreateBill = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!home) return

    const amount = Number(billAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid positive bill amount.')
      return
    }

    if (!Number.isInteger(amount * 100)) {
      setError('Bill amount must have no more than two decimal places.')
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
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Pay a member's share of a bill.
  const handlePayShare = async (bill: Bill, shareId: string) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await payShare(bill.id, shareId)

      setBills((previous) =>
        previous.map((item) =>
          item.id === bill.id
            ? {
                ...item,
                shares: item.shares.map((share) =>
                  share.id === shareId ? { ...share, paidAt: result.paidAt } : share,
                ),
              }
            : item,
        ),
      )

      if (home) {
        await refreshBalances(home.id)
      }

      setMessage('Payment successful!')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Initial loading screen.
  if (initialLoading) {
    return (
      <main className="dashboard">
        <section className="panel">
          <p>Loading your homes...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard">
      {/* Header */}
      <header className="topbar">
        <div>
          <h1>Shared Bill Splitter</h1>
          <p>Manage household expenses easily.</p>
        </div>

        <span className="status">Expense Manager</span>
      </header>

      {/* Error and success messages */}
      {error && <div className="alert error">{error}</div>}

      {message && <div className="alert success">{message}</div>}

      {/* Home selection */}
      {homes.length > 0 && !showHomeForm && (
        <HomeSelector
          homes={homes}
          selectedHomeId={home?.id || ''}
          onChange={handleHomeChange}
          onCreateNew={() => {
            setHome(null)
            setShowHomeForm(true)
            setError('')
            setMessage('')
          }}
        />
      )}

      {/* Create home form */}
      {showHomeForm && (
        <section className="panel">
          <HomeForm
            homeName={homeName}
            setHomeName={setHomeName}
            loading={loading}
            onSubmit={handleCreateHome}
          />

          {homes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowHomeForm(false)

                const savedHomeId = localStorage.getItem(STORAGE_KEY)

                if (savedHomeId) {
                  void handleHomeChange(savedHomeId)
                }
              }}
            >
              Cancel
            </button>
          )}
        </section>
      )}

      {/* Selected home dashboard */}
      {home && !showHomeForm && (
        <>
          {/* Household information */}
          <section className="welcome">
            <p>YOUR HOUSEHOLD</p>
            <h2>{home.name}</h2>
            <span>{members.length} members</span>
          </section>

          {/* Summary cards */}
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

          {/* Member and bill forms */}
          <section className="content-grid">
            <MemberForm
              memberName={memberName}
              setMemberName={setMemberName}
              members={members}
              loading={loading}
              onSubmit={handleAddMember}
            />

            <BillForm
              billTitle={billTitle}
              setBillTitle={setBillTitle}
              billAmount={billAmount}
              setBillAmount={setBillAmount}
              membersCount={members.length}
              loading={loading}
              onSubmit={handleCreateBill}
            />
          </section>

          {/* Bills and payments */}
          <BillList
            bills={bills}
            members={members}
            loading={loading}
            onPay={handlePayShare}
            formatMoney={formatMoney}
          />

          {/* Outstanding balances */}
          <BalanceList balances={balances} formatMoney={formatMoney} />
        </>
      )}
    </main>
  )
}
