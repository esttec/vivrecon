import { useState } from 'react'
import { useT } from '../i18n'
import { t } from '../theme'

/* Simple cookie/consent notice with an Accept button.
   Remembers the choice so it only shows once. */
export default function CookieConsent() {
  const { t: tr } = useT()
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem('cookieConsent') === '1' } catch { return true }
  })

  if (accepted) return null

  function accept() {
    try { localStorage.setItem('cookieConsent', '1') } catch {}
    setAccepted(true)
  }

  return (
    <div style={s.bar} role="dialog" aria-label="Cookie notice">
      <span style={s.text}>
        {tr('cookie.msg')}{' '}
        <a href="/privacy.html" target="_blank" rel="noopener" style={s.link}>{tr('cookie.learn')}</a>
      </span>
      <button style={s.btn} onClick={accept}>{tr('cookie.accept')}</button>
    </div>
  )
}

const s = {
  bar: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
    background: t.navy, color: '#e6ecf7',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap',
    padding: '12px 18px', boxShadow: '0 -4px 16px rgba(0,0,0,0.18)',
  },
  text: { fontSize: 13, maxWidth: 720, lineHeight: 1.5 },
  link: { color: '#a8c0ec', textDecoration: 'underline' },
  btn: {
    border: 'none', borderRadius: 8, background: t.navyMid, color: '#fff',
    fontSize: 13, fontWeight: 700, padding: '9px 20px', cursor: 'pointer', flexShrink: 0,
  },
}
