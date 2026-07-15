import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t, badge } from '../theme'
import Ico from '../components/Icon'

const CATS = [
  { key: 'ENTERTAINMENT', icon: '🎬' },
  { key: 'COMMUNICATION', icon: '📶' },
  { key: 'SPORT',         icon: '🏋️' },
  { key: 'WORK',          icon: '💼' },
  { key: 'HEALTH',        icon: '🏥' },
  { key: 'HOUSE',         icon: '🏠' },
  { key: 'OTHER',         icon: '📦' },
]
const CAT_ICON = Object.fromEntries(CATS.map(c => [c.key, c.icon]))
const CAT_LABELS = { ENTERTAINMENT: 'cat.entertainment', COMMUNICATION: 'cat.communication', SPORT: 'cat.sport', WORK: 'cat.work', HEALTH: 'cat.health', HOUSE: 'cat.house', OTHER: 'cat.other' }

export default function SubscriptionsPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { premium, fmt } = useUser()
  const { t: tr } = useT()

  const [subs, setSubs]     = useState([])
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState('')
  const [showForm, setShow] = useState(false)
  const [form, setForm]     = useState({ name: '', amount: '', category: 'ENTERTAINMENT', billingDay: '1' })

  useEffect(() => { if (premium) load() }, [premium])

  async function load() {
    setLoad(true); setError('')
    try { setSubs(await apiFetch('/api/subscriptions') || []) }
    catch (e) { setError(e.message) }
    finally { setLoad(false) }
  }

  async function addSub(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.amount) return
    try {
      await apiFetch('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          amount: Number(form.amount) || 0,
          billingDay: Number(form.billingDay) || 1,
        }),
      })
      setForm({ name: '', amount: '', category: 'ENTERTAINMENT', billingDay: '1' })
      setShow(false); load()
    } catch (e) { setError(e.message) }
  }

  async function del(id) {
    try { await apiFetch(`/api/subscriptions/${id}`, { method: 'DELETE' }); load() }
    catch (e) { setError(e.message) }
  }

  const monthlyTotal = subs.reduce((sum, x) => sum + Number(x.amount), 0)

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '28px 32px' }}>
        <div style={s.titleRow}>
          <h1 style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 8 }}><Ico e="🔁" size={22} />{tr('subs.title')}</h1>
          {premium && (
            <button style={s.addBtn} onClick={() => setShow(v => !v)}>
              {showForm ? <Ico e="✕" size={14} /> : `+ ${tr('subs.add')}`}
            </button>
          )}
        </div>

        {!premium ? (
          <div style={s.upsell}>
            <p style={{ fontSize: 15, color: t.navy, marginBottom: 14 }}>{tr('subs.upsell')}</p>
            <button style={s.cta} onClick={() => navigate('/premium')}>{tr('premium.upgrade')}</button>
          </div>
        ) : loading ? (
          <p style={s.muted}>{tr('common.loading')}</p>
        ) : (
          <>
            {error && <p style={s.error}>{error}</p>}

            {showForm && (
              <form onSubmit={addSub} style={s.card}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {CATS.map(c => (
                    <button key={c.key} type="button"
                      style={catTab(form.category === c.key)}
                      onClick={() => setForm(f => ({ ...f, category: c.key }))}>
                      <Ico e={c.icon} size={18} tip={tr(CAT_LABELS[c.key] || 'cat.other')} />
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input style={{ ...s.input, flex: 2, minWidth: 130 }} placeholder={tr('subs.namePlaceholder')}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  <input style={{ ...s.input, flex: 1, minWidth: 80 }} type="number" step="0.01" placeholder={tr('common.amount')}
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  <input style={{ ...s.input, width: 96 }} type="number" min="1" max="31" title={tr('subs.dayLabel')}
                    value={form.billingDay} onChange={e => setForm(f => ({ ...f, billingDay: e.target.value }))} />
                  <button type="submit" style={s.btnPrimary}>{tr('common.add')}</button>
                </div>
              </form>
            )}

            <div style={s.hint}>{tr('subs.hint')}</div>

            <div style={{ ...s.totalCard, background: badge.blue.bg }}>
              <span style={{ color: badge.blue.color, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('subs.monthlyTotal')}</span>
              <span style={{ color: badge.blue.color, fontSize: 28, fontWeight: 800 }}>{fmt(monthlyTotal)}</span>
            </div>

            {subs.length === 0 && <div style={s.empty}>{tr('subs.empty')}</div>}

            {subs.map((x, i) => (
              <div key={x.id ?? `d${i}`} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                <span style={{ display: 'inline-flex' }}><Ico e={CAT_ICON[x.category] || '🔁'} size={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: t.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {x.name} {!x.manual && <span style={s.autoTag}>{tr('subs.auto')}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: t.navyLight }}>
                    {tr('subs.billingDay', { day: x.billingDay })}{x.occurrences ? ` · ${tr('subs.seenTimes', { count: x.occurrences })}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 17, fontWeight: 700, color: t.navy }}>{fmt(x.amount)}<span style={{ fontSize: 11, color: t.navyLight, fontWeight: 500 }}>{tr('subs.perMonth')}</span></span>
                {x.manual && <button style={s.deleteBtn} onClick={() => del(x.id)}><Ico e="✕" size={13} /></button>}
              </div>
            ))}
          </>
        )}
      </main>
    </PageShell>
  )
}

const catTab = (active) => ({
  padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 16,
  border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
  background: active ? '#e8eefb' : '#fff',
})

const s = {
  main:      { maxWidth: 680, width: '100%', margin: '0 auto' },
  titleRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  title:     { fontSize: 22, fontWeight: 700, color: t.navy, margin: 0 },
  addBtn:    { padding: '8px 16px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  totalCard: { borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 },
  card:      { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 12 },
  input:     { padding: '9px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:{ padding: '9px 18px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  deleteBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  autoTag:   { fontSize: 10, fontWeight: 600, color: badge.blue.color, background: badge.blue.bg, padding: '1px 6px', borderRadius: 6, marginLeft: 4 },
  hint:      { fontSize: 12, color: t.navyLight, marginBottom: 14 },
  upsell:    { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, textAlign: 'center' },
  cta:       { padding: '12px 22px', background: t.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  muted:     { color: t.navyLight, fontSize: 14 },
  error:     { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:     { textAlign: 'center', padding: '40px 0', color: t.navyLight, fontSize: 15 },
}
