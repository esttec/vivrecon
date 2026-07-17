import { useEffect, useRef } from 'react'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { useNavigate } from 'react-router-dom'
import { t } from '../theme'
import Ico from './Icon'

/*
 * App-wide ad slot.
 *
 * Paid subscribers get an ad-free experience — for them this renders NOTHING.
 * Everyone else (free + trial) sees an ad.
 *
 * Real Google AdSense ads show once BOTH are true:
 *   1. Your AdSense account is approved for vivrecon.com, and
 *   2. AD_SLOT below is filled with an ad-unit slot ID.
 * Until then (or if the unit fails to fill) we show a house ad promoting Premium.
 *
 * To go live: in AdSense create Ads → By ad unit → Display ad, copy its
 * data-ad-slot number, and paste it into AD_SLOT below.
 */
const AD_CLIENT = 'ca-pub-3203999306038109'
const AD_SLOT   = '' // TODO: paste your ad-unit slot ID here once approved

export default function AdBanner() {
  const { paid } = useUser()
  const { t: tr } = useT()
  const navigate = useNavigate()
  const pushed = useRef(false)

  useEffect(() => {
    if (paid || !AD_SLOT || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch (_) { /* AdSense not loaded yet — ignore */ }
  }, [paid])

  // Ad-free for paying customers.
  if (paid) return null

  // Real AdSense unit once a slot ID is configured.
  if (AD_SLOT) {
    return (
      <div style={s.adWrap} aria-label="advertisement">
        <ins className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={AD_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true" />
      </div>
    )
  }

  // Fallback house ad (shown until AdSense is live).
  return (
    <div style={s.wrap} aria-label="advertisement">
      <span style={s.tag}>{tr('ad.label')}</span>
      <div style={s.body}>
        <span style={s.icon}><Ico e="🚫" size={18} /></span>
        <span style={s.text}>{tr('ad.removeAds')}</span>
      </div>
      <button style={s.cta} onClick={() => navigate('/premium')}>
        {tr('premium.upgrade')}
      </button>
    </div>
  )
}

const s = {
  adWrap: { maxWidth: 960, width: '100%', margin: '8px auto 20px', minHeight: 90 },
  wrap: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    maxWidth: 960, width: '100%', margin: '8px auto 20px',
    padding: '10px 14px', borderRadius: 12,
    background: t.surface, border: `1px dashed ${t.border}`,
  },
  tag: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
    color: t.navyLight, background: t.borderLight, borderRadius: 5, padding: '2px 6px',
  },
  body: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 },
  icon: { display: 'flex', color: t.navyMid },
  text: { fontSize: 13, color: t.navy, fontWeight: 500 },
  cta: {
    border: 'none', borderRadius: 8, background: t.navyMid, color: '#fff',
    fontSize: 12, fontWeight: 700, padding: '7px 14px', cursor: 'pointer', flexShrink: 0,
  },
}
