import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t, badge } from '../theme'
import Ico from '../components/Icon'

// Categories the plan treats as trimmable vs essential.
const CUTTABLE  = ['RESTAURANTS', 'ENTERTAINMENT', 'CLOTHES', 'TRAVEL', 'GADGETS', 'MARKETPLACES', 'GIFTS', 'SPORT']
const ESSENTIAL = ['HOUSE', 'EATING', 'TRANSPORT', 'HEALTH', 'COMMUNICATION', 'EDUCATION', 'WORK', 'OTHER']
const CAT_ICON  = { HOUSE: '🏠', EATING: '🍎', TRANSPORT: '🚗', HEALTH: '🏥', COMMUNICATION: '📶', EDUCATION: '🎓', WORK: '💼', OTHER: '📦', RESTAURANTS: '🍽️', ENTERTAINMENT: '🎬', CLOTHES: '👗', TRAVEL: '✈️', GADGETS: '💻', MARKETPLACES: '🛒', GIFTS: '🎁', SPORT: '🏋️' }
const CAT_LABEL = { HOUSE: 'cat.house', EATING: 'cat.food', RESTAURANTS: 'cat.restaurants', TRANSPORT: 'cat.transport', CLOTHES: 'cat.clothing', ENTERTAINMENT: 'cat.entertainment', COMMUNICATION: 'cat.communication', SPORT: 'cat.sport', EDUCATION: 'cat.education', MARKETPLACES: 'cat.marketplaces', WORK: 'cat.work', HEALTH: 'cat.health', GADGETS: 'cat.gadgets', GIFTS: 'cat.gifts', TRAVEL: 'cat.travel', OTHER: 'cat.other' }
const thisMonth = () => new Date().toISOString().slice(0, 7)

function sumByCats(lines, cats) {
  const map = {}
  for (const l of lines || []) {
    if (!cats.includes(l.category)) continue
    map[l.category] = (map[l.category] || 0) + Number(l.amount)
  }
  return map
}

// Snowball: throw the whole monthly pool at the smallest balance first, roll leftover on.
function monthsToClear(remainings, pool) {
  if (pool <= 0) return Infinity
  const rem = remainings.filter(x => x > 0).sort((a, b) => a - b)
  if (!rem.length) return 0
  let months = 0
  while (rem.some(x => x > 0.005) && months < 1200) {
    let pay = pool
    for (let i = 0; i < rem.length && pay > 0; i++) {
      if (rem[i] <= 0) continue
      const d = Math.min(rem[i], pay)
      rem[i] -= d; pay -= d
    }
    months++
  }
  return rem.some(x => x > 0.005) ? Infinity : months
}

