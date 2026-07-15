import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { scanReceiptTotal } from '../utils/receiptScan'
import { t, badge } from '../theme'

const EXPENSE_TYPES = ['RENT','FURNITURE','HOUSEHOLD','CLEANING_SUPPLIES','DECORATIONS','UTILITIES','OTHER']
const thisMonth = () => new Date().toISOString().slice(0, 7)

const TYPE_BADGE = {
  RENT:              badge.blue,
  FURNITURE:         badge.green,
  HOUSEHOLD:         badge.blue,
  CLEANING_SUPPLIES: badge.grey,
  DECORATIONS:       badge.amber,
  UTILITIES:         badge.amber,
  OTHER:             badge.grey,
}

export default function HousePage() {
  const isMobile = useIsMobile()
  const { profile, fmt } = useUser()
  const { t: tr } = useT()
  const [yearMonth, setYearMonth] = useState(thisMonth())
  const [expenses, setExpenses]   = useState([])
  const [houseBudget, setHouseBudget] = useState(0) // amount marked as House in the budget
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ expenseType: 'RENT', name: '', amount: '' })
  const [scanning, setScanning]   = useState(false)
  const fileRef = useRef(null)

  async function handleReceipt(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setScanning(true); setError('')
    try {
      const total = await scanReceiptTotal(file)
      if (!total) { setError(tr('eating.scanFailed')); return }
      setForm(f => ({ ...f, name: tr('budget.receipt'), amount: total.toFixed(2) }))
      setShowForm(true)
    } catch { setError(tr('eating.scanFailed')) }
    finally { setScanning(false) }
  }

  useEffect(() => { loadExpenses() }, [yearMonth])

  async function loadExpenses() {
    setLoading(true)
    setError('')
    try {
      const [data, budget] = await Promise.all([
        apiFetch(`/api/house/${yearMonth}`),
        apiFetch(`/api/budget/${yearMonth}`),
      ])
      setExpenses(data)
      // What was marked for House in the budget this month.
      const marked = (budget?.expenseLines || [])
        .filter(l => l.category === 'HOUSE')
        .reduce((s, l) => s + Number(l.amount), 0)
      setHouseBudget(marked)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function addExpense(e) {
    e.preventDefault()
    try {
      await apiFetch('/api/house', {
        method: 'POST',
        body: JSON.stringify({ ...form, amount: Number(form.amount), yearMonth }),
      })
      setShowForm(false)
      setForm({ expenseType: 'RENT', name: '', amount: '' })
      loadExpenses()
    } catch (e) { setError(e.message) }
  }

  async function deleteExpense(id) {
    try {
      await apiFetch(`/api/house/${id}`, { method: 'DELETE' })
      loadExpenses()
    } catch (e) { setError(e.message) }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const grouped = EXPENSE_TYPES.reduce((acc, type) => {
    const items = expenses.filter(e => e.expenseType === type)
    if (items.length) acc[type] = items
    return acc
  }, {})

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        <div style={{ ...s.titleRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 12 }}>
          <h1 style={s.title}>{tr('house.title')}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} style={s.monthPicker} />
            <button style={s.btnSecondary} onClick={() => fileRef.current?.click()} disabled={scanning}>
              <Ico e="📷" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 5 }} />{scanning ? tr('eating.scanning') : tr('eating.scanReceipt')}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleReceipt} />
            <button style={s.btnPrimary} onClick={() => setShowForm(true)}>{tr('common.addExpense')}</button>
          </div>
        </div>

        {/* Budget vs actual for House — pulled from the budget page */}
        <div style={s.accountCard}>
          <div style={s.acctCol}>
            <span style={s.acctLabel}>{tr('eating.budget')}</span>
            <span style={s.acctValue}>{fmt(houseBudget)}</span>
          </div>
          <div style={s.acctCol}>
            <span style={s.acctLabel}>{tr('budget.spent')}</span>
            <span style={{ ...s.acctValue, color: '#9b2020' }}>{fmt(total)}</span>
          </div>
          <div style={s.acctCol}>
            <span style={s.acctLabel}>{tr('savings.available')}</span>
            <span style={{ ...s.acctValue, color: (houseBudget - total) >= 0 ? '#1e6b3a' : '#c0392b' }}>{fmt(houseBudget - total)}</span>
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        {expenses.length > 0 && (
          <div style={{ ...s.totalCard, background: badge.red.bg }}>
            <span style={{ color: badge.red.color, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('common.totalThisMonth')}</span>
            <span style={{ color: badge.red.color, fontSize: 26, fontWeight: 700 }}>{fmt(total)}</span>
            {profile?.monthlyIncome && total > 0 && (
              <span style={{ color: badge.red.color, fontSize: 13, fontWeight: 600 }}>
                {tr('common.pctOfIncome', { pct: Math.round(total / Number(profile.monthlyIncome) * 100) })}
              </span>
            )}
          </div>
        )}

        {showForm && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>{tr('house.newExpense')}</h3>
            <form onSubmit={addExpense} style={s.formCol}>
              <select style={s.input} value={form.expenseType}
                onChange={e => setForm(f => ({ ...f, expenseType: e.target.value }))}>
                {EXPENSE_TYPES.map(type => <option key={type} value={type}>{tr('htype.' + type)}</option>)}
              </select>
              <input style={s.input} placeholder={tr('common.name')} required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input style={s.input} type="number" placeholder={tr('common.amount')} required min="0" step="0.01"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={s.btnPrimary}>{tr('common.add')}</button>
                <button type="button" style={s.btnSecondary} onClick={() => setShowForm(false)}>{tr('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {loading && <p style={s.muted}>{tr('common.loading')}</p>}
        {!loading && expenses.length === 0 && <div style={s.empty}>{tr('house.empty', { month: yearMonth })}</div>}

        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={s.cardTitle}>{tr('htype.' + type)}</h2>
              <span style={{ ...s.pill, ...TYPE_BADGE[type] }}>
                {fmt(items.reduce((sum, i) => sum + Number(i.amount), 0))}
              </span>
            </div>
            {items.map(item => (
              <div key={item.id} style={s.lineRow}>
                <span style={s.lineDesc}>{item.name}</span>
                <span style={s.lineAmount}>{fmt(item.amount)}</span>
                <button style={s.deleteBtn} onClick={() => deleteExpense(item.id)}><Ico e="✕" size={13} /></button>
              </div>
            ))}
          </div>
        ))}
      </main>
    </PageShell>
  )
}

