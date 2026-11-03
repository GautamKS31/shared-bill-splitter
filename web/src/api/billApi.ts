import axios from 'axios'

// API configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Types
export interface Home {
  id: string
  name: string
}

export interface Member {
  id: string
  homeId: string
  name: string
}

export interface Share {
  id: string
  memberId: string
  amountCents: number
  paidAt: string | null
}

export interface Bill {
  id: string
  homeId: string
  title: string
  totalCents: number
  shares: Share[]
}

export interface Balance {
  memberId: string
  name: string
  outstandingCents: number
}

// Create a home
export const createHome = async (name: string): Promise<Home> => {
  const response = await api.post<Home>('/api/homes', { name })
  return response.data
}

// Get an existing home
export const getHome = async (homeId: string): Promise<Home> => {
  const response = await api.get<Home>(`/api/homes/${homeId}`)
  return response.data
}

// Add a member
export const addMember = async (homeId: string, name: string): Promise<Member> => {
  const response = await api.post<Member>(`/api/homes/${homeId}/members`, {
    name,
  })
  return response.data
}

// Get all members of a home
export const getMembers = async (homeId: string): Promise<{ members: Member[] }> => {
  const response = await api.get<{ members: Member[] }>(`/api/homes/${homeId}/members`)
  return response.data
}

// Create a bill and split it
export const createBill = async (
  homeId: string,
  title: string,
  totalCents: number,
): Promise<Bill> => {
  const response = await api.post<Bill>(`/api/homes/${homeId}/bills`, {
    title,
    totalCents,
  })
  return response.data
}

// Get all bills and their shares
export const getBills = async (homeId: string): Promise<{ bills: Bill[] }> => {
  const response = await api.get<{ bills: Bill[] }>(`/api/homes/${homeId}/bills`)
  return response.data
}

// Pay a share
export const payShare = async (billId: string, shareId: string) => {
  const response = await api.post<Share>(
    `/api/bills/${billId}/shares/${shareId}/pay`,
    {},
    {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
    },
  )

  return response.data
}

// Get outstanding balances
export const getBalances = async (homeId: string): Promise<{ balances: Balance[] }> => {
  const response = await api.get<{ balances: Balance[] }>(`/api/homes/${homeId}/balances`)
  return response.data
}

export default api
