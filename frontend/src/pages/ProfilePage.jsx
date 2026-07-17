import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useUser } from '../context/UserContext'
import { useIsMobile } from '../hooks/useIsMobile'
import AppSidebar from '../components/AppSidebar'
import BottomNav  from '../components/BottomNav'
import Ico from '../components/Icon'
import { t } from '../theme'
import { useT, LANGUAGES } from '../i18n'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'SEK', 'NOK']

// All possible budget categories the user can opt into
const ALL_CATEGORIES = [
  { key: 'rent',        label: 'Rent / Housing',   icon: '🏠', desc: 'Monthly rent, mortgage, or housing costs',  field: 'rentBudget' },
  { key: 'food',        label: 'Food',              icon: '🥗', desc: 'Groceries, dining out, meal plans',         field: 'foodBudget' },
  { key: 'transport',   label: 'Transport',         icon: '🚗', desc: 'Car, fuel, public transport, taxi',         field: 'transportBudget' },
  { key: 'savings',     label: 'Savings',           icon: '💰', desc: 'Monthly savings target (% of income)',      field: '_savings' },  // special — uses savingsTargetPercent
  { key: 'debts',       label: 'Debt payments',     icon: '💳', desc: 'Loan repayments, credit cards, instalments', field: 'debtPayments' },
  { key: 'other',       label: 'Other fixed costs', icon: '📦', desc: 'Subscriptions, insurance, anything else',  field: 'otherFixedExpenses' },
]

// Default share of income proposed for each category when suggesting a plan.
// Food is fixed at 20% (drives the weekly menu). When the client has debts we
// prioritise paying them down: debts 20%, savings 10% (otherwise savings 20%).
const SUGGESTED_PCT = { rent: 30, food: 20, transport: 10, savings: 20, debts: 20, other: 10 }

function suggestedPct(selectedCats) {
  const pct = { ...SUGGESTED_PCT }
  if (selectedCats.includes('debts')) {
    pct.debts = 20
    pct.savings = 10
  }
  return pct
}

const CATEGORY_COLORS = {
  rent:      '#3a5a8a',
  food:      '#2e8b57',
  transport: '#8b5e2e',
  savings:   '#2d4a8a',
  debts:     '#8b2e2e',
  other:     '#5a5a8a',
}

