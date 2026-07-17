import { useNavigate, useLocation } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { t } from '../theme'
import { useT } from '../i18n'

const NAV_ITEMS = [
  { key: 'nav.budget',   path: '/budget'   },
  { key: 'nav.house',    path: '/house'    },
  { key: 'nav.eating',   path: '/eating'   },
  { key: 'nav.children', path: '/children' },
  { key: 'nav.clothing', path: '/clothing' },
  { key: 'nav.travel',   path: '/travel'   },
  { key: 'nav.debts',    path: '/debts'    },
  { key: 'nav.savings',  path: '/savings'  },
  { key: 'nav.accounts', path: '/accounts' },
  { key: 'nav.subs',     path: '/subscriptions' },
  { key: 'nav.profile',  path: '/profile'  },
]

export default function TopBar() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const isMobile    = useIsMobile()
  const { t: tr }   = useT()

  return (
    <header style={{ ...s.bar, padding: isMobile ? '0 16px' : '0 32px', height: isMobile ? 48 : 56 }}>
      <span style={s.logo} onClick={() => navigate('/budget')}>
        viv<span style={{ color: t.navyMid }}>recon</span>
      </span>

      {!isMobile && (
        <nav style={s.nav}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{ ...s.navBtn, ...(active ? s.navActive : {}) }}
              >
                {tr(item.key)}
              </button>
            )
          })}
        </nav>
      )}

      {isMobile && (
        <span style={s.pageLabel}>
          {(() => { const it = NAV_ITEMS.find(i => i.path === location.pathname); return it ? tr(it.key) : '' })()}
        </span>
      )}
    </header>
  )
}

const s = {
  bar: {
    position:     'sticky',
    top:          0,
    zIndex:       10,
    background:   '#fff',
    borderBottom: `1px solid ${t.border}`,
    display:      'flex',
    alignItems:   'center',
    gap:          24,
  },
  logo: {
    fontSize:     18,
    fontWeight:   700,
    color:        t.navy,
    letterSpacing: '-0.5px',
    cursor:       'pointer',
    flexShrink:   0,
  },
  nav: {
    display: 'flex',
    gap:     4,
    flex:    1,
  },
  navBtn: {
    padding:      '6px 14px',
    borderRadius: 8,
    border:       'none',
    background:   'transparent',
    fontSize:     14,
    color:        t.navyLight,
    cursor:       'pointer',
    fontWeight:   500,
  },
  navActive: {
    background: '#e8eefb',
    color:      t.navyMid,
    fontWeight: 600,
  },
  pageLabel: {
    flex:       1,
    textAlign:  'right',
    fontSize:   14,
    fontWeight: 600,
    color:      t.navy,
  },
}
