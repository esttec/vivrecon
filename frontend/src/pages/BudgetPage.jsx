import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { parseStatement } from '../utils/importTransactions'
import Ico from '../components/Icon'
import PageShell from '../components/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { downloadCsv } from '../utils/exportCsv'
import { t, badge } from '../theme'

// Expense categories — must match backend ExpenseCategory enum.
// `labelKey` resolves to a translated label at render time.
const EXPENSE_CATEGORIES = [
  { key: 'HOUSE',        labelKey: 'cat.house',         icon: '🏠', profileField: 'rentBudget'        },
  { key: 'EATING',       labelKey: 'cat.food',          icon: '🍎', profileField: 'foodBudget'        },
  { key: 'RESTAURANTS',  labelKey: 'cat.restaurants',   icon: '🍽️', profileField: null               },
  { key: 'TRANSPORT',    labelKey: 'cat.transport',     icon: '🚗', profileField: 'transportBudget'   },
  { key: 'CLOTHES',      labelKey: 'cat.clothing',      icon: '👗', profileField: null               },
  { key: 'ENTERTAINMENT',labelKey: 'cat.entertainment', icon: '🎬', profileField: null               },
  { key: 'COMMUNICATION',labelKey: 'cat.communication', icon: '📶', profileField: null               },
  { key: 'SPORT',        labelKey: 'cat.sport',         icon: '🏋️', profileField: null               },
  { key: 'EDUCATION',    labelKey: 'cat.education',      icon: '🎓', profileField: null               },
  { key: 'MARKETPLACES', labelKey: 'cat.marketplaces',  icon: '🛒', profileField: null               },
  { key: 'WORK',         labelKey: 'cat.work',          icon: '💼', profileField: null               },
  { key: 'HEALTH',       labelKey: 'cat.health',        icon: '🏥', profileField: null               },
  { key: 'GADGETS',      labelKey: 'cat.gadgets',       icon: '💻', profileField: null               },
  { key: 'GIFTS',        labelKey: 'cat.gifts',         icon: '🎁', profileField: null               },
  { key: 'TRAVEL',       labelKey: 'cat.travel',        icon: '✈️', profileField: null               },
  { key: 'SAVINGS',      labelKey: 'cat.savings',       icon: '💰', profileField: '_savings'          },
  { key: 'DEBTS',        labelKey: 'cat.debts',         icon: '💳', profileField: 'debtPayments'      },
  { key: 'OTHER',        labelKey: 'cat.other',         icon: '📦', profileField: 'otherFixedExpenses'},
]

// ── Month helpers ─────────────────────────────────────────────────────────────
const thisMonth = () => new Date().toISOString().slice(0, 7)

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonthLabel(ym, locale = 'default') {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
}

const CAT_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.key, c.labelKey]))

