import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { parseAccountsFile } from '../utils/importAccounts'
import { t, badge } from '../theme'
import Ico from '../components/Icon'

const TYPES = [
  { key: 'CASH',       icon: '💵' },
  { key: 'BANK',       icon: '🏦' },
  { key: 'INVESTMENT', icon: '📈' },
]

export default function AccountsPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { premium, fmt } = useUser()
  const { t: tr } = useT()

  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ name: '', type: 'BANK', balance: '' })
  const [editId, setEditId]     = useState(null)
  const [editVal, setEditVal]   = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef(null)

  async function handleImport(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true); setError(''); setImportMsg('')
    try {
      const rows = await parseAccountsFile(file)
      if (!rows.length) { setError(tr('accounts.importEmpty')); return }
      for (const r of rows)
        await apiFetch('/api/accounts', { method: 'POST', body: JSON.stringify({ name: r.name, type: r.type, balance: r.balance }) })
      setImportMsg(tr('accounts.imported', { count: rows.length }))
      load()
    } catch (err) {
      setError(err.message || tr('accounts.importEmpty'))
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => { premium ? load() : setLoading(false) }, [premium])

  async function load() {
    setLoading(true); setError('')
    try { setAccounts(await apiFetch('/api/accounts') || []) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  async function addAccount(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await apiFetch('/api/accounts', { method: 'POST', body: JSON.stringify({ name: form.name.trim(), type: form.type, balance: Number(form.balance) || 0 }) })
      setForm({ name: '', type: 'BANK', balance: '' }); load()
    } catch (e) { setError(e.message) }
  }
  async function saveBalance(id) {
    try { await apiFetch(`/api/accounts/${id}/balance`, { method: 'PATCH', body: JSON.stringify({ balance: Number(editVal) || 0 }) }); setEditId(null); load() }
    catch (e) { setError(e.message) }
  }
  async function del(id) {
    try { await apiFetch(`/api/accounts/${id}`, { method: 'DELETE' }); load() }
    catch (e) { setError(e.message) }
  }

  const netWorth = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const iconFor = key => (TYPES.find(x => x.key === key)?.icon ?? '💼')

  const typeTab = (active) => ({
    flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
    background: active ? '#e8eefb' : '#fff', color: active ? t.navyMid : t.navyLight,
  })

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '28px 32px' }}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{tr('accounts.title')}</h1>
          {premium && (
            <>
              <button style={s.connectBtn} onClick={() => fileRef.current?.click()} disabled={importing}>
                <Ico e="⬆" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{importing ? tr('accounts.importing') : tr('accounts.import')}
              </button>
              <input ref={fileRef} type="file" accept=".csv,.xml,.pdf" style={{ display: 'none' }} onChange={handleImport} />
            </>
          )}
        </div>

        {!premium ? (
          <div style={s.upsell}>
            <p style={{ fontSize: 15, color: t.navy, marginBottom: 14 }}>{tr('accounts.upsell')}</p>
            <button style={s.cta} onClick={() => navigate('/premium')}>{tr('premium.upgrade')}</button>
          </div>
        ) : loading ? (
          <p style={s.muted}>{tr('common.loading')}</p>
        ) : (
          <>
            {error && <p style={s.error}>{error}</p>}
            {importMsg && <div style={s.note}>{importMsg}</div>}
            <div style={{ ...s.hint }}>{tr('accounts.importHint')}</div>

            <div style={{ ...s.totalCard, background: badge.blue.bg }}>
              <span style={{ color: badge.blue.color, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('accounts.netWorth')}</span>
              <span style={{ color: badge.blue.color, fontSize: 28, fontWeight: 800 }}>{fmt(netWorth)}</span>
            </div>

            <form onSubmit={addAccount} style={s.card}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {TYPES.map(tp => (
                  <button key={tp.key} type="button" style={typeTab(form.type === tp.key)} onClick={() => setForm(f => ({ ...f, type: tp.key }))}>
                    <Ico e={tp.icon} size={16} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />{tr('actype.' + tp.key)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input style={{ ...s.input, flex: 2, minWidth: 120 }} placeholder={tr('accounts.namePlaceholder')} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <input style={{ ...s.input, flex: 1, minWidth: 90 }} type="number" step="0.01" placeholder={tr('accounts.balance')} value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
                <button type="submit" style={s.btnPrimary}>{tr('common.add')}</button>
              </div>
            </form>

            {accounts.length === 0 && <div style={s.empty}>{tr('accounts.empty')}</div>}

            {accounts.map(a => (
              <div key={a.id} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                <span style={{ display: 'inline-flex' }}><Ico e={iconFor(a.type)} size={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: t.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: t.navyLight }}>{tr('actype.' + a.type)}</div>
                </div>
                {editId === a.id ? (
                  <>
                    <input style={{ ...s.input, width: 100 }} type="number" step="0.01" autoFocus value={editVal}
                      onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveBalance(a.id)} />
                    <button style={s.btnSmall} onClick={() => saveBalance(a.id)}><Ico e="✓" size={14} /></button>
                  </>
                ) : (
                  <span style={{ fontSize: 17, fontWeight: 700, color: t.navy, cursor: 'pointer' }}
                    onClick={() => { setEditId(a.id); setEditVal(String(a.balance)) }}>{fmt(a.balance)}</span>
                )}
                <button style={s.deleteBtn} onClick={() => del(a.id)}><Ico e="✕" size={13} /></button>
              </div>
            ))}
          </>
        )}
      </main>
    </PageShell>
  )
}

const s = {
  main:      { maxWidth: 680, width: '100%', margin: '0 auto' },
  titleRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  title:     { fontSize: 22, fontWeight: 700, color: t.navy, margin: 0 },
  totalCard: { borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 },
  card:      { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 12 },
  input:     { padding: '9px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:{ padding: '9px 18px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  btnSmall:  { padding: '8px 12px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  connectBtn:{ padding: '7px 14px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: t.navyMid, cursor: 'pointer' },
  deleteBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  note:      { background: '#e6f4ea', border: `1px solid #bcdcc4`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e6b3a', marginBottom: 14 },
  hint:      { fontSize: 12, color: t.navyLight, marginBottom: 14 },
  upsell:    { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, textAlign: 'center' },
  cta:       { padding: '12px 22px', background: t.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  muted:     { color: t.navyLight, fontSize: 14 },
  error:     { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:     { textAlign: 'center', padding: '40px 0', color: t.navyLight, fontSize: 15 },
}