const s = {
  main:        { maxWidth: 960, width: '100%', margin: '0 auto' },
  titleRow:    { display: 'flex', justifyContent: 'space-between', marginBottom: 24 },
  title:       { fontSize: 24, fontWeight: 700, color: t.navy, margin: 0 },
  monthPicker: { padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff' },
  totalCard:   { borderRadius: 12, padding: '14px 20px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 4 },
  accountCard: { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 },
  acctCol:     { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, textAlign: 'center' },
  acctLabel:   { fontSize: 11, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.06em' },
  acctValue:   { fontSize: 22, fontWeight: 800, color: t.navy },
  card:        { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, marginBottom: 14 },
  cardTitle:   { fontSize: 13, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 },
  lineRow:     { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${t.borderLight}` },
  lineDesc:    { fontSize: 14, color: t.navy, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lineAmount:  { fontSize: 14, fontWeight: 600, color: t.navy, flexShrink: 0 },
  pill:        { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  deleteBtn:   { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: '2px 6px', flexShrink: 0 },
  formCol:     { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 },
  input:       { width: '100%', padding: '10px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:  { padding: '9px 20px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  btnSecondary:{ padding: '9px 16px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 14, color: t.navyLight, cursor: 'pointer' },
  muted:       { color: t.navyLight, fontSize: 14 },
  error:       { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:       { textAlign: 'center', padding: '48px 0', color: t.navyLight, fontSize: 15 },
}
