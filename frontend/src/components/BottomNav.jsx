import { useNavigate, useLocation } from 'react-router-dom'
import { t } from '../theme'
import { useT } from '../i18n'
import Ico from './Icon'

const NAV = [
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

export default function BottomNav() {
  const navigate      = useNavigate()
  const { pathname }  = useLocation()
  const { t: tr }     = useT()

  return (
    <nav style={s.bar}>
      {NAV.map(item => {
        const active = pathname === item.path
        return (
          <button
            key={item.path}
            style={s.btn}
            onClick={() => navigate(item.path)}
          >
            <Ico e={item.icon} size={21} color={active ? t.navyMid : t.navyLight} />
            <span style={{ ...s.label, ...(active ? s.labelActive : {}) }}>{tr(item.key)}</span>
            {active && <span style={s.dot} />}
          </button>
        )
      })}
    </nav>
  )
}

const s = {
  bar:        { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: `1px solid ${t.border}`, display: 'flex', zIndex: 200 },
  btn:        { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 2px 10px', minHeight: 58, position: 'relative' },
  icon:       { fontSize: 20, lineHeight: 1 },
  label:      { fontSize: 10, color: t.navyLight, fontWeight: 500, lineHeight: 1 },
  labelActive:{ color: t.navyMid, fontWeight: 700 },
  dot:        { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: '50%', background: t.navyMid },
}
