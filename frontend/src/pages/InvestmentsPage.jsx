import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t } from '../theme'

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { asset: '', direction: 'LONG', openDate: today(), qty: '', openPrice: '', closeDate: '', closePrice: '', fees: '', note: '' }

// Result of a closed position: long earns when the price rises, short when it falls.
export function positionResult(p) {
  if (p.closePrice == null) return null
  const diff = (Number(p.closePrice) - Number(p.openPrice)) * (p.direction === 'SHORT' ? -1 : 1)
  return diff * Number(p.qty) - Number(p.fees || 0)
}

export default function InvestmentsPage() {
  const isMobile = useIsMobile()
  const { fmt } = useUser()
  const { t: tr } = useT()
  const [kind, setKind] = useState('INVEST')          // INVEST | TRADE
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(null)               // null = closed, {} = new/edit
  const [error, setError] = useState('')

  async function load() {
    try { setRows(await apiFetch(`/api/positions?kind=${kind}`) || []) } catch (e) { setError(e.message) }
  }
  useEffect(() => { load(); setForm(null) }, [kind])

  async function save(e) {
    e.preventDefault(); setError('')
    const body = {
      kind, asset: form.asset, direction: kind === 'TRADE' ? form.direction : 'LONG',
      openDate: form.openDate, closeDate: form.closeDate || null,
      qty: Number(form.qty), openPrice: Number(form.openPrice),
      closePrice: form.closePrice === '' ? null : Number(form.closePrice),
      fees: Number(form.fees || 0), note: form.note || null,
    }
    try {
      await apiFetch(form.id ? `/api/positions/${form.id}` : '/api/positions',
        { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(body) })
      setForm(null); load()
    } catch (err) { setError(err.message) }
  }

  async function remove(id) {
    if (!window.confirm(tr('inv.confirmDelete'))) return
    await apiFetch(`/api/positions/${id}`, { method: 'DELETE' }); setForm(null); load()
  }

  const open = rows.filter(p => p.closePrice == null)
  const closed = rows.filter(p => p.closePrice != null)
  const investedOpen = open.reduce((a, p) => a + Number(p.qty) * Number(p.openPrice), 0)
  const results = closed.map(positionResult)
  const realized = results.reduce((a, r) => a + r, 0)
  const wins = results.filter(r => r > 0).length
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const money = v => <span style={{ color: v > 0 ? '#1e6b3a' : v < 0 ? '#c0392b' : t.navy, fontWeight: 700 }}>{v > 0 ? '+' : ''}{fmt(v.toFixed(2))}</span>

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{tr('inv.title')}</h1>
          <div style={s.tabs}>
            {['INVEST', 'TRADE'].map(k => (
              <button key={k} style={{ ...s.tab, ...(kind === k ? s.tabActive : {}) }} onClick={() => setKind(k)}>
                {tr(k === 'INVEST' ? 'inv.tabInvest' : 'inv.tabTrade')}
              </button>
            ))}
          </div>
        </div>
        {error && <p style={s.error}>{error}</p>}

        <div style={s.summary}>
          <div style={s.sumCol}><span style={s.sumLabel}>{tr('inv.openValue')}</span><b style={s.sumVal}>{fmt(investedOpen.toFixed(2))}</b></div>
          <div style={s.sumCol}><span style={s.sumLabel}>{tr('inv.realized')}</span><b style={s.sumVal}>{money(realized)}</b></div>
          <div style={s.sumCol}><span style={s.sumLabel}>{tr('inv.winRate')}</span>
            <b style={s.sumVal}>{closed.length ? `${Math.round(wins / closed.length * 100)}%` : '—'}</b>
            <span style={s.sumLabel}>{wins}/{closed.length}</span></div>
        </div>

        {!form && <button style={s.btnPrimary} onClick={() => setForm({ ...EMPTY })}>+ {tr('inv.add')}</button>}

        {form && (
          <form style={s.card} onSubmit={save}>
            <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
              <label style={s.lbl}>{tr('inv.asset')}<input style={s.input} required value={form.asset} onChange={set('asset')} placeholder="AAPL, BTC, Gold…" /></label>
              {kind === 'TRADE' && <label style={s.lbl}>{tr('inv.direction')}
                <select style={s.input} value={form.direction} onChange={set('direction')}><option value="LONG">Long ↑</option><option value="SHORT">Short ↓</option></select></label>}
              <label style={s.lbl}>{tr('inv.qty')}<input style={s.input} required type="number" step="any" min="0" value={form.qty} onChange={set('qty')} /></label>
              <label style={s.lbl}>{tr('inv.openDate')}<input style={s.input} required type="date" value={form.openDate} onChange={set('openDate')} /></label>
              <label style={s.lbl}>{tr('inv.openPrice')}<input style={s.input} required type="number" step="any" min="0" value={form.openPrice} onChange={set('openPrice')} /></label>
              <label style={s.lbl}>{tr('inv.closeDate')}<input style={s.input} type="date" value={form.closeDate || ''} onChange={set('closeDate')} /></label>
              <label style={s.lbl}>{tr('inv.closePrice')}<input style={s.input} type="number" step="any" min="0" value={form.closePrice ?? ''} onChange={set('closePrice')} /></label>
              <label style={s.lbl}>{tr('inv.fees')}<input style={s.input} type="number" step="any" value={form.fees} onChange={set('fees')} /></label>
              <label style={{ ...s.lbl, gridColumn: '1 / -1' }}>{tr('inv.note')}<input style={s.input} value={form.note || ''} onChange={set('note')} /></label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={s.btnPrimary} type="submit">{tr('common.save')}</button>
              <button style={s.btnGhost} type="button" onClick={() => setForm(null)}>{tr('common.cancel')}</button>
              {form.id && <button style={{ ...s.btnGhost, color: '#c0392b', marginLeft: 'auto' }} type="button" onClick={() => remove(form.id)}>{tr('inv.delete')}</button>}
            </div>
          </form>
        )}

        <div style={{ ...s.card, padding: 0, overflowX: 'auto' }}>
          {rows.length === 0 ? <p style={s.empty}>{tr('inv.empty')}</p> : (
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>{tr('inv.asset')}</th>
                {kind === 'TRADE' && <th style={s.th}>L/S</th>}
                <th style={s.th}>{tr('inv.openDate')}</th><th style={s.th}>{tr('inv.closeDate')}</th>
                <th style={s.thR}>{tr('inv.qty')}</th><th style={s.thR}>{tr('inv.openPrice')}</th><th style={s.thR}>{tr('inv.closePrice')}</th>
                <th style={s.thR}>{tr('inv.fees')}</th><th style={s.thR}>{tr('inv.result')}</th><th style={s.thR}>%</th>
              </tr></thead>
              <tbody>
                {rows.map(p => {
                  const r = positionResult(p)
                  const cost = Number(p.qty) * Number(p.openPrice)
                  return (
                    <tr key={p.id} style={s.tr} onClick={() => setForm({ ...p, closeDate: p.closeDate || '', closePrice: p.closePrice ?? '' })}>
                      <td style={s.td}><b>{p.asset}</b>{p.note && <div style={s.note}>{p.note}</div>}</td>
                      {kind === 'TRADE' && <td style={s.td}>{p.direction === 'SHORT' ? '↓ S' : '↑ L'}</td>}
                      <td style={s.td}>{p.openDate}</td>
                      <td style={s.td}>{p.closeDate || <span style={s.openBadge}>{tr('inv.open')}</span>}</td>
                      <td style={s.tdR}>{Number(p.qty)}</td>
                      <td style={s.tdR}>{Number(p.openPrice)}</td>
                      <td style={s.tdR}>{p.closePrice != null ? Number(p.closePrice) : '—'}</td>
                      <td style={s.tdR}>{Number(p.fees) ? Number(p.fees).toFixed(2) : '—'}</td>
                      <td style={s.tdR}>{r == null ? '—' : money(r)}</td>
                      <td style={s.tdR}>{r == null || !cost ? '—' : `${(r / cost * 100).toFixed(1)}%`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p style={s.muted}>{tr('inv.hint')}</p>
      </main>
    </PageShell>
  )
}

const s = {
  main:      { maxWidth: 1000, width: '100%', margin: '0 auto' },
  titleRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: 700, color: t.navy, margin: 0 },
  tabs:      { display: 'flex', gap: 4, background: t.borderLight, padding: 4, borderRadius: 10 },
  tab:       { padding: '7px 14px', border: 'none', borderRadius: 8, background: 'transparent', color: t.navyLight, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tabActive: { background: '#fff', color: t.navy },
  summary:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 14 },
  sumCol:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  sumLabel:  { fontSize: 11, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' },
  sumVal:    { fontSize: 20, color: t.navy },
  card:      { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, margin: '12px 0' },
  grid:      { display: 'grid', gap: 10 },
  lbl:       { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: t.navyLight },
  input:     { padding: '9px 10px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', boxSizing: 'border-box', width: '100%' },
  btnPrimary:{ padding: '9px 16px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGhost:  { padding: '9px 16px', background: '#fff', color: t.navy, border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: t.navy, minWidth: 720 },
  th:        { textAlign: 'left', padding: '10px 12px', fontSize: 11, color: t.navyLight, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' },
  thR:       { textAlign: 'right', padding: '10px 12px', fontSize: 11, color: t.navyLight, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' },
  tr:        { cursor: 'pointer', borderBottom: `1px solid ${t.borderLight}` },
  td:        { padding: '10px 12px', whiteSpace: 'nowrap' },
  tdR:       { padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' },
  note:      { fontSize: 11, color: t.navyLight, fontWeight: 400 },
  openBadge: { fontSize: 11, fontWeight: 700, color: '#2a4d8f', background: '#e8eefc', padding: '2px 8px', borderRadius: 6 },
  error:     { color: '#c0392b', fontSize: 14 },
  muted:     { color: t.navyLight, fontSize: 12 },
  empty:     { textAlign: 'center', padding: '36px 0', color: t.navyLight, fontSize: 15, margin: 0 },
}
