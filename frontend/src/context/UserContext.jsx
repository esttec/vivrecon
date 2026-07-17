import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

// Map ISO currency codes to symbols
const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CHF: 'Fr', PLN: 'zł', SEK: 'kr', NOK: 'kr' }

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setLoading(false); return }
    apiFetch('/api/me')
      .then(data => { if (data) setUser(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function refreshUser() {
    try {
      const data = await apiFetch('/api/me')
      if (data) setUser(data)
    } catch {}
  }

  const profile      = user?.profile  ?? {}
  const currencyCode = profile.currency ?? 'EUR'
  const currencySymbol = SYMBOLS[currencyCode] ?? currencyCode

  // Premium access (paid features) + remaining free-trial days.
  const premium       = user?.premium ?? false
  const paid          = user?.paid ?? false
  const trialDaysLeft = user?.trialDaysLeft ?? 0
  const premiumUntil  = user?.premiumUntil ?? null

  // Helper: format a number in the user's currency
  function fmt(amount) {
    if (amount === null || amount === undefined || amount === '') return '—'
    return `${currencySymbol} ${Number(amount).toLocaleString()}`
  }

  return (
    <UserContext.Provider value={{
      user,
      profile,
      loading,
      currencyCode,
      currencySymbol,
      premium,
      paid,
      trialDaysLeft,
      premiumUntil,
      fmt,
      refreshUser,
      setUser,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
