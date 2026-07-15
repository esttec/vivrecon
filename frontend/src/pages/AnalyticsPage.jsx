import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t } from '../theme'

// Category icon + label-key lookup.
const CAT_META = {
  HOUSE: ['🏠', 'cat.house'], EATING: ['🍎', 'cat.food'], RESTAURANTS: ['🍽️', 'cat.restaurants'],
  TRANSPORT: ['🚗', 'cat.transport'], CLOTHES: ['👗', 'cat.clothing'], ENTERTAINMENT: ['🎬', 'cat.entertainment'],
  COMMUNICATION: ['📶', 'cat.communication'], SPORT: ['🏋️', 'cat.sport'], EDUCATION: ['🎓', 'cat.education'],
  MARKETPLACES: ['🛒', 'cat.marketplaces'], WORK: ['💼', 'cat.work'], HEALTH: ['🏥', 'cat.health'],
  GADGETS: ['💻', 'cat.gadgets'], GIFTS: ['🎁', 'cat.gifts'], TRAVEL: ['✈️', 'cat.travel'],
  SAVINGS: ['💰', 'cat.savings'], DEBTS: ['💳', 'cat.debts'], OTHER: ['📦', 'cat.other'],
}

export default function AnalyticsPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { premium, fmt } = useUser()
  const { t: tr } = useT()

  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!premium) { setLoading(false); return }
    apiFetch('/api/budget')
      .then(data => setBudgets(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [premium])

  // Spending by category across all months.
  const byCat = {}
  for (const b of budgets)
    for (const l of b.expenseLines || [])
      byCat[l.category || 'OTHER'] = (byCat[l.category || 'OTHER'] || 0) + Number(l.amount)
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const totalSpend = cats.reduce((s, [, v]) => s + v, 0)
  const maxCat = cats.length ? cats[0][1] : 0

  // Income vs expenses, last 6 months.
  const months = [...budgets].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)).slice(-6)
  const maxMonth = Math.max(1, ...months.map(m => Math.max(Number(m.totalIncome), Number(m.totalExpenses))))

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '28px 32px' }}>
        <h1 style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 8 }}><Ico e="📊" size={22} />{tr('analytics.title')}</h1>

        {!premium ? (
          <div style={s.upsell}>
            <p style={{ fontSize: 15, color: t.navy, marginBottom: 14 }}>{tr('analytics.upsell')}</p>
            <button style={s.cta} onClick={() => navigate('/premium')}>{tr('premium.upgrade')}</button>
          </div>
        ) : loading ? (
          <p style={s.muted}>{tr('common.loading')}</p>
        ) : cats.length === 0 ? (
          <div style={s.empty}>{tr('analytics.noData')}</div>
        ) : (
          <>
            <div style={s.card}>
              <div style={s.cardTitle}>{tr('analytics.byCategory')}</div>
              {cats.map(([key, val]) => {
                const [icon, label] = CAT_META[key] || ['📦', 'cat.other']
                const pct = totalSpend ? Math.round(val / totalSpend * 100) : 0
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: t.navy, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ico e={icon} size={15} />{tr(label)}</span>
                      <span style={{ color: t.navy, fontWeight: 700 }}>{fmt(val)} <span style={{ color: t.navyLight, fontWeight: 400 }}>· {pct}%</span></span>
                    </div>
                    <div style={s.track}>
                      <div style={{ ...s.fill, width: `${maxCat ? (val / maxCat) * 100 : 0}%` }} />
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTop: `2px solid ${t.border}`, fontSize: 14, fontWeight: 700, color: t.navy }}>
                <span>{tr('budget.totalExpenses')}</span><span>{fmt(totalSpend)}</span>
              </div>
            </div>

            {months.length > 0 && (
              <div style={s.card}>
                <div style={s.cardTitle}>{tr('analytics.monthlyTrend')}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '10px 4px' }}>
                  {months.map(m => (
                    <div key={m.yearMonth} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                        <div title={fmt(m.totalIncome)} style={{ width: 12, background: '#2e8b57', borderRadius: 3, height: `${Number(m.totalIncome) / maxMonth * 100}%` }} />
                        <div title={fmt(m.totalExpenses)} style={{ width: 12, background: '#c0392b', borderRadius: 3, height: `${Number(m.totalExpenses) / maxMonth * 100}%` }} />
                      </div>
                      <span style={{ fontSize: 10, color: t.navyLight }}>{m.yearMonth.slice(5)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: t.navyLight, marginTop: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2e8b57', display: 'inline-block' }} />{tr('budget.income')}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#c0392b', display: 'inline-block' }} />{tr('budget.expenses')}</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </PageShell>
  )
}

const s = {
  main:      { maxWidth: 760, width: '100%', margin: '0 auto' },
  title:     { fontSize: 22, fontWeight: 700, color: t.navy, margin: '0 0 18px' },
  card:      { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 },
  track:     { height: 8, background: t.borderLight, borderRadius: 4, overflow: 'hidden' },
  fill:      { height: '100%', background: t.navyMid, borderRadius: 4, transition: 'width 0.4s ease' },
  upsell:    { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, textAlign: 'center' },
  cta:       { padding: '12px 22px', background: t.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  muted:     { color: t.navyLight, fontSize: 14 },
  empty:     { textAlign: 'center', padding: '48px 0', color: t.navyLight, fontSize: 15 },
}