export default function ProfilePage() {
  const isMobile = useIsMobile()
  const navigate  = useNavigate()
  const { user, profile, loading: userLoading, fmt, refreshUser, paid, trialDaysLeft, premiumUntil } = useUser()
  const { t: tr, lang, setLang } = useT()

  // edit flow: null = not editing | 'categories' = step 1 | 'amounts' = step 2
  const [editStep, setEditStep]         = useState(null)
  const [selectedCats, setSelectedCats] = useState([])
  const [form, setForm]                 = useState(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  function startEdit() {
    // Pre-select categories that already have values
    const preSelected = ALL_CATEGORIES
      .filter(c => {
        if (c.key === 'savings') return Number(profile?.savingsTargetPercent ?? 0) > 0
        return Number(profile?.[c.field] ?? 0) > 0
      })
      .map(c => c.key)
    // Always pre-select savings if income is set but no cats chosen yet
    const initial = preSelected.length > 0 ? preSelected : ['savings']
    setSelectedCats(initial)
    setForm({
      displayName:          profile?.displayName          ?? '',
      currency:             profile?.currency             ?? 'EUR',
      monthlyIncome:        profile?.monthlyIncome        ?? '',
      savingsTargetPercent: profile?.savingsTargetPercent ?? '20',
      rentBudget:           profile?.rentBudget           ?? '',
      foodBudget:           profile?.foodBudget           ?? '',
      transportBudget:      profile?.transportBudget      ?? '',
      debtPayments:         profile?.debtPayments         ?? '',
      otherFixedExpenses:   profile?.otherFixedExpenses   ?? '',
      // Transport breakdown (drives transportBudget). Not persisted separately —
      // an existing amount is treated as the public-transport cost when re-editing.
      hasCar:               false,
      transitCost:          profile?.transportBudget != null ? String(profile.transportBudget) : '',
      fuelCost:             '',
      insuranceCost:        '',
    })
    setEditStep('categories')
    setError('')
  }

  function toggleCat(key) {
    setSelectedCats(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function goToAmounts() {
    if (selectedCats.length === 0) { setError('Please select at least one category.'); return }
    setError('')
    setEditStep('amounts')
  }

  function numOrNull(val) {
    const n = parseFloat(val)
    return isNaN(n) || val === '' ? null : n
  }

  const fieldMap = { rent: 'rentBudget', food: 'foodBudget', transport: 'transportBudget', debts: 'debtPayments', other: 'otherFixedExpenses' }

  // Transport isn't a flat % of income — it depends on how you get around.
  // No car → a public-transport cost. Car → fuel + insurance per month.
  function transportFromDetails(d) {
    const amount = d.hasCar
      ? Number(d.fuelCost || 0) + Number(d.insuranceCost || 0)
      : Number(d.transitCost || 0)
    return amount ? amount.toFixed(2) : ''
  }

  // Merge transport-detail changes and keep transportBudget in sync.
  function updateTransport(patch) {
    setForm(f => {
      const next = { ...f, ...patch }
      next.transportBudget = transportFromDetails(next)
      return next
    })
  }

  // Propose an amount for every selected category from the entered income,
  // using sensible default shares. Transport is computed from real costs
  // (public transport, or fuel + insurance for a car) rather than a flat %.
  function suggestFromIncome() {
    const income = parseFloat(form.monthlyIncome)
    if (!income || income <= 0) { setError(tr('profile.needIncome')); return }
    setError('')
    const shares = suggestedPct(selectedCats)
    setForm(f => {
      const next = { ...f }
      for (const key of selectedCats) {
        if (key === 'transport') {
          if (!next.hasCar && !next.transitCost) next.transitCost = '30'
          next.transportBudget = transportFromDetails(next)
          continue
        }
        const pct = shares[key] ?? 0
        if (key === 'savings') next.savingsTargetPercent = String(pct)
        else if (fieldMap[key]) next[fieldMap[key]] = (income * pct / 100).toFixed(2)
      }
      return next
    })
  }

  // Total the plan allocates, in currency, given the current form.
  function plannedTotal(income) {
    const savingsPct = selectedCats.includes('savings') ? (numOrNull(form.savingsTargetPercent) ?? 0) : 0
    let total = income * savingsPct / 100
    for (const key of selectedCats) {
      if (key === 'savings') continue
      if (fieldMap[key]) total += Number(form[key === 'other' ? 'otherFixedExpenses' : fieldMap[key]] || 0)
    }
    return total
  }

  async function saveProfile(e) {
    e.preventDefault()

    // ── Validate before approving ────────────────────────────────────────────
    const income = numOrNull(form.monthlyIncome)
    if (!income || income <= 0) { setError(tr('profile.needIncome')); return }
    const total = plannedTotal(income)
    if (total > income + 0.005) {
      setError(tr('profile.overIncome', { amount: fmt(total - income) }))
      return
    }

    setSaving(true); setError('')

    // Send the full desired state — backend overwrites every field
    // Deselected categories are explicitly set to null (cleared)
    const payload = {
      displayName:          form.displayName.trim() || null,
      currency:             form.currency,
      monthlyIncome:        numOrNull(form.monthlyIncome),
      savingsTargetPercent: selectedCats.includes('savings')
                              ? (numOrNull(form.savingsTargetPercent) ?? 20)
                              : 0,
      rentBudget:           selectedCats.includes('rent')      ? numOrNull(form.rentBudget)        : null,
      foodBudget:           selectedCats.includes('food')      ? numOrNull(form.foodBudget)        : null,
      transportBudget:      selectedCats.includes('transport') ? numOrNull(form.transportBudget)   : null,
      debtPayments:         selectedCats.includes('debts')     ? numOrNull(form.debtPayments)      : null,
      otherFixedExpenses:   selectedCats.includes('other')     ? numOrNull(form.otherFixedExpenses): null,
    }

    try {
      const saved = await apiFetch('/api/me/profile', { method: 'PUT', body: JSON.stringify(payload) })
      if (!saved) throw new Error('No response from server')
      await refreshUser()
      setEditStep(null)
    } catch (err) {
      setError(err.message || 'Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  if (userLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: t.bg }}>
      <p style={{ color: t.navyLight }}>{tr('profile.loading')}</p>
    </div>
  )

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 }}>
      <p style={{ color: '#b91c1c' }}>{tr('profile.couldNotLoad')}</p>
      <button style={s.btnPrimary} onClick={() => navigate('/login')}>{tr('profile.backToLogin')}</button>
    </div>
  )

  // ── Derived values for overview ───────────────────────────────────────────
  const income     = Number(profile?.monthlyIncome        ?? 0)
  const savingsPct = Number(profile?.savingsTargetPercent ?? 0)
  const savingsAmt = income && savingsPct ? income * savingsPct / 100 : 0

  const categoryValues = {
    rent:      Number(profile?.rentBudget          ?? 0),
    food:      Number(profile?.foodBudget           ?? 0),
    transport: Number(profile?.transportBudget      ?? 0),
    savings:   savingsAmt,
    debts:     Number(profile?.debtPayments         ?? 0),
    other:     Number(profile?.otherFixedExpenses   ?? 0),
  }
  const totalPlanned = Object.values(categoryValues).reduce((s, v) => s + v, 0)
  const unallocated  = income - totalPlanned
  const activeCats   = ALL_CATEGORIES.filter(c => categoryValues[c.key] > 0)

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', paddingBottom: isMobile ? 64 : 0 }}>
      {!isMobile && <AppSidebar />}

      {isMobile && (
        <header style={s.mobileHeader}>
          <span style={s.mobileLogo} onClick={() => navigate('/budget')}>
            viv<span style={{ color: t.navyMid }}>recon</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              style={s.mobileLang}
              value={lang}
              onChange={e => setLang(e.target.value)}
              aria-label={tr('common.language')}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button style={s.mobileSignOut} onClick={logout}>{tr('common.signOut')}</button>
          </div>
        </header>
      )}

      <main style={{ flex: 1, padding: isMobile ? '68px 16px 24px' : '40px 44px', maxWidth: isMobile ? '100%' : 800, overflowY: 'auto' }}>
        <h1 style={s.pageTitle}>{tr('profile.title')}</h1>
        <p style={s.pageSubtitle}>{tr('profile.subtitle')}</p>

        {/* ─── VIEW MODE ────────────────────────────────────────────────────── */}
        {editStep === null && (
          <>
            {/* Subscription status */}
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex' }}><Ico e="⭐" size={22} color="#f0c040" /></span>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.navy }}>
                    {paid ? tr('premium.activeStatus') : trialDaysLeft > 0 ? tr('premium.trialActive', { days: trialDaysLeft }) : tr('common.freePlan')}
                  </div>
                  {paid && premiumUntil && (
                    <div style={{ fontSize: 13, color: t.navyLight, marginTop: 3 }}>{tr('premium.nextPayment', { date: premiumUntil })}</div>
                  )}
                </div>
                {!paid && <button style={s.editBtn} onClick={() => navigate('/premium')}>{tr('premium.upgrade')}</button>}
              </div>
            </div>

            {/* Location — shown at the top */}
            <LocationCard profile={profile} />

            {/* Personal info */}
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={s.cardTitle}>{tr('profile.personalInfo')}</h2>
                <button style={s.editBtn} onClick={startEdit}>{tr('profile.editProfile')}</button>
              </div>
              <InfoRow label={tr('profile.displayName')} value={profile?.displayName || '—'} />
              <InfoRow label={tr('profile.email')}        value={user.email} />
              <InfoRow label={tr('profile.currency')}     value={profile?.currency ?? 'EUR'} />
              <InfoRow label={tr('profile.monthlyIncome')} value={fmt(income || null)} />
            </div>

            {/* Budget overview — only if something is set */}
            {income > 0 && (
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={s.cardTitle}>{tr('profile.budgetPlan')}</h2>
                  <button style={s.editBtn} onClick={startEdit}>{tr('profile.updatePlan')}</button>
                </div>

                {/* Allocation bar */}
                {totalPlanned > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 10 }}>
                      {activeCats.map(c => {
                        const pct = (categoryValues[c.key] / income) * 100
                        return <div key={c.key} style={{ width: `${pct}%`, background: CATEGORY_COLORS[c.key], minWidth: pct > 0 ? 2 : 0 }} title={`${c.label}: ${pct.toFixed(1)}%`} />
                      })}
                      {unallocated > 0 && <div style={{ flex: 1, background: '#e8e3dc' }} title="Unallocated" />}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                      {activeCats.map(c => (
                        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[c.key] }} />
                          <span style={{ color: t.navyLight }}>{c.label}</span>
                        </div>
                      ))}
                      {unallocated > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#e8e3dc' }} />
                          <span style={{ color: t.navyLight }}>Unallocated</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeCats.map(c => (
                  <div key={c.key} style={s.budgetRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex' }}><Ico e={c.icon} size={16} /></span>
                      <span style={{ fontSize: 14, color: t.navy }}>{c.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: t.navyLight }}>
                        {income > 0 ? `${((categoryValues[c.key] / income) * 100).toFixed(0)}%` : ''}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: t.navy, minWidth: 80, textAlign: 'right' }}>
                        {fmt(categoryValues[c.key])}
                      </span>
                    </div>
                  </div>
                ))}

                {activeCats.length === 0 && (
                  <p style={{ color: t.navyLight, fontSize: 14 }}>{tr('profile.noCategories')}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 12, borderTop: `2px solid ${t.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.navyLight }}>{tr('profile.planned')}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.navy }}>{fmt(totalPlanned)}</span>
                </div>
                <div style={{ ...s.budgetRow, background: unallocated >= 0 ? '#e6f4ea' : '#fdecea', borderRadius: 8, padding: '10px 12px', marginTop: 6, border: 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: unallocated >= 0 ? '#1e6b3a' : '#9b2020' }}>
                    {unallocated >= 0 ? tr('profile.unallocated') : tr('profile.overPlanned')}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: unallocated >= 0 ? '#1e6b3a' : '#9b2020' }}>
                    {fmt(Math.abs(unallocated))}
                  </span>
                </div>
              </div>
            )}

            {!income && (
              <div style={{ ...s.card, textAlign: 'center', padding: '36px 20px' }}>
                <p style={{ margin: '0 0 10px', display: 'flex', justifyContent: 'center' }}><Ico e="💰" size={38} color={t.navyMid} /></p>
                <p style={{ fontSize: 15, fontWeight: 700, color: t.navy, marginBottom: 6 }}>{tr('profile.setupTitle')}</p>
                <p style={{ fontSize: 13, color: t.navyLight, marginBottom: 20 }}>{tr('profile.setupDesc')}</p>
                <button style={s.btnPrimary} onClick={startEdit}>{tr('profile.setupNow')}</button>
              </div>
            )}
          </>
        )}

        {/* ─── STEP 1: CATEGORY SELECTION ─────────────────────────────────── */}
        {editStep === 'categories' && form && (
          <div style={s.card}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ ...s.cardTitle, fontSize: 16, marginBottom: 6 }}>What do you want to plan for?</h2>
              <p style={{ fontSize: 13, color: t.navyLight, margin: 0 }}>
                Select the categories that apply to your monthly expenses. You can change these any time.
              </p>
            </div>

            {/* Basic info — always shown */}
            <div style={s.miniSection}>Basic info</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div>
                <label style={s.label}>Display name</label>
                <input style={s.input} value={form.displayName} placeholder="Your name"
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Currency</label>
                <select style={s.input} value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={s.label}>Monthly income (net)</label>
                <input style={s.input} type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.monthlyIncome}
                  onChange={e => setForm(f => ({ ...f, monthlyIncome: e.target.value }))} />
              </div>
            </div>

            <div style={s.miniSection}>Which costs do you want to track?</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {ALL_CATEGORIES.map(cat => {
                const active = selectedCats.includes(cat.key)
                return (
                  <button key={cat.key} type="button" onClick={() => toggleCat(cat.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
                      background: active ? '#e8eefb' : '#fff',
                      transition: 'all 0.15s',
                    }}>
                    <span style={{ flexShrink: 0, display: 'inline-flex' }}><Ico e={cat.icon} size={22} /></span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: active ? t.navyMid : t.navy }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: t.navyLight, marginTop: 2 }}>{cat.desc}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: active ? t.navyMid : 'transparent',
                        border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <span style={{ color: '#fff', display: 'inline-flex' }}><Ico e="✓" size={12} /></span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {error && <p style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.btnPrimary} onClick={goToAmounts}>Next: Set amounts <Ico e="→" size={13} style={{ display: 'inline-block', verticalAlign: '-2px' }} /></button>
              <button style={s.btnSecondary} onClick={() => setEditStep(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: AMOUNTS ────────────────────────────────────────────── */}
        {editStep === 'amounts' && form && (
          <form onSubmit={saveProfile}>
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: t.navyLight, padding: 0, lineHeight: 1 }}
                  onClick={() => setEditStep('categories')}><Ico e="←" size={20} /></button>
                <div>
                  <h2 style={{ ...s.cardTitle, fontSize: 16, margin: 0 }}>Set your monthly amounts</h2>
                  <p style={{ fontSize: 12, color: t.navyLight, margin: '3px 0 0' }}>
                    {selectedCats.length} categories selected · income: {fmt(Number(form.monthlyIncome) || null)}
                  </p>
                </div>
                <button type="button" style={{ ...s.editBtn, marginLeft: 'auto' }} onClick={suggestFromIncome}>
                  <Ico e="✨" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{tr('profile.suggest')}
                </button>
              </div>

              {/* Live "bank balance" — income minus everything allocated so far */}
              {(() => {
                const inc = Number(form.monthlyIncome) || 0
                const available = inc - plannedTotal(inc)
                const neg = available < 0
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, marginBottom: 18,
                    background: neg ? '#fdecea' : '#e6f4ea' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: neg ? '#9b2020' : '#1e6b3a' }}>
                      {neg ? tr('profile.overBy') : tr('profile.available')}
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: neg ? '#c0392b' : '#1e6b3a' }}>
                      {fmt(Math.abs(available))}
                    </span>
                  </div>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                {ALL_CATEGORIES.filter(c => selectedCats.includes(c.key)).map(cat => {
                  if (cat.key === 'savings') {
                    const inc = Number(form.monthlyIncome) || 0
                    const pct = Number(form.savingsTargetPercent) || 0
                    const monthly = inc && pct ? (inc * pct / 100) : 0
                    return (
                      <div key="savings">
                        <label style={s.label}>
                          <Ico e={cat.icon} size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{cat.label} — {pct}%
                          {monthly > 0 && <span style={{ color: t.navyMid, marginLeft: 6 }}>= {fmt(monthly)}/mo</span>}
                        </label>
                        <input style={{ ...s.input, cursor: 'pointer' }}
                          type="range" min="1" max="60" step="1"
                          value={form.savingsTargetPercent}
                          onChange={e => setForm(f => ({ ...f, savingsTargetPercent: e.target.value }))} />
                      </div>
                    )
                  }
                  // Transport gets a dedicated calculator instead of one flat number.
                  if (cat.key === 'transport') {
                    const carTab = (active) => ({
                      flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
                      background: active ? '#e8eefb' : '#fff', color: active ? t.navyMid : t.navyLight,
                    })
                    return (
                      <div key="transport" style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                        <label style={s.label}><Ico e={cat.icon} size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{cat.label}</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <button type="button" style={carTab(!form.hasCar)} onClick={() => updateTransport({ hasCar: false })}>
                            <Ico e="🚌" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />{tr('profile.noCar')}
                          </button>
                          <button type="button" style={carTab(form.hasCar)} onClick={() => updateTransport({ hasCar: true })}>
                            <Ico e="🚗" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />{tr('profile.hasCar')}
                          </button>
                        </div>
                        {!form.hasCar ? (
                          <input style={s.input} type="number" min="0" step="0.01" placeholder={tr('profile.transitMonthly')}
                            value={form.transitCost} onChange={e => updateTransport({ transitCost: e.target.value })} />
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input style={s.input} type="number" min="0" step="0.01" placeholder={tr('profile.fuelMonthly')}
                              value={form.fuelCost} onChange={e => updateTransport({ fuelCost: e.target.value })} />
                            <input style={s.input} type="number" min="0" step="0.01" placeholder={tr('profile.insuranceMonthly')}
                              value={form.insuranceCost} onChange={e => updateTransport({ insuranceCost: e.target.value })} />
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: t.navyMid, fontWeight: 600, marginTop: 6 }}>
                          {tr('profile.transportTotal')}: {fmt(Number(form.transportBudget || 0))}/mo
                        </div>
                      </div>
                    )
                  }
                  const fieldMap = { rent: 'rentBudget', food: 'foodBudget', transport: 'transportBudget', debts: 'debtPayments', other: 'otherFixedExpenses' }
                  const field = fieldMap[cat.key]
                  return (
                    <div key={cat.key}>
                      <label style={s.label}><Ico e={cat.icon} size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{cat.label}</label>
                      <input style={s.input} type="number" min="0" step="0.01" placeholder="0.00"
                        value={form[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                    </div>
                  )
                })}
              </div>

              {/* Live preview of allocation */}
              {Number(form.monthlyIncome) > 0 && (
                <div style={{ marginTop: 22, padding: '14px 16px', background: t.bg, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Preview</div>
                  {(() => {
                    const inc   = Number(form.monthlyIncome)
                    const pct   = Number(form.savingsTargetPercent) || 0
                    const vals  = {
                      rent:      selectedCats.includes('rent')      ? Number(form.rentBudget       || 0) : 0,
                      food:      selectedCats.includes('food')      ? Number(form.foodBudget       || 0) : 0,
                      transport: selectedCats.includes('transport') ? Number(form.transportBudget  || 0) : 0,
                      savings:   selectedCats.includes('savings')   ? inc * pct / 100               : 0,
                      debts:     selectedCats.includes('debts')     ? Number(form.debtPayments     || 0) : 0,
                      other:     selectedCats.includes('other')     ? Number(form.otherFixedExpenses|| 0) : 0,
                    }
                    const total = Object.values(vals).reduce((s, v) => s + v, 0)
                    const unalloc = inc - total
                    return (
                      <>
                        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                          {ALL_CATEGORIES.filter(c => vals[c.key] > 0).map(c => (
                            <div key={c.key} style={{ width: `${(vals[c.key]/inc)*100}%`, background: CATEGORY_COLORS[c.key] }} />
                          ))}
                          {unalloc > 0 && <div style={{ flex: 1, background: '#e8e3dc' }} />}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: t.navyLight }}>Total planned: <strong style={{ color: t.navy }}>{fmt(total)}</strong></span>
                          <span style={{ color: unalloc >= 0 ? '#1e6b3a' : '#9b2020', fontWeight: 700 }}>
                            {unalloc >= 0 ? `${fmt(unalloc)} unallocated` : `${fmt(Math.abs(unalloc))} over`}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {error && <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 12 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" style={s.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
                <button type="button" style={s.btnSecondary} onClick={() => setEditStep(null)}>Cancel</button>
              </div>
            </div>
          </form>
        )}
      </main>

      {isMobile && <BottomNav />}
    </div>
  )
}

function LocationCard({ profile }) {
  const { t: tr } = useT()
  const [loc, setLoc]       = useState(null)   // { ip, city, country, countryCode }
  const [status, setStatus] = useState('loading') // loading | ok | error

  useEffect(() => {
    let cancelled = false

    // Try several free, CORS-enabled IP-geolocation providers in turn.
    // Each normalises to { ip, city, country, countryCode }; the first that
    // returns a usable result wins. This avoids a single provider's rate
    // limit / outage leaving the card "Unavailable".
    const providers = [
      { url: 'https://ipwho.is/',                    map: d => d.success === false ? null : { ip: d.ip, city: d.city, country: d.country,      countryCode: d.country_code } },
      { url: 'https://get.geojs.io/v1/ip/geo.json',  map: d => ({ ip: d.ip, city: d.city, country: d.country,      countryCode: d.country_code }) },
      { url: 'https://ipapi.co/json/',               map: d => d.error ? null : { ip: d.ip, city: d.city, country: d.country_name, countryCode: d.country_code } },
    ]

    async function detect() {
      for (const p of providers) {
        try {
          const res = await fetch(p.url)
          if (!res.ok) continue
          const data = await res.json()
          const norm = p.map(data)
          if (norm && (norm.country || norm.city)) {
            if (!cancelled) { setLoc(norm); setStatus('ok') }
            return
          }
        } catch { /* try next provider */ }
      }
      if (!cancelled) setStatus('error')
    }

    detect()
    return () => { cancelled = true }
  }, [])

  const place = loc
    ? [loc.city, loc.country].filter(Boolean).join(', ') || '—'
    : '—'

  return (
    <div style={s.card}>
      <h2 style={{ ...s.cardTitle, marginBottom: 14 }}>{tr('profile.location')}</h2>
      <InfoRow
        label={tr('profile.yourLocation')}
        value={
          status === 'loading' ? tr('profile.detecting')
          : status === 'error' ? tr('profile.unavailable')
          : place
        }
      />
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.borderLight}` }}>
      <span style={{ fontSize: 13, color: t.navyLight }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: t.navy }}>{value}</span>
    </div>
  )
}

