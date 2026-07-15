import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t, badge } from '../theme'

export default function SavingsPage() {
  const isMobile = useIsMobile()
  const { fmt } = useUser()
  const { t: tr } = useT()

  const [goals, setGoals]     = useState([])
  const [budgetSavings, setBudgetSavings] = useState(0) // total marked as Savings in the budget
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ name: '', targetAmount: '' })
  const [depositId, setDepositId] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')

  useEffect(() => { loadGoals() }, [])

  async function loadGoals() {
    setLoading(true); setError('')
    try {
      const [g, budgets] = await Promise.all([
        apiFetch('/api/savings/goals'),
        apiFetch('/api/budget'),
      ])
      setGoals(g || [])
      // Everything marked as "Savings" across all budget months = money set aside.
      const saved = (budgets || []).reduce((sum, b) =>
        sum + (b.expenseLines || [])
          .filter(l => l.category === 'SAVINGS')
          .reduce((s, l) => s + Number(l.amount), 0), 0)
      setBudgetSavings(saved)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function addGoal(e) {
    e.preventDefault()
    try {
      await apiFetch('/api/savings/goals', { method: 'POST', body: JSON.stringify({ name: form.name, targetAmount: Number(form.targetAmount) }) })
      setShowForm(false); setForm({ name: '', targetAmount: '' }); loadGoals()
    } catch (e) { setError(e.message) }
  }

  async function deposit(id, amountOverride) {
    const amount = Number(amountOverride != null ? amountOverride : depositAmount)
    if (!amount || amount <= 0) return
    try {
      await apiFetch(`/api/savings/goals/${id}/deposit`, { method: 'POST', body: JSON.stringify({ amount }) })
      setDepositId(null); setDepositAmount(''); loadGoals()
    } catch (e) { setError(e.message) }
  }

  async function deleteGoal(id) {
    try { await apiFetch(`/api/savings/goals/${id}`, { method: 'DELETE' }); loadGoals() }
    catch (e) { setError(e.message) }
  }

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.savedAmount), 0)

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{tr('savings.title')}</h1>
          <button style={s.btnPrimary} onClick={() => setShowForm(true)}>{tr('savings.addGoal')}</button>
        </div>

        {error && <p style={s.error}>{error}</p>}

        {/* Savings account — money set aside in the budget */}
        <div style={s.accountCard}>
          <div style={s.acctCol}>
            <span style={s.acctLabel}>{tr('savings.balance')}</span>
            <span style={s.acctValue}>{fmt(budgetSavings)}</span>
          </div>
          <div style={s.acctCol}>
            <span style={s.acctLabel}>{tr('savings.takenOut')}</span>
            <span style={{ ...s.acctValue, color: '#9b2020' }}>{fmt(0)}</span>
          </div>
          <div style={s.acctCol}>
            <span style={s.acctLabel}>{tr('savings.available')}</span>
            <span style={{ ...s.acctValue, color: '#1e6b3a' }}>{fmt(budgetSavings)}</span>
          </div>
        </div>

        {goals.length > 0 && (
          <div style={{ ...s.totalCard, background: badge.green.bg }}>
            <span style={{ color: badge.green.color, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('savings.totalSaved')}</span>
            <span style={{ color: badge.green.color, fontSize: 26, fontWeight: 700 }}>{fmt(totalSaved)}</span>
          </div>
        )}

        {showForm && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>{tr('savings.newGoal')}</h3>
            <form onSubmit={addGoal} style={s.formCol}>
              <input style={s.input} placeholder={tr('savings.namePlaceholder')} required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input style={s.input} type="number" min="0.01" step="0.01" placeholder={tr('savings.target')} required value={form.targetAmount}
                onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={s.btnPrimary}>{tr('common.add')}</button>
                <button type="button" style={s.btnSecondary} onClick={() => setShowForm(false)}>{tr('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {loading && <p style={s.muted}>{tr('common.loading')}</p>}
        {!loading && goals.length === 0 && <div style={s.empty}>{tr('savings.empty')}</div>}

        {goals.map(g => {
          const pct = Number(g.targetAmount) > 0 ? Math.min(Math.round(Number(g.savedAmount) / Number(g.targetAmount) * 100), 100) : 0
          return (
            <div key={g.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: t.navy }}>{g.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {g.reached
                    ? <span style={{ ...s.pill, ...badge.green }}>{tr('savings.reached')}</span>
                    : <button style={s.btnSmall} onClick={() => { setDepositId(depositId === g.id ? null : g.id); setDepositAmount('') }}>{tr('savings.deposit')}</button>}
                  <button style={s.deleteBtn} onClick={() => deleteGoal(g.id)}><Ico e="✕" size={13} /></button>
                </div>
              </div>

              <div style={s.barTrack}>
                <div style={{ ...s.barFill, width: `${pct}%`, background: '#2e8b57' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: t.navyLight }}>
                <span>{fmt(g.savedAmount)} {tr('savings.of')} {fmt(g.targetAmount)} · {pct}%</span>
                <span style={{ fontWeight: 700, color: g.reached ? '#1e6b3a' : t.navy }}>{tr('savings.remaining')}: {fmt(g.remaining)}</span>
              </div>

              {depositId === g.id && !g.reached && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input style={{ ...s.input, flex: 1 }} type="number" min="0.01" step="0.01" autoFocus
                    placeholder={tr('savings.depositAmount')} value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)} />
                  <button style={s.btnPrimary} onClick={() => deposit(g.id)}>{tr('savings.deposit')}</button>
                </div>
              )}
            </div>
          )
        })}
      </main>
    </PageShell>
  )
}

const s = {
  main:        { maxWidth: 720, width: '100%', margin: '0 auto' },
  titleRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  title:       { fontSize: 24, fontWeight: 700, color: t.navy, margin: 0 },
  totalCard:   { borderRadius: 12, padding: '14px 20px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 4 },
  accountCard: { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 },
  acctCol:     { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, textAlign: 'center' },
  acctLabel:   { fontSize: 11, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.06em' },
  acctValue:   { fontSize: 22, fontWeight: 800, color: t.navy },
  card:        { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 14 },
  cardTitle:   { fontSize: 13, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' },
  barTrack:    { height: 8, background: t.borderLight, borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  pill:        { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  formCol:     { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 },
  input:       { width: '100%', padding: '10px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:  { padding: '9px 20px', background: '#2e8b57', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  btnSecondary:{ padding: '9px 16px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 14, color: t.navyLight, cursor: 'pointer' },
  btnSmall:    { padding: '5px 14px', border: 'none', borderRadius: 6, background: '#2e8b57', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  deleteBtn:   { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 15, flexShrink: 0 },
  muted:       { color: t.navyLight, fontSize: 14 },
  error:       { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:       { textAlign: 'center', padding: '56px 0', color: t.navyLight, fontSize: 15 },
}
