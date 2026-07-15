import { useState } from 'react'
import { t } from '../theme'
import Ico from '../components/Icon'

// ── Goal cards ────────────────────────────────────────────────────────────────

const GOALS = [
  {
    key:   'income',
    icon:  '💰',
    title: 'Income Planner',
    desc:  'I want to track and plan my monthly income from all sources.',
    color: '#1e6b3a',
    bg:    '#e6f4ea',
  },
  {
    key:   'expenses',
    icon:  '📊',
    title: 'Expense Control',
    desc:  'I need help managing and reducing my day-to-day expenses.',
    color: '#92550a',
    bg:    '#fef3e2',
  },
  {
    key:   'debt',
    icon:  '💳',
    title: 'Debt Freedom',
    desc:  'I have debts and want a clear plan to pay them off.',
    color: '#9b2020',
    bg:    '#fdecea',
  },
  {
    key:   'savings',
    icon:  '🏦',
    title: 'Save More Money',
    desc:  'I want to build savings and reach my financial goals.',
    color: '#1a3a7a',
    bg:    '#e8eefb',
  },
]

// ── Follow-up questions per goal ──────────────────────────────────────────────

const FOLLOWUPS = {
  income: {
    question: 'How do you receive your income?',
    options: [
      { key: 'salary',    label: '🏢 Regular salary',        desc: 'Monthly or bi-weekly paycheck' },
      { key: 'freelance', label: '💻 Freelance / contract',  desc: 'Variable income from clients'  },
      { key: 'mixed',     label: '🔀 Both',                   desc: 'Salary + side income'          },
      { key: 'other',     label: '📦 Other',                  desc: 'Rental, pension, investments'  },
    ],
  },
  expenses: {
    question: 'Which area do you struggle with most?',
    options: [
      { key: 'food',      label: '🥗 Food & dining',         desc: 'Groceries, restaurants, coffee' },
      { key: 'housing',   label: '🏠 Housing costs',          desc: 'Rent, utilities, maintenance'  },
      { key: 'shopping',  label: '🛍 Shopping',               desc: 'Clothes, gadgets, impulse buys' },
      { key: 'all',       label: '📋 Everything',             desc: 'I want a full overview'         },
    ],
  },
  debt: {
    question: 'What type of debt do you have?',
    options: [
      { key: 'credit',    label: '💳 Credit card(s)',         desc: 'High-interest revolving debt'  },
      { key: 'loan',      label: '🏦 Personal loan',          desc: 'Fixed-term bank loan'          },
      { key: 'mortgage',  label: '🏠 Mortgage',               desc: 'Home loan'                     },
      { key: 'multiple',  label: '📚 Multiple debts',         desc: 'More than one type'            },
    ],
  },
  savings: {
    question: 'What are you saving towards?',
    options: [
      { key: 'emergency', label: '🛡 Emergency fund',         desc: '3–6 months of expenses saved'  },
      { key: 'vacation',  label: '✈️ Vacation',               desc: 'Travel fund'                   },
      { key: 'purchase',  label: '🏠 Big purchase',           desc: 'House, car, equipment'         },
      { key: 'retire',    label: '🧓 Long-term / retirement', desc: 'Wealth building over time'     },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step,      setStep]      = useState(1)        // 1 = goals, 2 = follow-up, 3 = done
  const [goals,     setGoals]     = useState([])       // selected goal keys
  const [followups, setFollowups] = useState({})       // { goalKey: answerKey }
  const [goalIdx,   setGoalIdx]   = useState(0)        // which goal's follow-up we're on
  const [error,     setError]     = useState('')

  // ── Step 1: toggle goal selection ───────────────────────────────────────────

  function toggleGoal(key) {
    setGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
    setError('')
  }

  function goToFollowups() {
    if (goals.length === 0) { setError('Please select at least one option to continue.'); return }
    setGoalIdx(0)
    setStep(2)
  }

  // ── Step 2: answer follow-up for each selected goal ──────────────────────────

  function selectFollowup(goalKey, answerKey) {
    const updated = { ...followups, [goalKey]: answerKey }
    setFollowups(updated)

    const nextIdx = goalIdx + 1
    if (nextIdx < goals.length) {
      setGoalIdx(nextIdx)
    } else {
      setStep(3)
    }
  }

  // ── Step 3: finish ────────────────────────────────────────────────────────────

  function finish() {
    localStorage.setItem('onboardingCompleted', 'true')
    localStorage.setItem('onboardingGoals', JSON.stringify(goals))
    localStorage.setItem('onboardingAnswers', JSON.stringify(followups))
    window.location.href = '/budget'
  }

  // ── Progress ──────────────────────────────────────────────────────────────────

  const totalSteps = 2 + goals.length  // goal selection + follow-ups + done
  const currentStep = step === 1 ? 1 : step === 2 ? 1 + goalIdx + 1 : totalSteps + 1
  const pct = step === 3 ? 100 : Math.round((currentStep / (totalSteps + 1)) * 100)

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* ── Header ── */}
        <div style={s.header}>
          <span style={s.logo}>viv<span style={{ color: t.navyMid }}>recon</span></span>
          <div style={s.progressWrap}>
            <div style={{ ...s.progressBar, width: `${pct}%` }} />
          </div>
          <span style={s.progressLabel}>
            {step === 1 ? 'Getting to know you' : step === 2 ? `Question ${goalIdx + 1} of ${goals.length}` : 'All set!'}
          </span>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Choose goals
        ══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div style={s.body}>
            <h1 style={s.title}>What would you like to do?</h1>
            <p style={s.subtitle}>Select everything that applies — we'll tailor the app to your needs.</p>

            <div style={s.goalGrid}>
              {GOALS.map(g => {
                const selected = goals.includes(g.key)
                return (
                  <button
                    key={g.key}
                    style={{
                      ...s.goalCard,
                      background:   selected ? g.bg      : '#fff',
                      borderColor:  selected ? g.color   : t.border,
                      borderWidth:  selected ? 2         : 1.5,
                      boxShadow:    selected ? `0 0 0 3px ${g.bg}` : 'none',
                      transform:    selected ? 'translateY(-2px)' : 'none',
                    }}
                    onClick={() => toggleGoal(g.key)}
                  >
                    <span style={s.goalIcon}><Ico e={g.icon} size={24} /></span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ ...s.goalTitle, color: selected ? g.color : t.navy }}>
                        {g.title}
                      </div>
                      <div style={s.goalDesc}>{g.desc}</div>
                    </div>
                    {selected && (
                      <span style={{ ...s.checkmark, background: g.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ico e="✓" size={12} color="#fff" /></span>
                    )}
                  </button>
                )
              })}
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button style={s.primaryBtn} onClick={goToFollowups}>
              Continue <Ico e="→" size={14} style={{ display: 'inline-block', verticalAlign: '-2px' }} />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Follow-up questions
        ══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (() => {
          const goalKey  = goals[goalIdx]
          const goalMeta = GOALS.find(g => g.key === goalKey)
          const fu       = FOLLOWUPS[goalKey]
          return (
            <div style={s.body}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ display: 'inline-flex' }}><Ico e={goalMeta.icon} size={26} /></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: goalMeta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {goalMeta.title}
                </span>
              </div>
              <h1 style={s.title}>{fu.question}</h1>
              <p style={s.subtitle}>Pick the one that fits you best.</p>

              <div style={s.optionList}>
                {fu.options.map(opt => (
                  <button
                    key={opt.key}
                    style={s.optionCard}
                    onClick={() => selectFollowup(goalKey, opt.key)}
                  >
                    <span style={s.optionLabel}>{opt.label}</span>
                    <span style={s.optionDesc}>{opt.desc}</span>
                    <span style={s.optionArrow}>›</span>
                  </button>
                ))}
              </div>

              <button style={s.skipBtn} onClick={() => selectFollowup(goalKey, 'skip')}>
                Skip this question
              </button>
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3 — Done
        ══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div style={{ ...s.body, textAlign: 'center' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Ico e="🎉" size={54} color={t.navyMid} /></div>
            <h1 style={s.title}>You're all set!</h1>
            <p style={s.subtitle}>
              Here's what we'll focus on for you:
            </p>

            <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {goals.map(key => {
                const g = GOALS.find(g => g.key === key)
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: g.bg, borderRadius: 12 }}>
                    <span style={{ display: 'inline-flex' }}><Ico e={g.icon} size={19} /></span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{g.title}</div>
                      <div style={{ fontSize: 12, color: t.navyLight }}>{g.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p style={{ fontSize: 13, color: t.navyLight, marginBottom: 28, lineHeight: 1.6 }}>
              You can always update your preferences in your profile settings.
            </p>

            <button style={s.primaryBtn} onClick={finish}>
              Get started <Ico e="→" size={14} style={{ display: 'inline-block', verticalAlign: '-2px' }} />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    background: t.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 4px 32px rgba(26,39,68,0.10)',
    overflow: 'hidden',
  },

  // Header
  header: {
    padding: '24px 28px 16px',
    borderBottom: `1px solid ${t.borderLight}`,
  },
  logo: {
    fontSize: 20, fontWeight: 800, color: t.navy, letterSpacing: '-0.5px',
    display: 'block', marginBottom: 14,
  },
  progressWrap: {
    height: 6, background: t.borderLight, borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  progressBar: {
    height: '100%', background: t.navyMid, borderRadius: 3,
    transition: 'width 0.4s ease',
  },
  progressLabel: {
    fontSize: 12, color: t.navyLight, fontWeight: 500,
  },

  // Body
  body: {
    padding: '28px 28px 32px',
  },
  title: {
    fontSize: 22, fontWeight: 800, color: t.navy,
    margin: '0 0 8px', letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 14, color: t.navyLight, margin: '0 0 24px', lineHeight: 1.6,
  },

  // Goal cards
  goalGrid: {
    display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20,
  },
  goalCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${t.border}`,
    background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
    transition: 'all 0.18s ease',
  },
  goalIcon:  { fontSize: 22, flexShrink: 0 },
  goalTitle: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  goalDesc:  { fontSize: 12, color: t.navyLight, lineHeight: 1.4 },
  checkmark: {
    width: 22, height: 22, borderRadius: '50%',
    color: '#fff', fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  // Option list (step 2)
  optionList: {
    display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16,
  },
  optionCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderRadius: 12,
    border: `1.5px solid ${t.border}`, background: '#fff',
    cursor: 'pointer', width: '100%', textAlign: 'left',
    transition: 'all 0.15s',
  },
  optionLabel: { fontSize: 14, fontWeight: 600, color: t.navy, flex: 1 },
  optionDesc:  { fontSize: 12, color: t.navyLight, marginRight: 6 },
  optionArrow: { fontSize: 18, color: t.navyLight, flexShrink: 0 },

  // Buttons
  primaryBtn: {
    width: '100%', padding: '14px 0',
    background: t.navy, color: '#fff',
    border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.3px',
  },
  skipBtn: {
    width: '100%', padding: '10px 0',
    background: 'transparent', color: t.navyLight,
    border: 'none', borderRadius: 10,
    fontSize: 13, cursor: 'pointer',
  },

  error: { color: '#b91c1c', fontSize: 13, marginBottom: 12 },
}