export default function BudgetPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { profile, fmt, premium } = useUser()
  const { t: tr, lang } = useT()

  const [tab, setTab]             = useState('month')     // 'month' | 'history'
  const [yearMonth, setYearMonth] = useState(thisMonth())
  const [budget, setBudget]       = useState(null)
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // Income form
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [incomeForm, setIncomeForm]         = useState({ description: 'Salary', amount: '' })

  // Expense form
  const [showExpForm, setShowExpForm] = useState(false)
  const [expForm, setExpForm]         = useState({ category: 'HOUSE', description: '', amount: '' })

  // Last-month rollover
  const [prevLeftover, setPrevLeftover] = useState(0)
  const [rolledOver, setRolledOver]     = useState(false)

  // Bank statement import
  const bankFileRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  async function handleBankImport(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setImporting(true); setError(''); setImportMsg('')
    try {
      const rows = await parseStatement(file)
      if (!rows.length) { setError(tr('import.empty')); return }
      const res = await apiFetch('/api/transactions/import', { method: 'POST', body: JSON.stringify({ items: rows }) })
      setImportMsg(tr('import.done', { count: res.imported, subs: res.subscriptionsDetected }))
      loadBudget()
    } catch (err) {
      setError(err.message || tr('import.empty'))
    } finally { setImporting(false) }
  }

  useEffect(() => { if (tab === 'month') loadBudget() }, [yearMonth, tab])
  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])

  async function loadBudget() {
    setLoading(true); setError('')
    setRolledOver(false)
    try {
      setBudget(await apiFetch(`/api/budget/${yearMonth}`))
      // Look at last month's leftover so it can be rolled into savings.
      const prev = await apiFetch(`/api/budget/${addMonths(yearMonth, -1)}`)
      const leftover = Number(prev?.totalIncome ?? 0) - Number(prev?.totalExpenses ?? 0)
      setPrevLeftover(leftover > 0 ? leftover : 0)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function loadHistory() {
    setLoading(true); setError('')
    try { setHistory(await apiFetch('/api/budget')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function addIncome(e) {
    e.preventDefault()
    try {
      await apiFetch(`/api/budget/${yearMonth}/lines`, {
        method: 'POST',
        body: JSON.stringify({ type: 'INCOME', description: incomeForm.description, amount: Number(incomeForm.amount) }),
      })
      setShowIncomeForm(false)
      setIncomeForm({ description: 'Salary', amount: '' })
      loadBudget()
    } catch (e) { setError(e.message) }
  }

  async function addExpense(e) {
    e.preventDefault()
    try {
      await apiFetch(`/api/budget/${yearMonth}/lines`, {
        method: 'POST',
        body: JSON.stringify({ type: 'EXPENSE', category: expForm.category, description: expForm.description, amount: Number(expForm.amount) }),
      })
      setShowExpForm(false)
      setExpForm({ category: 'HOUSE', description: '', amount: '' })
      loadBudget()
    } catch (e) { setError(e.message) }
  }

  async function deleteLine(lineId) {
    try { await apiFetch(`/api/budget/lines/${lineId}`, { method: 'DELETE' }); loadBudget() }
    catch (e) { setError(e.message) }
  }

  // Premium: export this month's income + expense lines to CSV.
  function exportMonthCsv() {
    if (!premium) { navigate('/premium'); return }
    if (!budget) return
    const rows = []
    for (const l of budget.incomeLines ?? [])
      rows.push([yearMonth, tr('budget.income'), '', l.description, Number(l.amount)])
    for (const l of budget.expenseLines ?? [])
      rows.push([yearMonth, tr('budget.expenses'), l.category ? tr(CAT_LABEL[l.category] || 'cat.other') : '', l.description, Number(l.amount)])
    downloadCsv(
      `vivrecon-${yearMonth}.csv`,
      [tr('common.month'), tr('common.type'), tr('budget.category'), tr('budget.description'), tr('budget.amount')],
      rows
    )
  }

  // Move last month's leftover into this month as a Savings line.
  async function rolloverToSavings() {
    try {
      await apiFetch(`/api/budget/${yearMonth}/lines`, {
        method: 'POST',
        body: JSON.stringify({ type: 'EXPENSE', category: 'SAVINGS', description: tr('budget.fromLastMonth'), amount: Number(prevLeftover.toFixed(2)) }),
      })
      setRolledOver(true); setPrevLeftover(0); loadBudget()
    } catch (e) { setError(e.message) }
  }

  // ── Derived numbers ──────────────────────────────────────────────────────
  const totalIncome   = budget ? Number(budget.totalIncome)   : 0
  const totalExpenses = budget ? Number(budget.totalExpenses) : 0
  const balance       = totalIncome - totalExpenses
  const spentPct      = totalIncome > 0 ? Math.min(Math.round(totalExpenses / totalIncome * 100), 100) : 0

  // Planned amounts from profile (reference only)
  const savingsPct = Number(profile?.savingsTargetPercent ?? 0)
  function plannedFor(cat) {
    if (cat.profileField === '_savings') return totalIncome > 0 && savingsPct > 0 ? totalIncome * savingsPct / 100 : 0
    if (!cat.profileField) return 0
    return Number(profile?.[cat.profileField] ?? 0)
  }

  // Actual by category
  const actualByCategory = (budget?.expenseLines ?? []).reduce((acc, l) => {
    acc[l.category || 'OTHER'] = (acc[l.category || 'OTHER'] || 0) + Number(l.amount)
    return acc
  }, {})

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '16px 12px' : '32px' }}>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <h1 style={s.title}>{tr('budget.title')}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button style={s.exportBtn} onClick={() => navigate('/analytics')}><Ico e="📊" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 5 }} />{tr('analytics.title')}</button>
            {tab === 'month' && (
              <button
                style={s.exportBtn}
                disabled={importing}
                title={tr('import.hint')}
                onClick={() => premium ? bankFileRef.current?.click() : navigate('/premium')}
              >
                {importing ? tr('import.importing') : <><Ico e="⬆" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{tr('import.bank')}</>} {premium ? '' : <Ico e="⭐" size={13} style={{ display: 'inline-block', verticalAlign: '-2px' }} />}
              </button>
            )}
            <input
              ref={bankFileRef}
              type="file"
              accept=".csv,.pdf"
              style={{ display: 'none' }}
              onChange={handleBankImport}
            />
            {tab === 'month' && budget && (
              <button style={s.exportBtn} onClick={exportMonthCsv} title={tr('premium.export')}>
                <Ico e="⭳" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />CSV {premium ? '' : <Ico e="⭐" size={13} style={{ display: 'inline-block', verticalAlign: '-2px' }} />}
              </button>
            )}
            <div style={s.tabs}>
              <button style={{ ...s.tab, ...(tab === 'month'   ? s.tabActive : {}) }} onClick={() => setTab('month')}>{tr('budget.thisMonth')}</button>
              <button style={{ ...s.tab, ...(tab === 'history' ? s.tabActive : {}) }} onClick={() => setTab('history')}>{tr('budget.history')}</button>
            </div>
          </div>
        </div>

        {error     && <p style={s.error}>{error}</p>}
        {importMsg && <p style={{ ...s.error, color: t.green || '#2e7d32', background: '#eaf7ee' }}>{importMsg}</p>}

        {/* ══════════════════════════════════════════════════════════════════
            MONTH VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'month' && (
          <>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <button style={s.navBtn} onClick={() => setYearMonth(addMonths(yearMonth, -1))}>‹</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: t.navy, flex: 1, textAlign: 'center' }}>
                {fmtMonthLabel(yearMonth, lang)}
              </span>
              <button style={s.navBtn} onClick={() => setYearMonth(addMonths(yearMonth, 1))}
                disabled={yearMonth >= thisMonth()}>›</button>
              {yearMonth !== thisMonth() && (
                <button style={s.todayBtn} onClick={() => setYearMonth(thisMonth())}>{tr('budget.today')}</button>
              )}
            </div>

            {loading && <p style={s.muted}>{tr('common.loading')}</p>}

            {budget && (
              <>
                {/* Roll last month's leftover into savings */}
                {prevLeftover > 0 && totalIncome > 0 && yearMonth === thisMonth() && !rolledOver && (
                  <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: '#eef5ee', borderColor: '#bcdcc4' }}>
                    <span style={{ fontSize: 13, color: t.navy }}>
                      <Ico e="🐷" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{tr('budget.leftoverPrompt', { amount: fmt(prevLeftover) })}
                    </span>
                    <button style={s.btnSmall} onClick={rolloverToSavings}>{tr('budget.moveToSavings')}</button>
                  </div>
                )}

                {/* ── Summary cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  <SummaryCard label={tr('budget.income')}   value={fmt(totalIncome || null)}  sub={`${(budget.incomeLines ?? []).length} ${tr('budget.sources')}`} bg={badge.green} />
                  <SummaryCard label={tr('budget.expenses')} value={fmt(totalExpenses)}        sub={totalIncome > 0 ? tr('budget.pctOfIncome', { pct: spentPct }) : null} bg={badge.red}  />
                  <SummaryCard label={tr('budget.balance')}  value={fmt(balance)}              sub={totalIncome > 0 ? (balance >= 0 ? tr('budget.onTrack') : tr('budget.overBudget')) : null}
                    bg={balance >= 0 ? badge.blue : badge.red} fullWidth={isMobile} />
                </div>

                {/* Spending bar */}
                {totalIncome > 0 && (
                  <div style={{ ...s.card, padding: '10px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.navyLight, marginBottom: 5 }}>
                      <span>{tr('budget.spending')}</span>
                      <span style={{ fontWeight: 700, color: spentPct > 90 ? '#c0392b' : t.navy }}>{spentPct}%</span>
                    </div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${spentPct}%`, background: spentPct > 90 ? '#e74c3c' : t.navyMid }} />
                    </div>
                  </div>
                )}

                {/* ── INCOME SECTION ── */}
                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h2 style={s.cardTitle}>{tr('budget.income')}</h2>
                      {totalIncome === 0 && (
                        <p style={{ fontSize: 12, color: t.navyLight, margin: '3px 0 0' }}>
                          {tr('budget.incomeHint', { month: fmtMonthLabel(yearMonth, lang) })}
                        </p>
                      )}
                    </div>
                    <button style={s.btnSmall} onClick={() => setShowIncomeForm(v => !v)}>{tr('budget.addIncome')}</button>
                  </div>

                  {showIncomeForm && (
                    <form onSubmit={addIncome} style={s.inlineForm}>
                      <input style={{ ...s.input, flex: 2, minWidth: 120 }} placeholder={tr('budget.incomeDescPlaceholder')}
                        required value={incomeForm.description}
                        onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} />
                      <input style={{ ...s.input, flex: 1, minWidth: 90 }} type="number" placeholder={tr('budget.amount')} required min="0.01" step="0.01"
                        value={incomeForm.amount}
                        onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} />
                      <button type="submit" style={s.btnPrimary}>{tr('budget.add')}</button>
                      <button type="button" style={s.btnSecondary} onClick={() => setShowIncomeForm(false)}><Ico e="✕" size={14} /></button>
                    </form>
                  )}

                  {(budget.incomeLines ?? []).length === 0 && !showIncomeForm && (
                    <p style={{ ...s.muted, fontStyle: 'italic' }}>{tr('budget.noIncome')}</p>
                  )}

                  {(budget.incomeLines ?? []).map(line => (
                    <div key={line.id} style={s.lineRow}>
                      <span style={{ fontSize: 14, color: t.navy, flex: 1 }}>{line.description}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1e6b3a' }}>{fmt(line.amount)}</span>
                      <button style={s.deleteBtn} onClick={() => deleteLine(line.id)}><Ico e="✕" size={13} /></button>
                    </div>
                  ))}

                  {(budget.incomeLines ?? []).length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTop: `2px solid ${t.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.navyLight }}>{tr('budget.totalIncome')}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1e6b3a' }}>{fmt(totalIncome)}</span>
                    </div>
                  )}
                </div>

                {/* ── EXPENSES SECTION ── */}
                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={s.cardTitle}>{tr('budget.expenses')}</h2>
                    <button style={s.btnSmall} onClick={() => setShowExpForm(v => !v)}>{tr('budget.addExpense')}</button>
                  </div>

                  {showExpForm && (
                    <div style={{ background: t.bg, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <form onSubmit={addExpense}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={s.label}>{tr('budget.description')}</label>
                            <input style={s.input} placeholder={tr('budget.expenseDescPlaceholder')} required
                              value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
                          </div>
                          <div>
                            <label style={s.label}>{tr('budget.amount')}</label>
                            <input style={s.input} type="number" placeholder="0.00" required min="0.01" step="0.01"
                              value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
                          </div>
                          <div>
                            <label style={s.label}>{tr('budget.category')}</label>
                            <select style={s.input} value={expForm.category}
                              onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                              {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {tr(c.labelKey)}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="submit" style={s.btnPrimary}>{tr('budget.add')}</button>
                          <button type="button" style={s.btnSecondary} onClick={() => setShowExpForm(false)}>{tr('common.cancel')}</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Category breakdown rows */}
                  {EXPENSE_CATEGORIES.map(cat => {
                    const actual  = actualByCategory[cat.key] || 0
                    const planned = plannedFor(cat)
                    const lines   = (budget.expenseLines ?? []).filter(l => (l.category || 'OTHER') === cat.key)
                    const over    = actual > planned && planned > 0
                    const pct     = planned > 0 ? Math.min(Math.round(actual / planned * 100), 100) : 0
                    // Show if there are actual lines OR a planned amount from profile
                    if (!lines.length && !planned) return null

                    return (
                      <div key={cat.key} style={{ marginBottom: 2 }}>
                        <div style={s.catRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                            <span style={{ flexShrink: 0, display: 'inline-flex' }}><Ico e={cat.icon} size={16} /></span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: t.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tr(cat.labelKey)}
                            </span>
                            {over && <span style={{ ...s.pill, background: '#fdecea', color: '#9b2020', flexShrink: 0 }}>{tr('budget.over')}</span>}
                          </div>

                          {planned > 0 && !isMobile && (
                            <div style={{ width: 100, flexShrink: 0, margin: '0 10px' }}>
                              <div style={s.barTrack}>
                                <div style={{ ...s.barFill, width: `${pct}%`, background: over ? '#e74c3c' : t.navyMid }} />
                              </div>
                            </div>
                          )}

                          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: isMobile ? 0 : 180 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: over ? '#c0392b' : t.navy }}>
                              {fmt(actual)}
                            </span>
                            {planned > 0 && (
                              <span style={{ fontSize: 11, color: t.navyLight, marginLeft: 6 }}>
                                / {fmt(planned)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Individual lines under category */}
                        {lines.length === 0 && planned > 0 && (
                          <div style={{ paddingLeft: 30, paddingBottom: 4 }}>
                            <span style={{ fontSize: 12, color: t.navyLight, fontStyle: 'italic' }}>
                              {tr('budget.noSpending')}
                            </span>
                          </div>
                        )}
                        {lines.map(line => (
                          <div key={line.id} style={{ ...s.lineRow, paddingLeft: 30, background: '#fafaf8' }}>
                            <span style={{ fontSize: 13, color: t.navyLight, flex: 1 }}>{line.description}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: t.navy }}>{fmt(line.amount)}</span>
                            <button style={s.deleteBtn} onClick={() => deleteLine(line.id)}><Ico e="✕" size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )
                  })}

                  {(budget.expenseLines ?? []).length === 0 && !showExpForm && (
                    <p style={{ ...s.muted, fontStyle: 'italic' }}>{tr('budget.noExpenses')}</p>
                  )}

                  {(budget.expenseLines ?? []).length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTop: `2px solid ${t.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.navyLight }}>{tr('budget.totalExpenses')}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#9b2020' }}>{fmt(totalExpenses)}</span>
                    </div>
                  )}

                  {/* Available balance — like a bank account: income minus spending */}
                  <div style={{ ...s.budgetRow, background: balance >= 0 ? '#e6f4ea' : '#fdecea', borderRadius: 8, padding: '10px 12px', marginTop: 10, border: 'none' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: balance >= 0 ? '#1e6b3a' : '#9b2020' }}>
                      <Ico e="🏦" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />{tr('budget.available')}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: balance >= 0 ? '#1e6b3a' : '#c0392b' }}>{fmt(balance)}</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            HISTORY VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <>
            {loading && <p style={s.muted}>{tr('common.loading')}</p>}

            {!loading && history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ margin: '0 0 10px', display: 'flex', justifyContent: 'center' }}><Ico e="📅" size={34} color={t.navyLight} /></p>
                <p style={{ fontSize: 15, fontWeight: 600, color: t.navy, marginBottom: 6 }}>{tr('budget.noHistory')}</p>
                <p style={{ fontSize: 13, color: t.navyLight }}>{tr('budget.historyHint')}</p>
              </div>
            )}

            {history
              .slice()
              .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
              .map(m => {
                const inc  = Number(m.totalIncome)
                const exp  = Number(m.totalExpenses)
                const bal  = inc - exp
                const pct  = inc > 0 ? Math.min(Math.round(exp / inc * 100), 100) : 0
                const isCurrentMonth = m.yearMonth === thisMonth()
                return (
                  <div key={m.yearMonth} style={{ ...s.card, cursor: 'pointer' }}
                    onClick={() => { setYearMonth(m.yearMonth); setTab('month') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: t.navy }}>{fmtMonthLabel(m.yearMonth, lang)}</span>
                        {isCurrentMonth && <span style={{ ...s.pill, ...badge.blue }}>{tr('budget.current')}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 18 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: t.navyLight }}>{tr('budget.income')}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e6b3a' }}>{inc > 0 ? fmt(inc) : '—'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: t.navyLight }}>{tr('budget.spent')}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#9b2020' }}>{exp > 0 ? fmt(exp) : '—'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: t.navyLight }}>{tr('budget.balance')}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: bal >= 0 ? t.navyMid : '#c0392b' }}>
                            {inc > 0 || exp > 0 ? fmt(bal) : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                    {inc > 0 && (
                      <div style={s.barTrack}>
                        <div style={{ ...s.barFill, width: `${pct}%`, background: pct > 90 ? '#e74c3c' : t.navyMid }} />
                      </div>
                    )}
                    {inc === 0 && exp === 0 && (
                      <p style={{ ...s.muted, fontSize: 12 }}>{tr('budget.noData')}</p>
                    )}
                  </div>
                )
              })}
          </>
        )}
      </main>
    </PageShell>
  )
}

function SummaryCard({ label, value, sub, bg, fullWidth }) {
  return (
    <div style={{ background: bg.bg, borderRadius: 12, padding: '12px 16px', gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: bg.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</span>
      <span style={{ display: 'block', fontSize: 22, fontWeight: 700, color: bg.color }}>{value}</span>
      {sub && <span style={{ display: 'block', fontSize: 11, color: bg.color, opacity: 0.8, marginTop: 3 }}>{sub}</span>}
    </div>
  )
}

const s = {
  main:        { maxWidth: 960, width: '100%', margin: '0 auto' },
  title:       { fontSize: 24, fontWeight: 700, color: t.navy, margin: 0 },
  tabs:        { display: 'flex', gap: 4, background: t.borderLight, borderRadius: 10, padding: 4 },
  tab:         { padding: '6px 14px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 13, color: t.navyLight, cursor: 'pointer', fontWeight: 500 },
  tabActive:   { background: '#fff', color: t.navy, fontWeight: 700 },
  navBtn:      { width: 36, height: 36, border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 18, color: t.navy, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  todayBtn:    { padding: '6px 12px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 12, color: t.navyMid, cursor: 'pointer', fontWeight: 600 },
  card:        { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 14 },
  cardTitle:   { fontSize: 13, fontWeight: 700, color: t.navy, margin: 0 },
  catRow:      { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` },
  lineRow:     { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${t.borderLight}` },
  inlineForm:  { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  barTrack:    { height: 6, background: t.borderLight, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
  pill:        { fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20 },
  deleteBtn:   { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 13, padding: '2px 4px', flexShrink: 0 },
  label:       { display: 'block', fontSize: 12, color: t.navyLight, fontWeight: 500, marginBottom: 5 },
  input:       { width: '100%', padding: '9px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:  { padding: '9px 18px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  btnSecondary:{ padding: '9px 14px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 13, color: t.navyLight, cursor: 'pointer', flexShrink: 0 },
  btnSmall:    { padding: '5px 12px', border: `1px solid ${t.border}`, borderRadius: 6, background: '#fff', fontSize: 13, color: t.navyMid, cursor: 'pointer', fontWeight: 600, flexShrink: 0 },
  exportBtn:   { padding: '6px 12px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: t.navyMid, cursor: 'pointer', flexShrink: 0 },
  muted:       { color: t.navyLight, fontSize: 14, margin: '8px 0' },
  error:       { color: '#c0392b', fontSize: 14, marginBottom: 12 },
}