const s = {
  mobileHeader: { background: '#fff', borderBottom: `1px solid ${t.border}`, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10 },
  mobileLogo:   { fontSize: 18, fontWeight: 800, color: t.navy, letterSpacing: '-0.5px', cursor: 'pointer' },
  mobileSignOut:{ padding: '6px 14px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 13, color: t.navyLight, cursor: 'pointer' },
  mobileLang:   { padding: '6px 8px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 13, color: t.navy, cursor: 'pointer', outline: 'none' },
  pageTitle:    { fontSize: 26, fontWeight: 700, color: t.navy, margin: 0 },
  pageSubtitle: { fontSize: 14, color: t.navyLight, margin: '4px 0 24px' },
  card:         { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: '22px', marginBottom: 16 },
  linkCard:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 22px', cursor: 'pointer', textAlign: 'left' },
  cardTitle:    { fontSize: 14, fontWeight: 700, color: t.navy, margin: 0 },
  miniSection:  { fontSize: 11, fontWeight: 700, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${t.borderLight}` },
  editBtn:      { padding: '7px 16px', border: `1.5px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: t.navyMid, cursor: 'pointer' },
  label:        { display: 'block', fontSize: 13, color: t.navyLight, fontWeight: 500, marginBottom: 6 },
  input:        { width: '100%', padding: '10px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, outline: 'none', background: '#fff', boxSizing: 'border-box' },
  btnPrimary:   { padding: '10px 24px', background: t.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '10px 16px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 14, color: t.navyLight, cursor: 'pointer' },
  budgetRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` },
}
