import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t } from '../theme'

export default function CategoriesPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { premium } = useUser()
  const { t: tr } = useT()

  const [cats, setCats]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ name: '', kind: 'EXPENSE' })
  const [subFor, setSubFor]   = useState(null)
  const [subName, setSubName] = useState('')

  useEffect(() => { premium ? load() : setLoading(false) }, [premium])

  async function load() {
    setLoading(true); setError('')
    try { setCats(await apiFetch('/api/categories') || []) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  async function addCat(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    try { await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: form.name.trim(), kind: form.kind }) }); setForm(f => ({ ...f, name: '' })); load() }
    catch (e) { setError(e.message) }
  }
  async function addSub(parent) {
    if (!subName.trim()) return
    try { await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: subName.trim(), kind: parent.kind, parentId: parent.id }) }); setSubFor(null); setSubName(''); load() }
    catch (e) { setError(e.message) }
  }
  async function del(id) {
    try { await apiFetch(`/api/categories/${id}`, { method: 'DELETE' }); load() }
    catch (e) { setError(e.message) }
  }

  const tops = kind => cats.filter(c => !c.parentId && c.kind === kind)
  const subs = pid => cats.filter(c => c.parentId === pid)

  const kindTab = (active) => ({
    flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
    background: active ? '#e8eefb' : '#fff', color: active ? t.navyMid : t.navyLight,
  })

  function Section({ kind, title }) {
    const list = tops(kind)
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>{title}</div>
        {list.length === 0 && <p style={{ ...s.muted, fontStyle: 'italic', margin: '4px 0 10px' }}>{tr('categories.empty')}</p>}
        {list.map(c => (
          <div key={c.id} style={s.catBlock}>
            <div style={s.catRow}>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.navy }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={s.tinyBtn} onClick={() => { setSubFor(subFor === c.id ? null : c.id); setSubName('') }}>+ {tr('categories.sub')}</button>
                <button style={s.deleteBtn} onClick={() => del(c.id)}><Ico e="✕" size={13} /></button>
              </div>
            </div>
            {subs(c.id).map(sc => (
              <div key={sc.id} style={{ ...s.catRow, paddingLeft: 18 }}>
                <span style={{ fontSize: 13, color: t.navyLight, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ico e="↳" size={13} />{sc.name}</span>
                <button style={s.deleteBtn} onClick={() => del(sc.id)}><Ico e="✕" size={13} /></button>
              </div>
            ))}
            {subFor === c.id && (
              <div style={{ display: 'flex', gap: 6, paddingLeft: 18, marginTop: 6 }}>
                <input style={{ ...s.input, flex: 1 }} autoFocus placeholder={tr('categories.namePlaceholder')} value={subName}
                  onChange={e => setSubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSub(c)} />
                <button style={s.btnSmall} onClick={() => addSub(c)}>{tr('common.add')}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '28px 32px' }}>
        <h1 style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 8 }}><Ico e="🏷️" size={20} />{tr('categories.title')}</h1>

        {!premium ? (
          <div style={s.upsell}>
            <p style={{ fontSize: 15, color: t.navy, marginBottom: 14 }}>{tr('categories.upsell')}</p>
            <button style={s.cta} onClick={() => navigate('/premium')}>{tr('premium.upgrade')}</button>
          </div>
        ) : loading ? (
          <p style={s.muted}>{tr('common.loading')}</p>
        ) : (
          <>
            {error && <p style={s.error}>{error}</p>}

            <form onSubmit={addCat} style={s.card}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button type="button" style={kindTab(form.kind === 'EXPENSE')} onClick={() => setForm(f => ({ ...f, kind: 'EXPENSE' }))}>{tr('categories.expense')}</button>
                <button type="button" style={kindTab(form.kind === 'INCOME')} onClick={() => setForm(f => ({ ...f, kind: 'INCOME' }))}>{tr('categories.income')}</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...s.input, flex: 1 }} placeholder={tr('categories.namePlaceholder')} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <button type="submit" style={s.btnPrimary}>{tr('categories.addCat')}</button>
              </div>
            </form>

            <Section kind="EXPENSE" title={tr('categories.expense')} />
            <Section kind="INCOME"  title={tr('categories.income')} />
          </>
        )}
      </main>
    </PageShell>
  )
}

const s = {
  main:      { maxWidth: 640, width: '100%', margin: '0 auto' },
  title:     { fontSize: 22, fontWeight: 700, color: t.navy, margin: '0 0 18px' },
  card:      { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  catBlock:  { paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${t.borderLight}` },
  catRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' },
  input:     { padding: '9px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:{ padding: '9px 18px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  btnSmall:  { padding: '7px 14px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  tinyBtn:   { padding: '3px 9px', border: `1px solid ${t.border}`, borderRadius: 6, background: '#fff', fontSize: 12, color: t.navyMid, cursor: 'pointer' },
  deleteBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  upsell:    { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, textAlign: 'center' },
  cta:       { padding: '12px 22px', background: t.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  muted:     { color: t.navyLight, fontSize: 14 },
  error:     { color: '#c0392b', fontSize: 14, marginBottom: 12 },
}
