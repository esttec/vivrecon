import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { basketForLang } from '../data/groceryBaskets'
import { t, badge } from '../theme'

const DAY_KEYS   = ['day.mon','day.tue','day.wed','day.thu','day.fri','day.sat','day.sun']
const MEAL_TYPES = ['BREAKFAST','LUNCH','DINNER','SNACK']
const LOCATIONS  = ['PANTRY','FRIDGE','FREEZER']

// How often an item is bought — used to spread its cost across weeks.
const PERIODS = [
  { weeks: 1,     key: 'per.week' },
  { weeks: 2,     key: 'per.2weeks' },
  { weeks: 4.345, key: 'per.month' },
]

// Monday of the current week as YYYY-MM-DD.
function mondayOfThisWeek() {
  const d = new Date()
  const offset = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export default function EatingPage() {
  const isMobile = useIsMobile()
  const { fmt, profile } = useUser()
  const { t: tr, lang } = useT()

  // Auto-generated weekly menu (editable draft before saving)
  const [draft, setDraft]           = useState(null) // [{ b, l, d }, ×7] or null
  const [savingMenu, setSavingMenu] = useState(false)
  const [scanning, setScanning]     = useState(false)
  const fileRef = useRef(null)

  // Weekly food allowance = the actual monthly food budget ÷ ~4.3 weeks.
  // Uses the food budget the user set (e.g. €200/mo → ~€46/wk); if none is set
  // yet, falls back to 20% of income.
  const monthlyIncome = Number(profile?.monthlyIncome || 0)
  const monthlyFood   = Number(profile?.foodBudget) > 0
    ? Number(profile.foodBudget)
    : (monthlyIncome > 0 ? monthlyIncome * 0.20 : 0)
  const weeklyFood    = monthlyFood > 0 ? Math.round(monthlyFood / 4.345) : null
  const [tab, setTab]             = useState('plans')
  const [mealPlans, setMealPlans] = useState([])
  const [pantry, setPantry]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showPlanForm, setShowPlanForm]   = useState(false)
  const [showPantryForm, setShowPantryForm] = useState(false)
  const [planForm, setPlanForm]   = useState({ weekStartDate: '', weeklyBudget: '' })
  const [pantryForm, setPantryForm] = useState({ name: '', quantity: '', location: 'PANTRY', expiryDate: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [plans, pantryItems] = await Promise.all([
        apiFetch('/api/eating/meal-plans'),
        apiFetch('/api/eating/pantry'),
      ])
      setMealPlans(plans)
      setPantry(pantryItems)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function addMealPlan(e) {
    e.preventDefault()
    try {
      await apiFetch('/api/eating/meal-plans', {
        method: 'POST',
        body: JSON.stringify({ weekStartDate: planForm.weekStartDate, weeklyBudget: planForm.weeklyBudget ? Number(planForm.weeklyBudget) : null }),
      })
      setShowPlanForm(false)
      setPlanForm({ weekStartDate: '', weeklyBudget: '' })
      loadAll()
    } catch (e) { setError(e.message) }
  }

  async function addPantryItem(e) {
    e.preventDefault()
    try {
      await apiFetch('/api/eating/pantry', {
        method: 'POST',
        body: JSON.stringify({ ...pantryForm, expiryDate: pantryForm.expiryDate || null }),
      })
      setShowPantryForm(false)
      setPantryForm({ name: '', quantity: '', location: 'PANTRY', expiryDate: '' })
      loadAll()
    } catch (e) { setError(e.message) }
  }

  async function deletePantryItem(id) {
    try { await apiFetch(`/api/eating/pantry/${id}`, { method: 'DELETE' }); loadAll() }
    catch (e) { setError(e.message) }
  }

  async function deleteMealPlan(id) {
    try { await apiFetch(`/api/eating/meal-plans/${id}`, { method: 'DELETE' }); loadAll() }
    catch (e) { setError(e.message) }
  }

  async function toggleShoppingItem(itemId) {
    try { await apiFetch(`/api/eating/shopping-items/${itemId}/toggle`, { method: 'PATCH' }); loadAll() }
    catch (e) { setError(e.message) }
  }

  // ── Weekly grocery basket ───────────────────────────────────────────────────

  // Build an editable basket draft from the country template.
  function generateBasket() {
    setError('')
    setDraft(basketForLang(lang).map(item => ({ ...item })))
    setShowPlanForm(false)
  }

  function updateItem(idx, field, value) {
    setDraft(d => d.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function addItem()      { setDraft(d => [...d, { name: '', qty: '', price: '', per: 1 }]) }
  function removeItem(idx) { setDraft(d => d.filter((_, i) => i !== idx)) }

  // Weekly cost of an item = its price spread over how many weeks it lasts.
  const itemWeeklyCost = it => (Number(it.price) || 0) / (Number(it.per) || 1)
  const basketTotal = (draft || []).reduce((sum, it) => sum + itemWeeklyCost(it), 0)

  // Persist the basket: create the week's plan, then attach a shopping list.
  async function saveBasket() {
    setSavingMenu(true); setError('')
    try {
      const plan = await apiFetch('/api/eating/meal-plans', {
        method: 'POST',
        body: JSON.stringify({ weekStartDate: mondayOfThisWeek(), weeklyBudget: weeklyFood }),
      })
      const items = draft
        .filter(it => (it.name || '').trim())
        .map(it => ({ productName: it.name.trim(), quantity: String(it.qty || ''), priceEstimate: Number(it.price) || null }))
      await apiFetch(`/api/eating/meal-plans/${plan.id}/shopping-lists`, {
        method: 'POST',
        body: JSON.stringify({ storeName: tr('eating.weeklyBasket'), items }),
      })
      setDraft(null)
      loadAll()
    } catch (e) { setError(e.message) }
    finally { setSavingMenu(false) }
  }

  // ── Receipt scanning (on-device OCR) ────────────────────────────────────────

  // Load Tesseract.js from a CDN on first use.
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract)
    return new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
      s.onload = () => resolve(window.Tesseract)
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  // Turn OCR text into basket items: keep lines that end in a price.
  function parseReceipt(text) {
    const priceRe = /(\d{1,3}[.,]\d{2})\s*[€A-Za-z]?\s*$/
    const skip = /summa|kokku|total|sum|kaart|sularaha|tagasi|käibemaks|\bkm\b|vat|balance|change/i
    const items = []
    for (const raw of text.split('\n')) {
      const line = raw.trim()
      const m = line.match(priceRe)
      if (!m) continue
      const price = parseFloat(m[1].replace(',', '.'))
      if (!price || price > 500) continue
      const name = line.slice(0, m.index).replace(/[.\-–·*x×]+$/i, '').trim()
      if (name.length < 2 || skip.test(name)) continue
      items.push({ name, qty: '', price: price.toFixed(2), per: 1 })
    }
    return items
  }

  async function handleReceipt(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setScanning(true); setError('')
    try {
      const Tesseract = await loadTesseract()
      const { data } = await Tesseract.recognize(file, 'eng+est')
      const items = parseReceipt(data.text || '')
      if (!items.length) { setError(tr('eating.scanFailed')); return }
      setDraft(items)
      setShowPlanForm(false)
    } catch {
      setError(tr('eating.scanFailed'))
    } finally {
      setScanning(false)
    }
  }

  const LOCATION_COLOR = { PANTRY: badge.grey, FRIDGE: badge.blue, FREEZER: badge.blue }

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{tr('eating.title')}</h1>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(tab === 'plans'  ? s.tabActive : {}) }} onClick={() => setTab('plans')}>{tr('eating.mealPlans')}</button>
            <button style={{ ...s.tab, ...(tab === 'pantry' ? s.tabActive : {}) }} onClick={() => setTab('pantry')}>{tr('eating.pantry')}</button>
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}
        {loading && <p style={s.muted}>{tr('common.loading')}</p>}

        {/* ── MEAL PLANS ── */}
        {tab === 'plans' && !loading && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <button style={s.btnPrimary} onClick={() => setShowPlanForm(true)}>{tr('eating.newPlanBtn')}</button>
              <button style={s.btnSecondary} onClick={generateBasket}><Ico e="🛒" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 5 }} />{tr('eating.generateList')}</button>
              <button style={s.btnSecondary} onClick={() => fileRef.current?.click()} disabled={scanning}>
                <Ico e="📷" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 5 }} />{scanning ? tr('eating.scanning') : tr('eating.scanReceipt')}
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleReceipt} />
            </div>

            {/* Auto-generated weekly grocery basket — editable before saving */}
            {draft && (() => {
              const over = weeklyFood != null && basketTotal > weeklyFood
              return (
                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    <h3 style={s.cardTitle}>{tr('eating.weeklyBasket')}</h3>
                    <span style={{ ...s.pill, ...badge.blue }}>
                      {tr('eating.weeklyBudget')}: {weeklyFood != null ? fmt(weeklyFood) : '—'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: t.navyLight, margin: '0 0 12px' }}>{tr('eating.basketHint')}</p>

                  {draft.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <input style={{ ...s.input, flex: 3, minWidth: 120 }} placeholder={tr('eating.product')} value={it.name}
                        onChange={e => updateItem(i, 'name', e.target.value)} />
                      <input style={{ ...s.input, flex: 1, minWidth: 56 }} placeholder={tr('eating.qty')} value={it.qty}
                        onChange={e => updateItem(i, 'qty', e.target.value)} />
                      <input style={{ ...s.input, flex: 1, minWidth: 64 }} type="number" step="0.01" min="0" placeholder={tr('eating.price')} value={it.price}
                        onChange={e => updateItem(i, 'price', e.target.value)} />
                      <select style={{ ...s.input, flex: 1, minWidth: 88 }} value={String(it.per || 1)}
                        onChange={e => updateItem(i, 'per', Number(e.target.value))}>
                        {PERIODS.map(p => <option key={p.key} value={String(p.weeks)}>{tr(p.key)}</option>)}
                      </select>
                      <button type="button" style={s.deleteBtn} onClick={() => removeItem(i)}><Ico e="✕" size={13} /></button>
                    </div>
                  ))}

                  <button type="button" style={{ ...s.btnSecondary, marginTop: 4 }} onClick={addItem}>{tr('eating.addProduct')}</button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: `2px solid ${t.border}` }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.navy }}>{tr('eating.total')} <span style={{ fontSize: 11, fontWeight: 500, color: t.navyLight }}>({tr('per.week')})</span></span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: over ? '#c0392b' : '#1e6b3a' }}>{fmt(basketTotal)}</span>
                  </div>
                  {over && <p style={{ fontSize: 12, color: '#c0392b', margin: '6px 0 0' }}>{tr('eating.overBudget', { amount: fmt(basketTotal - weeklyFood) })}</p>}
                  {weeklyFood != null && !over && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '8px 12px', background: '#e6f4ea', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e6b3a', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Ico e="🎁" size={14} />{tr('eating.leftForWishes')}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1e6b3a' }}>{fmt(weeklyFood - basketTotal)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button style={s.btnPrimary} onClick={saveBasket} disabled={savingMenu}>
                      {savingMenu ? tr('common.loading') : tr('eating.saveList')}
                    </button>
                    <button style={s.btnSecondary} onClick={() => setDraft(null)}>{tr('common.cancel')}</button>
                  </div>
                </div>
              )
            })()}

            {showPlanForm && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>{tr('eating.newPlan')}</h3>
                <form onSubmit={addMealPlan} style={s.formCol}>
                  <div>
                    <label style={s.label}>{tr('eating.weekStart')}</label>
                    <input style={s.input} type="date" required value={planForm.weekStartDate}
                      onChange={e => setPlanForm(f => ({ ...f, weekStartDate: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>{tr('eating.weeklyBudget')}</label>
                    <input style={s.input} type="number" placeholder="0.00" min="0" step="0.01"
                      value={planForm.weeklyBudget} onChange={e => setPlanForm(f => ({ ...f, weeklyBudget: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={s.btnPrimary}>{tr('common.create')}</button>
                    <button type="button" style={s.btnSecondary} onClick={() => setShowPlanForm(false)}>{tr('common.cancel')}</button>
                  </div>
                </form>
              </div>
            )}

            {mealPlans.length === 0 && <div style={s.empty}>{tr('eating.noPlans')}</div>}

            {mealPlans.map(plan => (
              <div key={plan.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={s.cardTitle}>{tr('eating.weekOf', { date: plan.weekStartDate })}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {plan.weeklyBudget && (
                      <span style={{ ...s.pill, ...badge.green }}>{tr('eating.budget')}: {fmt(plan.weeklyBudget)}</span>
                    )}
                    <button style={s.deleteBtn} onClick={() => deleteMealPlan(plan.id)}><Ico e="✕" size={13} /></button>
                  </div>
                </div>

                {/* Meal grid — horizontal scroll on mobile */}
                {plan.entries.length > 0 && (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <div style={{ ...s.mealGrid, minWidth: 420 }}>
                      {DAY_KEYS.map((dayKey, idx) => {
                        const dayEntries = plan.entries.filter(e => e.dayOfWeek === idx + 1)
                        return (
                          <div key={dayKey} style={s.dayCol}>
                            <div style={s.dayHeader}>{tr(dayKey)}</div>
                            {MEAL_TYPES.map(mType => {
                              const entry = dayEntries.find(e => e.mealType === mType)
                              return (
                                <div key={mType} style={s.mealCell}>
                                  <div style={s.mealType}>{mType.slice(0, 1)}</div>
                                  <div style={s.mealDesc}>{entry?.description || '—'}</div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {plan.entries.length === 0 && <p style={s.muted}>{tr('eating.noMeals')}</p>}

                {plan.shoppingLists.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={s.cardTitle}>{tr('eating.shoppingLists')}</div>
                    {plan.shoppingLists.map(list => (
                      <div key={list.id} style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: t.navy, marginBottom: 6 }}>
                          {list.storeName}
                          {list.isCheapest && <span style={{ ...s.pill, ...badge.green, marginLeft: 8 }}>{tr('eating.cheapest')}</span>}
                        </div>
                        {list.items.map(item => (
                          <div key={item.id} style={{ ...s.lineRow, opacity: item.checked ? 0.5 : 1 }}>
                            <input type="checkbox" checked={item.checked} onChange={() => toggleShoppingItem(item.id)} style={{ marginRight: 8 }} />
                            <span style={{ ...s.lineDesc, textDecoration: item.checked ? 'line-through' : 'none' }}>
                              {item.productName} — {item.quantity}
                            </span>
                            {item.priceEstimate && <span style={s.lineAmount}>{fmt(item.priceEstimate)}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── PANTRY ── */}
        {tab === 'pantry' && !loading && (
          <>
            <div style={{ marginBottom: 14 }}>
              <button style={s.btnPrimary} onClick={() => setShowPantryForm(true)}>{tr('eating.addItemBtn')}</button>
            </div>

            {showPantryForm && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>{tr('eating.addPantryItem')}</h3>
                <form onSubmit={addPantryItem} style={s.formCol}>
                  <input style={s.input} placeholder={tr('common.name')} required value={pantryForm.name}
                    onChange={e => setPantryForm(f => ({ ...f, name: e.target.value }))} />
                  <input style={s.input} placeholder={tr('eating.quantityPlaceholder')} required value={pantryForm.quantity}
                    onChange={e => setPantryForm(f => ({ ...f, quantity: e.target.value }))} />
                  <select style={s.input} value={pantryForm.location}
                    onChange={e => setPantryForm(f => ({ ...f, location: e.target.value }))}>
                    {LOCATIONS.map(l => <option key={l} value={l}>{tr('loc.' + l)}</option>)}
                  </select>
                  <input style={s.input} type="date" value={pantryForm.expiryDate}
                    onChange={e => setPantryForm(f => ({ ...f, expiryDate: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={s.btnPrimary}>{tr('common.add')}</button>
                    <button type="button" style={s.btnSecondary} onClick={() => setShowPantryForm(false)}>{tr('common.cancel')}</button>
                  </div>
                </form>
              </div>
            )}

            {pantry.length === 0 && <div style={s.empty}>{tr('eating.pantryEmpty')}</div>}

            {LOCATIONS.map(loc => {
              const items = pantry.filter(p => p.location === loc)
              if (!items.length) return null
              return (
                <div key={loc} style={s.card}>
                  <h2 style={s.cardTitle}>{tr('loc.' + loc)}</h2>
                  {items.map(item => (
                    <div key={item.id} style={s.lineRow}>
                      <span style={s.lineDesc}>{item.name}</span>
                      <span style={{ ...s.pill, ...LOCATION_COLOR[loc] }}>{item.quantity}</span>
                      {item.expiryDate && <span style={{ ...s.muted, flexShrink: 0 }}>{tr('eating.exp')}: {item.expiryDate}</span>}
                      <button style={s.deleteBtn} onClick={() => deletePantryItem(item.id)}><Ico e="✕" size={13} /></button>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}
      </main>
    </PageShell>
  )
}

const s = {
  main:        { maxWidth: 960, width: '100%', margin: '0 auto' },
  titleRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  title:       { fontSize: 24, fontWeight: 700, color: t.navy, margin: 0 },
  tabs:        { display: 'flex', gap: 4, background: t.borderLight, borderRadius: 10, padding: 4 },
  tab:         { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 14, color: t.navyLight, cursor: 'pointer', fontWeight: 500 },
  tabActive:   { background: '#fff', color: t.navy, fontWeight: 600 },
  card:        { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 14 },
  cardTitle:   { fontSize: 12, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' },
  mealGrid:    { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 },
  dayCol:      { display: 'flex', flexDirection: 'column', gap: 4 },
  dayHeader:   { fontSize: 10, fontWeight: 700, color: t.navyMid, textAlign: 'center', padding: '4px 0', background: '#e8eefb', borderRadius: 5 },
  mealCell:    { background: t.bg, borderRadius: 5, padding: '3px 5px', minHeight: 36 },
  mealType:    { fontSize: 8, fontWeight: 700, color: t.navyLight, textTransform: 'uppercase' },
  mealDesc:    { fontSize: 10, color: t.navy, marginTop: 2 },
  lineRow:     { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` },
  lineDesc:    { fontSize: 14, color: t.navy, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lineAmount:  { fontSize: 14, fontWeight: 600, color: t.navy, flexShrink: 0 },
  pill:        { fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, flexShrink: 0 },
  deleteBtn:   { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: '2px 4px', flexShrink: 0 },
  formCol:     { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 },
  label:       { display: 'block', fontSize: 12, color: t.navyLight, fontWeight: 500, marginBottom: 5 },
  input:       { width: '100%', padding: '10px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:  { padding: '9px 20px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '9px 16px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 14, color: t.navyLight, cursor: 'pointer' },
  muted:       { color: t.navyLight, fontSize: 13, margin: 0 },
  error:       { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:       { textAlign: 'center', padding: '48px 0', color: t.navyLight, fontSize: 15 },
}
