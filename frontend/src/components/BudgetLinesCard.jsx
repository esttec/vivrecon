import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'

// Lists this month's budget lines (manual + bank import) filed under one category,
// so moving a line on the Budget page also shows it on that category's page.
export default function BudgetLinesCard({ category, yearMonth }) {
  const { fmt } = useUser()
  const { t: tr } = useT()
  const [lines, setLines] = useState([])
  const ym = yearMonth || new Date().toISOString().slice(0, 7)

  useEffect(() => {
    apiFetch(`/api/budget/${ym}`)
      .then(b => setLines((b?.expenseLines || []).filter(l => l.category === category)))
      .catch(() => setLines([]))
  }, [category, ym])

  if (!lines.length) return null
  const total = lines.reduce((s, l) => s + Number(l.amount), 0)
  return (
    <div style={{ background: '#fff', border: '1px solid #e6e6e0', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
        <span>{tr('nav.budget')}</span><span>{fmt(total)}</span>
      </div>
      {lines.map(l => (
        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderTop: '1px solid #f0f0ec' }}>
          <span>{l.description}</span><span style={{ fontWeight: 600 }}>{fmt(l.amount)}</span>
        </div>
      ))}
    </div>
  )
}
