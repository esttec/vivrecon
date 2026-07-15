import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { scanReceiptTotal } from '../utils/receiptScan'
import { t, badge } from '../theme'

const FABRICS  = ['COTTON','LINEN','WOOL','SILK','BAMBOO','HEMP','OTHER_NATURAL','SYNTHETIC']
const STATUSES = ['NEEDED','FOUND','PURCHASED']
const thisMonth = () => new Date().toISOString().slice(0, 7)

const STATUS_BADGE = { NEEDED: badge.amber, FOUND: badge.blue, PURCHASED: badge.green }

export default function ClothingPage() {
  const isMobile = useIsMobile()
  const { fmt } = useUser()
  const { t: tr } = useT()
  const [yearMonth, setYearMonth] = useState(thisMonth())
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ itemName: '', description: '', preferredFabric: '', maxBudget: '' })
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
      setForm(f => ({ ...f, itemName: tr('budget.receipt'), maxBudget: total.toFixed(2) }))
      setShowForm(true)
    } catch { setError(tr('eating.scanFailed')) }
    finally { setScanning(false) }
  }

  useEffect(() => { loadItems() }, [yearMonth])

  async function loadItems() {
    setLoading(true); setError('')
    try { setItems(await apiFetch(`/api/clothes?yearMonth=${yearMonth}`)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function addItem(e) {
    e.preventDefault()
    try {
      await apiFetch('/api/clothes', { method: 'POST', body: JSON.stringify({ itemName: form.itemName, description: form.description || null, preferredFabric: form.preferredFabric || null, maxBudget: form.maxBudget ? Number(form.maxBudget) : null, yearMonth }) })
      setShowForm(false); setForm({ itemName: '', description: '', preferredFabric: '', maxBudget: '' }); loadItems()
    } catch (e) { setError(e.message) }
  }

  async function updateStatus(id, status) {
    try { await apiFetch(`/api/clothes/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); loadItems() }
    catch (e) { setError(e.message) }
  }

  async function deleteItem(id) {
    try { await apiFetch(`/api/clothes/${id}`, { method: 'DELETE' }); loadItems() }
    catch (e) { setError(e.message) }
  }

  const grouped = STATUSES.reduce((acc, st) => { acc[st] = items.filter(i => i.status === st); return acc }, {})

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        <div style={{ ...s.titleRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 12 }}>
          <h1 style={s.title}>{tr('clothing.title')}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} style={s.monthPicker} />
            <button style={s.btnSecondary} onClick={() => fileRef.current?.click()} disabled={scanning}>
              <Ico e="📷" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 5 }} />{scanning ? tr('eating.scanning') : tr('eating.scanReceipt')}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleReceipt} />
            <button style={s.btnPrimary} onClick={() => setShowForm(true)}>{tr('clothing.addItem')}</button>
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {STATUSES.map(status => (
            <div key={status} style={{ ...s.statCard, background: STATUS_BADGE[status].bg }}>
              <span style={{ color: STATUS_BADGE[status].color, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('cstatus.' + status)}</span>
              <span style={{ color: STATUS_BADGE[status].color, fontSize: 28, fontWeight: 700 }}>{grouped[status].length}</span>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>{tr('clothing.newItem')}</h3>
            <form onSubmit={addItem}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={s.label}>{tr('clothing.itemName')}</label>
                  <input style={s.input} placeholder={tr('clothing.itemNamePlaceholder')} required value={form.itemName}
                    onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>{tr('clothing.maxBudget')}</label>
                  <input style={s.input} type="number" placeholder="0.00" min="0" step="0.01"
                    value={form.maxBudget} onChange={e => setForm(f => ({ ...f, maxBudget: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>{tr('clothing.preferredFabric')}</label>
                  <select style={s.input} value={form.preferredFabric}
                    onChange={e => setForm(f => ({ ...f, preferredFabric: e.target.value }))}>
                    <option value="">{tr('clothing.any')}</option>
                    {FABRICS.map(fb => <option key={fb} value={fb}>{tr('fabric.' + fb)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>{tr('clothing.description')}</label>
                  <input style={s.input} placeholder={tr('clothing.descPlaceholder')}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={s.btnPrimary}>{tr('common.add')}</button>
                <button type="button" style={s.btnSecondary} onClick={() => setShowForm(false)}>{tr('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {loading && <p style={s.muted}>{tr('common.loading')}</p>}
        {!loading && items.length === 0 && <div style={s.empty}>{tr('clothing.empty', { month: yearMonth })}</div>}

        {!loading && items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
            {STATUSES.map(status => (
              <div key={status}>
                <div style={{ ...s.kanbanHeader, ...STATUS_BADGE[status], marginBottom: 10 }}>{tr('cstatus.' + status)}</div>
                {grouped[status].length === 0 && <p style={{ ...s.muted, textAlign: 'center', padding: '8px 0' }}>—</p>}
                {grouped[status].map(item => (
                  <div key={item.id} style={s.kanbanCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: t.navy }}>{item.itemName}</span>
                      <button style={s.deleteBtn} onClick={() => deleteItem(item.id)}><Ico e="✕" size={13} /></button>
                    </div>
                    {item.description && <p style={{ fontSize: 12, color: t.navyLight, margin: '4px 0 0' }}>{item.description}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                      {item.preferredFabric && <span style={{ ...s.pill, ...badge.grey }}>{tr('fabric.' + item.preferredFabric)}</span>}
                      {item.maxBudget && <span style={{ ...s.pill, ...badge.blue }}>{tr('clothing.max')} {fmt(item.maxBudget)}</span>}
                      {item.actualPrice && <span style={{ ...s.pill, ...badge.green }}>{tr('clothing.paid')} {fmt(item.actualPrice)}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                      {STATUSES.filter(st => st !== status).map(st => (
                        <button key={st} style={s.btnTiny} onClick={() => updateStatus(item.id, st)}><Ico e="→" size={12} style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 3 }} />{tr('cstatus.' + st)}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  )
}

const s = {
  main:        { maxWidth: 1100, width: '100%', margin: '0 auto' },
  titleRow:    { display: 'flex', justifyContent: 'space-between', marginBottom: 20 },
  title:       { fontSize: 24, fontWeight: 700, color: t.navy, margin: 0 },
  monthPicker: { padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff' },
  statCard:    { borderRadius: 12, padding: '14px 18px' },
  card:        { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, marginBottom: 16 },
  cardTitle:   { fontSize: 13, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' },
  label:       { display: 'block', fontSize: 12, color: t.navyLight, fontWeight: 500, marginBottom: 5 },
  input:       { width: '100%', padding: '9px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  kanbanHeader:{ padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' },
  kanbanCard:  { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: 13, marginBottom: 10 },
  pill:        { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 },
  deleteBtn:   { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 13, flexShrink: 0 },
  btnTiny:     { padding: '3px 8px', border: `1px solid ${t.border}`, borderRadius: 6, background: '#fff', fontSize: 11, color: t.navyLight, cursor: 'pointer' },
  btnPrimary:  { padding: '9px 20px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '9px 16px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 14, color: t.navyLight, cursor: 'pointer' },
  muted:       { color: t.navyLight, fontSize: 13 },
  error:       { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:       { textAlign: 'center', padding: '48px 0', color: t.navyLight, fontSize: 15 },
}
