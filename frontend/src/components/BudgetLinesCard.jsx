import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'

// One card per category page, always in the same order:
//   1. Eelarve   – what the month allows for this category
//   2. Kulutatud – every budget line in this category (bank imports + manual), plus the page's own extra spending
//   3. Saadaval  – Eelarve − Kulutatud
// planned:     fixed amount (e.g. rent from the profile), or
// plannedPct:  share of this month's income (food = 15 %)
export default function BudgetLinesCard({ category, yearMonth, planned, plannedPct, extraSpent = 0, onSpent }) {
  const { fmt } = useUser()
  const { t: tr } = useT()
  const [lines, setLines] = useState([])
  const [income, setIncome] = useState(0)
  const [plan, setPlan] = useState(null) // plan line for this category, if the user/template set one
  const ym = yearMonth || new Date().toISOString().slice(0, 7)

  useEffect(() => {
    apiFetch(`/api/budget/${ym}`)
      .then(b => {
        setLines((b?.expenseLines || []).filter(l => l.category === category))
        setIncome(Number(b?.totalIncome || 0))
        const pl = (b?.planLines || []).filter(l => l.category === category)
        setPlan(pl.length ? pl.reduce((s, l) => s + Number(l.amount), 0) : null)
      })
      .catch(() => { setLines([]); setIncome(0) })
  }, [category, ym])

  const spent = lines.reduce((s, l) => s + Number(l.amount), 0) + Number(extraSpent || 0)
  useEffect(() => { onSpent?.(spent) }, [spent])
  const budget = plan != null ? plan : plannedPct ? Math.round(income * plannedPct) / 100 : Number(planned || 0)
  if (!lines.length && !budget && !extraSpent) return null
  const left = budget - spent

  const row = { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: '1px solid #f0f0ec' }
  return (
    <div style={{ background: '#fff', border: '1px solid #e6e6e0', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
      {budget > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, paddingBottom: 6 }}>
          <span>{tr('eating.budget')}{plan == null && plannedPct ? ` (${plannedPct}%)` : ''}</span><span>{fmt(budget)}</span>
        </div>
      )}
      <div style={{ ...row, fontWeight: 700, color: '#9b2020' }}>
        <span>{tr('budget.spent')}</span>
        <span>{budget > 0 ? `${Math.round(spent / budget * 100)}%` : fmt(spent)}
          {budget > 0 && <span style={{ fontWeight: 500, fontSize: 12, marginLeft: 6 }}>({fmt(spent)})</span>}</span>
      </div>
      {lines.map(l => (
        <div key={l.id} style={{ ...row, paddingLeft: 12 }}>
          <span>{l.description}</span><span style={{ fontWeight: 600 }}>{fmt(l.amount)}</span>
        </div>
      ))}
      {budget > 0 && (
        <div style={{ ...row, fontWeight: 700, fontSize: 15, color: left >= 0 ? '#1e6b3a' : '#c0392b' }}>
          <span>{tr('savings.available')}</span><span>{fmt(left)}</span>
        </div>
      )}
    </div>
  )
}
