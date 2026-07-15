import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { t } from '../theme'
import { useT, LANGUAGES } from '../i18n'
import Ico from './Icon'

const NAV_LINKS = [
  { key: 'nav.budget',   path: '/budget',   icon: '💰' },
  { key: 'nav.house',    path: '/house',    icon: '🏠' },
  { key: 'nav.eating',   path: '/eating',   icon: '🥗' },
  { key: 'nav.clothing', path: '/clothing', icon: '👗' },
  { key: 'nav.travel',   path: '/travel',   icon: '✈️' },
  { key: 'nav.debts',    path: '/debts',    icon: '💳' },
  { key: 'nav.savings',  path: '/savings',  icon: '🐷' },
  { key: 'nav.accounts', path: '/accounts', icon: '🏦' },
  { key: 'nav.subs',     path: '/subscriptions', icon: '🔁' },
  { key: 'nav.profile',  path: '/profile',  icon: '👤' },
]

export default function AppSidebar() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const { user, profile, premium, trialDaysLeft } = useUser()
  const { t: tr, lang, setLang } = useT()

  const displayName = profile?.displayName || user?.email || ''
  const initials    = displayName.slice(0, 2).toUpperCase()

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.top}>
        <span style={s.logo} onClick={() => navigate('/budget')}>
          viv<span style={{ color: '#a8b8d8' }}>recon</span>
        </span>
      </div>

      <nav style={s.nav}>
        {NAV_LINKS.map(link => {
          const active = pathname === link.path
          return (
            <button
              key={link.path}
              style={{ ...s.link, ...(active ? s.linkActive : {}) }}
              onClick={() => navigate(link.path)}
            >
              <span style={s.icon}><Ico e={link.icon} size={17} /></span>
              {tr(link.key)}
            </button>
          )
        })}
      </nav>

      <div style={s.bottom}>
        <div style={{ ...s.premiumRow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => navigate('/premium')}>
          <Ico e="⭐" size={14} />
          {trialDaysLeft > 0
            ? tr('common.trialLeft', { days: trialDaysLeft })
            : premium ? tr('common.premium') : tr('premium.upgrade')}
        </div>
        <div style={s.social}>
          <a style={s.socialLink} href="https://www.instagram.com/vivreconapp" target="_blank" rel="noopener noreferrer">
            <span style={s.icon}><Ico e="📷" size={15} /></span>{tr('common.joinUs')} · Instagram
          </a>
          <a style={s.socialLink} href="https://www.facebook.com/profile.php?id=61585184466137" target="_blank" rel="noopener noreferrer">
            <span style={s.icon}><Ico e="👍" size={15} /></span>{tr('common.joinUs')} · Facebook
          </a>
        </div>
        <div style={s.langRow}>
          <span style={s.langIcon}><Ico e="🌐" size={15} color="#dbe4f3" /></span>
          <select
            style={s.langSelect}
            value={lang}
            onChange={e => setLang(e.target.value)}
            aria-label={tr('common.language')}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code} style={{ color: '#1a2233' }}>{l.label}</option>
            ))}
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
  )
}

const s = {
  sidebar:  { width: 220, background: t.navy, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  top:      { padding: '26px 20px 14px' },
  logo:     { fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', cursor: 'pointer' },
  nav:      { flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  link:     { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: 'none', background: 'transparent', color: '#a8b8d8', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left', width: '100%' },
  linkActive:{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600 },
  icon:     { fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 },
  bottom:   { padding: '12px 14px 22px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  premiumRow:{ fontSize: 12, fontWeight: 700, color: '#f0c040', background: 'rgba(240,192,64,0.12)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center' },
  langRow:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  langIcon: { fontSize: 15, flexShrink: 0 },
  langSelect:{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#dbe4f3', fontSize: 13, cursor: 'pointer', outline: 'none' },
  social:   { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 },
  joinLabel:{ fontSize: 11, fontWeight: 700, color: '#7a8fac', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 4px' },
  socialLink:{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, color: '#a8b8d8', fontSize: 13, fontWeight: 500, textDecoration: 'none' },
  userRow:  { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 },
  avatar:   { width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userInfo: { overflow: 'hidden' },
  userName: { fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userEmail:{ fontSize: 10, color: '#7a8fac', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  signOut:  { width: '100%', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, background: 'transparent', color: '#a8b8d8', fontSize: 13, cursor: 'pointer', textAlign: 'left' },
}
