import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t } from '../theme'
import Ico from '../components/Icon'

// Premium package contents (icon + translation key).
const FEATURES = [
  { icon: '🤖', key: 'premium.aiChat', descKey: 'premium.aiChatDesc' },
  { icon: '📊', key: 'premium.analytics', descKey: 'premium.analyticsDesc' },
  { icon: '🎯', key: 'premium.catBudgets', descKey: 'premium.catBudgetsDesc' },
  { icon: '🐷', key: 'premium.unlimitedGoals', descKey: 'premium.unlimitedGoalsDesc' },
  { icon: '🏦', key: 'premium.unlimitedAccounts', descKey: 'premium.unlimitedAccountsDesc' },
  { icon: '🔒', key: 'premium.passwordLock', descKey: 'premium.passwordLockDesc' },
  { icon: '📤', key: 'premium.export', descKey: 'premium.exportDesc' },
  { icon: '📥', key: 'premium.import', descKey: 'premium.importDesc' },
  { icon: '🚫', key: 'premium.noAds' },
]

export default function PremiumPage() {
  const isMobile = useIsMobile()
  const { premium, paid, trialDaysLeft, premiumUntil, refreshUser } = useUser()
  const { t: tr } = useT()
  const navigate = useNavigate()
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [agreed, setAgreed] = useState(false)

  // Handle the redirect back from Stripe Checkout.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('checkout')
    if (p === 'success') { refreshUser(); setMsg(tr('premium.checkoutSuccess')) }
    else if (p === 'cancel') { setMsg(tr('premium.checkoutCancel')) }
    if (p) window.history.replaceState({}, '', '/premium')
  }, [])

  async function startCheckout(plan) {
    if (paid || activating) return
    setActivating(true); setError('')
    try {
      const res = await apiFetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) })
      if (res?.url) window.location.href = res.url          // → Stripe payment page
      else setError(tr('premium.billingUnavailable'))
    } catch (e) {
      setError(e.message || tr('premium.billingUnavailable'))
    } finally {
      setActivating(false)
    }
  }

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        {paid ? (
          <div style={s.activeWrap}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Ico e="⭐" size={44} color="#f0c040" /></div>
            <h1 style={s.title}>{tr('premium.title')}</h1>
            <div style={{ ...s.status, marginTop: 12 }}>{tr('premium.activeStatus')}</div>
            {premiumUntil && <p style={s.nextPay}>{tr('premium.nextPayment', { date: premiumUntil })}</p>}
            {msg && <p style={{ ...s.note, color: '#1e6b3a', background: '#eaf7ee', border: '1px solid #bcdcc4', borderRadius: 10, padding: '10px 14px' }}>{msg}</p>}
            <button style={{ ...s.cta, marginTop: 18 }} onClick={() => navigate('/profile')}>{tr('premium.manageInProfile')}</button>
          </div>
        ) : (
          <>
            <div style={s.hero}>
              <div style={{ display: 'flex', justifyContent: 'center' }}><Ico e="⭐" size={40} color="#f0c040" /></div>
              <h1 style={s.title}>{tr('premium.title')}</h1>
              <p style={s.subtitle}>{tr('premium.subtitle')}</p>
              <div style={s.status}>
                {trialDaysLeft > 0 ? tr('premium.trialActive', { days: trialDaysLeft }) : tr('common.freePlan')}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.included}>{tr('premium.included')}</div>
              {FEATURES.map(f => (
                <div key={f.key} style={s.row}>
                  <span style={{ width: 28, flexShrink: 0, display: 'inline-flex', justifyContent: 'center' }}><Ico e={f.icon} size={20} color={t.navyMid} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: t.navy, fontWeight: f.descKey ? 600 : 400 }}>{tr(f.key)}</div>
                    {f.descKey && <div style={s.rowDesc}>{tr(f.descKey)}</div>}
                  </div>
                  <span style={{ color: '#2e8b57', alignSelf: 'flex-start', marginTop: 2, display: 'inline-flex' }}><Ico e="✓" size={15} /></span>
                </div>
              ))}
            </div>

            {msg && <p style={{ ...s.note, color: '#1e6b3a', background: '#eaf7ee', border: '1px solid #bcdcc4', borderRadius: 10, padding: '10px 14px' }}>{msg}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={s.agreeRow}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
                <span>{tr('premium.disclaimer')} <Link to="/terms" style={s.termsLink}>{tr('premium.termsLink')}</Link></span>
              </label>
              <button
                style={{ ...s.cta, ...((activating || !agreed) ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                onClick={() => startCheckout('yearly')}
                disabled={activating || !agreed}
              >
                {activating ? '…' : tr('premium.subscribeYearly')}
              </button>
              <button
                style={{ ...s.ctaAlt, ...((activating || !agreed) ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                onClick={() => startCheckout('monthly')}
                disabled={activating || !agreed}
              >
                {activating ? '…' : tr('premium.subscribeMonthly')}
              </button>
            </div>

            {error && <p style={{ ...s.note, color: '#c0392b' }}>{error}</p>}
          </>
        )}
      </main>
    </PageShell>
  )
}

const planCard = (active) => ({
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  padding: '12px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
  border: active ? `2px solid ${t.navyMid}` : `2px solid ${t.borderLight}`,
  background: active ? '#e8eefb' : '#fff',
})

const s = {
  main:     { maxWidth: 640, width: '100%', margin: '0 auto' },
  plans:    { display: 'flex', gap: 10, marginBottom: 12 },
  hero:     { textAlign: 'center', marginBottom: 20 },
  title:    { fontSize: 28, fontWeight: 800, color: t.navy, margin: '8px 0 4px' },
  subtitle: { fontSize: 15, color: t.navyLight, margin: 0 },
  status:   { display: 'inline-block', marginTop: 14, fontSize: 13, fontWeight: 700, color: '#a6791a', background: 'rgba(240,192,64,0.18)', borderRadius: 20, padding: '6px 16px' },
  card:     { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, marginBottom: 18 },
  included: { fontSize: 12, fontWeight: 700, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  row:      { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${t.borderLight}` },
  rowDesc:  { fontSize: 12, color: t.navyLight, marginTop: 3, lineHeight: 1.4 },
  cta:      { width: '100%', padding: '14px 20px', background: t.navy, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  ctaAlt:   { width: '100%', padding: '13px 20px', background: '#fff', color: t.navy, border: `2px solid ${t.navyMid}`, borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  note:     { textAlign: 'center', fontSize: 12, color: t.navyLight, marginTop: 10 },
  termsLink:{ color: t.navyMid, fontWeight: 700, textDecoration: 'underline' },
  agreeRow: { display: 'flex', gap: 9, alignItems: 'flex-start', textAlign: 'left', fontSize: 13, color: t.navyLight, lineHeight: 1.5, background: '#f5f8ff', border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px' },
  activeWrap:{ textAlign: 'center', background: '#fff', border: `1px solid ${t.border}`, borderRadius: 16, padding: '32px 24px' },
  nextPay:  { fontSize: 14, color: t.navy, marginTop: 12, fontWeight: 600 },
}
