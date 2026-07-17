import AppSidebar from './AppSidebar'
import BottomNav  from './BottomNav'
import ChatWidget from './ChatWidget'
import AdBanner   from './AdBanner'
import { useIsMobile } from '../hooks/useIsMobile'
import { useNavigate, useLocation } from 'react-router-dom'
import { t } from '../theme'

const PAGE_LABELS = {
  '/budget':   'Budget',
  '/house':    'House',
  '/eating':   'Eating',
  '/clothing': 'Clothing',
  '/travel':   'Travel',
  '/profile':  'Profile',
}

export default function PageShell({ children }) {
  const isMobile   = useIsMobile()
  const navigate   = useNavigate()
  const { pathname } = useLocation()

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', paddingBottom: 64 }}>
        {/* Compact mobile header */}
        <header style={s.mobileHeader}>
          <span style={s.mobileLogo} onClick={() => navigate('/budget')}>
            viv<span style={{ color: t.navyMid }}>recon</span>
          </span>
          <span style={s.mobileTitle}>{PAGE_LABELS[pathname] ?? ''}</span>
        </header>
        {children}
        <div style={{ padding: '0 12px' }}><AdBanner /></div>
        <BottomNav />
        <ChatWidget />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex' }}>
      <AppSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {children}
        <div style={{ padding: '0 32px' }}><AdBanner /></div>
      </div>
      <ChatWidget />
    </div>
  )
}

const s = {
  mobileHeader: { background: '#fff', borderBottom: `1px solid ${t.border}`, padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  mobileLogo:   { fontSize: 18, fontWeight: 800, color: t.navy, letterSpacing: '-0.5px', cursor: 'pointer' },
  mobileTitle:  { fontSize: 14, fontWeight: 600, color: t.navy },
}