export default function DebtsPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { fmt, profile } = useUser()
  const { t: tr } = useT()

  const [debts, setDebts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ name: '', totalAmount: '', lent: false, dueDate: '', scheduled: false, monthlyPayment: '', paymentDay: '1' })
  const [payingId, setPayingId] = useState(null)
  const [payAmount, setPayAmount] = useState('')

  // Pay-off planner
  const [budget, setBudget]   = useState(null)
  const [extra, setExtra]     = useState('')
  const [showPlan, setShowPlan] = useState(true)

  useEffect(() => { loadDebts(); loadBudget() }, [])

  async function loadDebts() {
    setLoading(true); setError('')
    try { setDebts(await apiFetch('/api/debts')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function loadBudget() {
    try { setBudget(await apiFetch(`/api/budget/${thisMonth()}`)) }
    catch { /* budget is optional for the planner */ }
  }

  async function addDebt(e) {
    e.preventDefault()
    try {
      await apiFetch('/api/debts', { method: 'POST', body: JSON.stringify({
        name: form.name,
        totalAmount: Number(form.totalAmount),
        lent: form.lent,
        dueDate: form.dueDate || null,
        monthlyPayment: form.scheduled ? (Number(form.monthlyPayment) || null) : null,
        paymentDay: form.scheduled ? (Number(form.paymentDay) || null) : null,
      }) })
      setShowForm(false)
      setForm({ name: '', totalAmount: '', lent: false, dueDate: '', scheduled: false, monthlyPayment: '', paymentDay: '1' })
      loadDebts()
    } catch (e) { setError(e.message) }
  }

  async function pay(id, amountOverride) {
    const amount = Number(amountOverride != null ? amountOverride : payAmount)
    if (!amount || amount <= 0) return
    try {
      await apiFetch(`/api/debts/${id}/pay`, { method: 'POST', body: JSON.stringify({ amount }) })
      setPayingId(null); setPayAmount(''); loadDebts()
    } catch (e) { setError(e.message) }
  }

  async function deleteDebt(id) {
    try { await apiFetch(`/api/debts/${id}`, { method: 'DELETE' }); loadDebts() }
    catch (e) { setError(e.message) }
  }

  const iOwe    = debts.filter(d => !d.lent).reduce((sum, d) => sum + Number(d.remaining), 0)
  const owedToMe = debts.filter(d => d.lent).reduce((sum, d) => sum + Number(d.remaining), 0)

  // ── Pay-off planner ─────────────────────────────────────────────────────────
  const owed        = debts.filter(d => !d.lent && !d.paidOff)
  const remainings  = owed.map(d => Number(d.remaining))
  const cutMap      = sumByCats(budget?.expenseLines, CUTTABLE)
  const keepMap     = sumByCats(budget?.expenseLines, ESSENTIAL)
  const freed       = Object.values(cutMap).reduce((a, b) => a + b, 0)
  const baseMonthly = owed.reduce((s, d) => s + (Number(d.monthlyPayment) || 0), 0)
  const extraNum    = extra === '' ? freed : (Number(extra) || 0)
  const withPool    = baseMonthly + extraNum
  const monthsPlan  = monthsToClear(remainings, withPool)
  const monthsBase  = monthsToClear(remainings, baseMonthly)
  const saved       = (isFinite(monthsBase) && isFinite(monthsPlan)) ? monthsBase - monthsPlan : 0
  const firstTarget = owed.slice().sort((a, b) => Number(a.remaining) - Number(b.remaining))[0]
  const foodKeep    = keepMap.EATING || Number(profile?.foodBudget) || 0

  const dirTab = (active) => ({
    flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
    background: active ? '#e8eefb' : '#fff', color: active ? t.navyMid : t.navyLight,
  })

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{tr('debts.title')}</h1>
          <button style={s.btnPrimary} onClick={() => setShowForm(true)}>{tr('debts.addDebt')}</button>
        </div>

        {error && <p style={s.error}>{error}</p>}

        {debts.length > 0 && (
          <div style={s.accountCard}>
            <div style={s.acctCol}>
              <span style={s.acctLabel}>{tr('debts.iOwe')}</span>
              <span style={{ ...s.acctValue, color: '#9b2020' }}>{fmt(iOwe)}</span>
            </div>
            <div style={s.acctCol}>
              <span style={s.acctLabel}>{tr('debts.owedToMe')}</span>
              <span style={{ ...s.acctValue, color: '#1e6b3a' }}>{fmt(owedToMe)}</span>
            </div>
          </div>
        )}

        {owed.length > 0 && (
          <div style={s.planCard}>
            <div style={s.planHead} onClick={() => setShowPlan(v => !v)}>
              <span style={{ ...s.planTitle, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Ico e="🚀" size={17} />{tr('debtplan.title')}</span>
              <span style={{ color: t.navyLight }}>{showPlan ? '▾' : '▸'}</span>
            </div>

            {showPlan && (
              <>
                <p style={s.planIntro}>{tr('debtplan.intro')}</p>

                <div style={s.freedRow}>
                  <span style={{ fontSize: 13, color: t.navyLight }}>{tr('debtplan.freeUp')}</span>
                  <span style={s.freedAmt}>{fmt(freed)}<small style={{ fontSize: 12, fontWeight: 500, color: t.navyLight }}>{tr('subs.perMonth')}</small></span>
                </div>

                {Object.keys(cutMap).length > 0 ? (
                  <div style={s.listBlock}>
                    <div style={{ ...s.listLabel, display: 'flex', alignItems: 'center', gap: 6 }}><Ico e="✂️" size={13} />{tr('debtplan.cutTitle')}</div>
                    {Object.entries(cutMap).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                      <div key={c} style={s.liRow}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ico e={CAT_ICON[c]} size={15} />{tr(CAT_LABEL[c] || 'cat.other')}</span>
                        <span style={{ color: '#9b2020', fontWeight: 600 }}>−{fmt(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={s.hintNote}>{tr('debtplan.nothingToCut')}</div>
                )}

                <div style={s.listBlock}>
                  <div style={{ ...s.listLabel, display: 'flex', alignItems: 'center', gap: 6 }}><Ico e="🛡️" size={13} />{tr('debtplan.keepTitle')}</div>
                  {Object.entries(keepMap).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                    <div key={c} style={s.liRow}>
                      <span>{CAT_ICON[c]} {tr(CAT_LABEL[c] || 'cat.other')}</span>
                      <span style={{ color: '#1e6b3a', fontWeight: 600 }}>{fmt(v)}</span>
                    </div>
                  ))}
                  {!keepMap.EATING && foodKeep > 0 && (
                    <div style={s.liRow}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ico e="🍎" size={15} />{tr('cat.food')}</span>
                      <span style={{ color: '#1e6b3a', fontWeight: 600 }}>{fmt(foodKeep)}</span>
                    </div>
                  )}
                </div>

                <div style={s.foodNote}>
                  <Ico e="🛒" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{tr('debtplan.foodNote')}{' '}
                  <button style={s.linkBtn} onClick={() => navigate('/eating')}>{tr('debtplan.viewFood')}</button>
                </div>

                <label style={s.planLabel}>{tr('debtplan.extraLabel')}</label>
                <input style={s.input} type="number" min="0" step="1" value={extra}
                  placeholder={String(Math.round(freed))} onChange={e => setExtra(e.target.value)} />

                {firstTarget && (
                  <div style={s.attack}><Ico e="🎯" size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{tr('debtplan.attackFirst')} <b>{firstTarget.name}</b> ({fmt(firstTarget.remaining)})</div>
                )}

                <div style={s.resultCard}>
                  {isFinite(monthsPlan) && withPool > 0 ? (
                    <>
                      <div style={s.resultBig}>{tr('debtplan.debtFree', { n: monthsPlan })}</div>
                      <div style={s.resultSub}>
                        {tr('debtplan.atRate', { amt: fmt(withPool) })}
                        {saved > 0 ? ` · ${tr('debtplan.saveMonths', { s: saved })}` : ''}
                      </div>
                    </>
                  ) : (
                    <div style={s.resultSub}>{tr('debtplan.setExtra')}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {showForm && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>{tr('debts.newDebt')}</h3>
            <form onSubmit={addDebt} style={s.formCol}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={dirTab(!form.lent)} onClick={() => setForm(f => ({ ...f, lent: false }))}>{tr('debts.iOweIt')}</button>
                <button type="button" style={dirTab(form.lent)} onClick={() => setForm(f => ({ ...f, lent: true }))}>{tr('debts.iLent')}</button>
              </div>
              <input style={s.input} placeholder={form.lent ? tr('debts.whoPlaceholder') : tr('debts.namePlaceholder')} required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input style={s.input} type="number" min="0.01" step="0.01" placeholder={tr('debts.total')} required value={form.totalAmount}
                onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} />

              <label style={s.fieldLabel}>{tr('debts.dueDate')}</label>
              <input style={s.input} type="date" value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />

              <label style={s.checkRow}>
                <input type="checkbox" checked={form.scheduled}
                  onChange={e => setForm(f => ({ ...f, scheduled: e.target.checked }))} />
                {tr('debts.schedule')}
              </label>
              {form.scheduled && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <input style={s.input} type="number" min="0.01" step="0.01" placeholder={tr('debts.monthlyPayment')}
                    value={form.monthlyPayment} onChange={e => setForm(f => ({ ...f, monthlyPayment: e.target.value }))} />
                  <input style={s.input} type="number" min="1" max="28" placeholder={tr('debts.paymentDay')}
                    value={form.paymentDay} onChange={e => setForm(f => ({ ...f, paymentDay: e.target.value }))} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={s.btnPrimary}>{tr('common.add')}</button>
                <button type="button" style={s.btnSecondary} onClick={() => setShowForm(false)}>{tr('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {loading && <p style={s.muted}>{tr('common.loading')}</p>}
        {!loading && debts.length === 0 && <div style={s.empty}>{tr('debts.empty')}</div>}

        {[false, true].map(lentGroup => {
          const list = debts.filter(d => d.lent === lentGroup)
          if (!list.length) return null
          return (
            <div key={lentGroup ? 'lent' : 'owe'}>
              <div style={s.sectionLabel}>{lentGroup ? tr('debts.owedToMe') : tr('debts.iOwe')}</div>
              {list.map(d => {
                const pct = Number(d.totalAmount) > 0 ? Math.min(Math.round(Number(d.paidAmount) / Number(d.totalAmount) * 100), 100) : 0
                return (
                  <div key={d.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: t.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ ...s.pill, ...(d.lent ? badge.green : badge.amber), flexShrink: 0 }}>
                    {d.lent ? tr('debts.lentTag') : tr('debts.oweTag')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {d.paidOff
                    ? <span style={{ ...s.pill, ...badge.green }}>{d.lent ? tr('debts.settled') : tr('debts.paidOff')}</span>
                    : <button style={s.btnSmall} onClick={() => { setPayingId(payingId === d.id ? null : d.id); setPayAmount('') }}>{d.lent ? tr('debts.received') : tr('debts.pay')}</button>}
                  <button style={s.deleteBtn} onClick={() => deleteDebt(d.id)}><Ico e="✕" size={13} /></button>
                </div>
              </div>

              <div style={s.barTrack}>
                <div style={{ ...s.barFill, width: `${pct}%`, background: d.paidOff ? '#2e8b57' : t.navyMid }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: t.navyLight }}>
                <span>{fmt(d.paidAmount)} {tr('debts.of')} {fmt(d.totalAmount)}</span>
                <span style={{ fontWeight: 700, color: d.paidOff ? '#1e6b3a' : t.navy }}>{tr('debts.remaining')}: {fmt(d.remaining)}</span>
              </div>

              {(d.dueDate || (d.monthlyPayment && !d.paidOff)) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  {d.dueDate && (
                    <span style={{ ...s.pill, ...(d.overdue ? badge.red : badge.grey) }}>
                      <Ico e="📅" size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 3 }} />{tr('debts.due')}: {d.dueDate}{d.overdue ? ` · ${tr('debts.overdue')}` : ''}
                    </span>
                  )}
                  {d.monthlyPayment && !d.paidOff && (
                    <span style={{ ...s.pill, ...badge.blue }}>
                      <Ico e="🔁" size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 3 }} />{fmt(d.monthlyPayment)} {tr('debts.perMonth')}{d.nextPaymentDate ? ` · ${tr('debts.next')} ${d.nextPaymentDate}` : ''}
                    </span>
                  )}
                  {d.monthlyPayment && !d.paidOff && (
                    <button style={s.btnSmall} onClick={() => pay(d.id, d.monthlyPayment)}>{tr('debts.payScheduled')}</button>
                  )}
                </div>
              )}

              {payingId === d.id && !d.paidOff && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input style={{ ...s.input, flex: 1 }} type="number" min="0.01" step="0.01" autoFocus
                    placeholder={tr('debts.payPlaceholder')} value={payAmount}
                    onChange={e => setPayAmount(e.target.value)} />
                  <button style={s.btnPrimary} onClick={() => pay(d.id)}>{d.lent ? tr('debts.received') : tr('debts.pay')}</button>
                </div>
              )}
                  </div>
                )
              })}
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
  sectionLabel:{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.navyLight, margin: '14px 2px 8px' },
  card:        { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 14 },
  cardTitle:   { fontSize: 13, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' },
  barTrack:    { height: 8, background: t.borderLight, borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  planCard:    { background: '#f5f8ff', border: `1px solid ${t.navyMid}`, borderRadius: 14, padding: 18, marginBottom: 18 },
  planHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  planTitle:   { fontSize: 16, fontWeight: 700, color: t.navy },
  planIntro:   { fontSize: 13, color: t.navyLight, margin: '8px 0 14px', lineHeight: 1.5 },
  freedRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 14px', background: '#fff', border: `1px solid ${t.border}`, borderRadius: 10, marginBottom: 14 },
  freedAmt:    { fontSize: 22, fontWeight: 800, color: t.navy },
  listBlock:   { marginBottom: 14 },
  listLabel:   { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.navyLight, marginBottom: 6 },
  liRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: t.navy, padding: '5px 2px', borderBottom: `1px solid ${t.borderLight}` },
  hintNote:    { fontSize: 13, color: t.navyLight, background: '#fff', border: `1px dashed ${t.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14 },
  foodNote:    { fontSize: 13, color: '#1e6b3a', background: '#eaf7ee', border: '1px solid #bcdcc4', borderRadius: 10, padding: '10px 14px', marginBottom: 14 },
  linkBtn:     { background: 'none', border: 'none', color: t.navyMid, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13, padding: 0 },
  planLabel:   { display: 'block', fontSize: 12, fontWeight: 600, color: t.navyLight, marginBottom: 6 },
  attack:      { fontSize: 14, color: t.navy, margin: '12px 0 6px' },
  resultCard:  { background: t.navy, borderRadius: 12, padding: '14px 18px', marginTop: 10, textAlign: 'center' },
  resultBig:   { fontSize: 20, fontWeight: 800, color: '#fff' },
  resultSub:   { fontSize: 13, color: '#cdd8f0', marginTop: 4 },
  pill:        { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  formCol:     { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 },
  fieldLabel:  { fontSize: 12, color: t.navyLight, fontWeight: 600, marginBottom: -4 },
  checkRow:    { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: t.navy, cursor: 'pointer' },
  input:       { width: '100%', padding: '10px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:  { padding: '9px 20px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  btnSecondary:{ padding: '9px 16px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 14, color: t.navyLight, cursor: 'pointer' },
  btnSmall:    { padding: '5px 14px', border: 'none', borderRadius: 6, background: t.navyMid, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  deleteBtn:   { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 15, flexShrink: 0 },
  muted:       { color: t.navyLight, fontSize: 14 },
  error:       { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:       { textAlign: 'center', padding: '56px 0', color: t.navyLight, fontSize: 15 },
}
