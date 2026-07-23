import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { t } from '../theme'
import { useT, LANGUAGES } from '../i18n'
import Ico from './Icon'

const NAV_LINKS = [
  { key: 'nav.budget',   path: '/budget',   icon: '💰' },
  { key: 'nav.house',    path: '/house',    icon: '🏠' },
  { key: 'nav.eating',   path: '/eating',   icon: '🥗' },
  { key: 'nav.children', path: '/children', icon: '🧒' },
  { key: 'nav.clothing', path: '/clothing', icon: '👗' },
  { key: 'nav.travel',   path: '/travel',   icon: '✈️' },
  { key: 'nav.debts',    path: '/debts',    icon: '💳' },
  { key: 'nav.savings',  path: '/savings',  icon: '🐷' },
  { key: 'nav.accounts', path: '/accounts', icon: '🏦' },
  { key: 'nav.subs',     path: '/subscriptions', icon: '🔁' },
  { key: 'nav.profile',  path: '/profile',  icon: '👤' },
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const { user, profile, premium, trialDaysLeft } = useUser()
  const { t: tr, lang, setLang } = useT()

  // Close the drawer whenever the route changes.
  useEffect(() => { setOpen(false) }, [pathname])

  const displayName = profile?.displayName || user?.email || ''
  const initials    = displayName.slice(0, 2).toUpperCase()

  function go(path) { navigate(path); setOpen(false) }
  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  return (
    <>
      {/* Hamburger button (sits in the mobile header) */}
      <button style={s.burger} onClick={() => setOpen(true)} aria-label="Menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.navy} strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && <div style={s.backdrop} onClick={() => setOpen(false)} />}

      {/* Slide-in drawer */}
      <aside style={{ ...s.drawer, transform: open ? 'translateX(0)' : 'translateX(100%)' }}>
        <div style={s.head}>
          <span style={s.logo} onClick={() => go('/budget')}>viv<span style={{ color: '#a8b8d8' }}>recon</span></span>
          <button style={s.close} onClick={() => setOpen(false)} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8b8d8" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <nav style={s.nav}>
          {NAV_LINKS.map(link => {
            const active = pathname === link.path
            return (
              <button key={link.path} style={{ ...s.link, ...(active ? s.linkActive : {}) }} onClick={() => go(link.path)}>
                <span style={s.icon}><Ico e={link.icon} size={18} /></span>{tr(link.key)}
              </button>
            )
          })}
        </nav>

        <div style={s.bottom}>
          <div style={s.premiumRow} onClick={() => go('/premium')}>
            <Ico e="⭐" size={14} />{' '}
            {trialDaysLeft > 0 ? tr('common.trialLeft', { days: trialDaysLeft }) : premium ? tr('common.premium') : tr('premium.upgrade')}
          </div>
          <div style={s.langRow}>
            <span style={s.langIcon}><Ico e="🌐" size={15} color="#dbe4f3" /></span>
            <select style={s.langSelect} value={lang} onChange={e => setLang(e.target.value)} aria-label={tr('common.language')}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ color: '#1a2233' }}>{l.label}</option>)}
            </select>
          </div>
          {displayName && (
            <div style={s.userRow}>
              <div style={s.avatar}>{initials}</div>
              <div style={s.userInfo}>
                <div style={s.userName}>{profile?.displayName || user?.email}</div>
                {profile?.displayName && <div style={s.userEmail}>{user?.email}</div>}
              </div>
            </div>
          )}
          <button style={s.signOut} onClick={logout}>{tr('common.signOut')}</button>
        </div>
      </aside>
    </>
  )
}

const s = {
  burger:   { border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.45)', zIndex: 998 },
  drawer:   { position: 'fixed', top: 0, right: 0, bottom: 0, width: '78%', maxWidth: 300, background: t.navy, zIndex: 999, display: 'flex', flexDirection: 'column', transition: 'transform 0.25s ease', boxShadow: '-8px 0 24px rgba(0,0,0,0.25)', overflowY: 'auto' },
  head:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 18px 12px' },
  logo:     { fontSize: 21, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', cursor: 'pointer' },
  close:    { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex' },
  nav:      { flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  link:     { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 9, border: 'none', background: 'transparent', color: '#a8b8d8', fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left', width: '100%' },
  linkActive:{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600 },
  icon:     { width: 24, textAlign: 'center', flexShrink: 0 },
  bottom:   { padding: '12px 14px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  premiumRow:{ fontSize: 12, fontWeight: 700, color: '#f0c040', background: 'rgba(240,192,64,0.12)', borderRadius: 8, padding: '9px 12px', marginBottom: 12, textAlign: 'center', cursor: 'pointer' },
  langRow:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  langIcon: { flexShrink: 0 },
  langSelect:{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#dbe4f3', fontSize: 13, cursor: 'pointer', outline: 'none' },
  userRow:  { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 },
  avatar:   { width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userInfo: { overflow: 'hidden' },
  userName: { fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userEmail:{ fontSize: 10, color: '#7a8fac', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  signOut:  { width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, background: 'transparent', color: '#a8b8d8', fontSize: 13, cursor: 'pointer', textAlign: 'center' },
}
