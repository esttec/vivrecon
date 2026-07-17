import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { scanReceiptTotal } from '../utils/receiptScan'
import { t, badge } from '../theme'

const thisMonth = () => new Date().toISOString().slice(0, 7)
function addMonths(ym, d) {
  const [y, m] = ym.split('-').map(Number)
  const dt = new Date(y, m - 1 + d, 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function fmtMonth(ym, locale) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
}

export default function ChildrenPage() {
  const isMobile = useIsMobile()
  const { fmt } = useUser()
  const { t: tr, lang } = useT()

  const [yearMonth, setYearMonth] = useState(thisMonth())
  const [children, setChildren]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [newName, setNewName]     = useState('')
  const [forms, setForms]         = useState({})       // childId -> { name, amount }
  const [scanning, setScanning]   = useState(false)
  const scanFor = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { load() }, [yearMonth])

  async function load() {
    setLoading(true); setError('')
    try { setChildren(await apiFetch(`/api/children/${yearMonth}`) || []) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function addChild(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try { await apiFetch('/api/children', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) }); setNewName(''); load() }
    catch (e) { setError(e.message) }
  }
  async function delChild(id) {
    try { await apiFetch(`/api/children/${id}`, { method: 'DELETE' }); load() }
    catch (e) { setError(e.message) }
  }

  const getForm = id => forms[id] || { name: '', amount: '' }
  const setForm = (id, patch) => setForms(f => ({ ...f, [id]: { ...getForm(id), ...patch } }))

  async function addExpense(id) {
    const f = getForm(id)
    if (!f.name.trim() || !f.amount) return
    try {
      await apiFetch(`/api/children/${id}/expenses`, { method: 'POST', body: JSON.stringify({ name: f.name.trim(), amount: Number(f.amount) || 0, yearMonth }) })
      setForms(fs => ({ ...fs, [id]: { name: '', amount: '' } })); load()
    } catch (e) { setError(e.message) }
  }
  async function delExpense(id) {
    try { await apiFetch(`/api/children/expenses/${id}`, { method: 'DELETE' }); load() }
    catch (e) { setError(e.message) }
  }

  function openScan(id) { scanFor.current = id; fileRef.current?.click() }
  async function handleReceipt(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    const id = scanFor.current
    if (!file || id == null) return
    setScanning(true); setError('')
    try {
      const total = await scanReceiptTotal(file)
      if (!total) { setError(tr('eating.scanFailed')); return }
      setForm(id, { name: tr('budget.receipt'), amount: total.toFixed(2) })
    } catch { setError(tr('eating.scanFailed')) }
    finally { setScanning(false) }
  }

  const grandTotal = children.reduce((sum, c) => sum + Number(c.total), 0)

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '28px 32px' }}>
        <h1 style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 8 }}><Ico e="🧒" size={22} />{tr('nav.children')}</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 16px' }}>
          <button style={s.navBtn} onClick={() => setYearMonth(addMonths(yearMonth, -1))}>‹</button>
          <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: t.navy }}>{fmtMonth(yearMonth, lang)}</span>
          <button style={s.navBtn} onClick={() => setYearMonth(addMonths(yearMonth, 1))} disabled={yearMonth >= thisMonth()}>›</button>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <div style={{ ...s.totalCard, background: badge.blue.bg }}>
          <span style={{ color: badge.blue.color, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('children.total')}</span>
          <span style={{ color: badge.blue.color, fontSize: 26, fontWeight: 800 }}>{fmt(grandTotal)}</span>
        </div>

        <form onSubmit={addChild} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input style={{ ...s.input, flex: 1 }} placeholder={tr('children.namePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} />
          <button type="submit" style={s.btnPrimary}>+ {tr('children.addChild')}</button>
        </form>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleReceipt} />

        {loading ? <p style={s.muted}>{tr('common.loading')}</p>
          : children.length === 0 ? <div style={s.empty}>{tr('children.empty')}</div>
          : children.map(c => (
            <div key={c.id} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Ico e="🧒" size={20} />
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: t.navy }}>{c.name}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: t.navy }}>{fmt(c.total)}</span>
                <button style={s.deleteBtn} onClick={() => delChild(c.id)}><Ico e="✕" size={13} /></button>
              </div>

              {c.expenses.map(x => (
                <div key={x.id} style={s.expRow}>
                  <span style={{ flex: 1, fontSize: 14, color: t.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.navy }}>{fmt(x.amount)}</span>
                  <button style={s.deleteBtn} onClick={() => delExpense(x.id)}><Ico e="✕" size={12} /></button>
                </div>
              ))}
              {c.expenses.length === 0 && <div style={{ fontSize: 13, color: t.navyLight, padding: '4px 0 8px' }}>{tr('children.noExpenses')}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <input style={{ ...s.input, flex: 2, minWidth: 110 }} placeholder={tr('children.expenseName')} value={getForm(c.id).name} onChange={e => setForm(c.id, { name: e.target.value })} />
                <input style={{ ...s.input, width: 88 }} type="number" step="0.01" placeholder={tr('common.amount')} value={getForm(c.id).amount} onChange={e => setForm(c.id, { amount: e.target.value })} />
                <button style={s.btnSmall} onClick={() => addExpense(c.id)}>{tr('common.add')}</button>
                <button style={s.scanBtn} onClick={() => openScan(c.id)} disabled={scanning} title={tr('eating.scanReceipt')}><Ico e="📷" size={16} /></button>
              </div>
            </div>
          ))}
      </main>
    </PageShell>
  )
}

const s = {
  main:      { maxWidth: 680, width: '100%', margin: '0 auto' },
  title:     { fontSize: 22, fontWeight: 700, color: t.navy, margin: 0 },
  navBtn:    { width: 34, height: 34, borderRadius: 8, border: `1px solid ${t.border}`, background: '#fff', color: t.navy, fontSize: 18, cursor: 'pointer' },
  totalCard: { borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 },
  card:      { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 12 },
  expRow:    { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${t.borderLight}` },
  input:     { padding: '9px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:{ padding: '9px 16px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  btnSmall:  { padding: '8px 14px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  scanBtn:   { padding: '7px 12px', background: '#fff', color: t.navyMid, border: `1.5px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' },
  deleteBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  error:     { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  muted:     { color: t.navyLight, fontSize: 14 },
  empty:     { textAlign: 'center', padding: '36px 0', color: t.navyLight, fontSize: 15 },
}
