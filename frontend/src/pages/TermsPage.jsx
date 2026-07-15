import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { t } from '../theme'
import Ico from '../components/Icon'
import { TERMS } from '../i18n/terms'

// Public Terms & Conditions page (viewable logged-out), shown in the active
// language. The content is a template — have it reviewed by a lawyer and fill in
// the bracketed details before relying on it.
export default function TermsPage() {
  const { t: tr, lang } = useT()
  const c = TERMS[lang] || TERMS.en

  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <Link to="/premium" style={s.back}><Ico e="←" size={16} /> {tr('common.back') || 'Back'}</Link>

        <h1 style={s.h1}>{tr('terms.title')}</h1>
        <p style={s.updated}>{c.updated}</p>

        <p style={s.p}>{c.intro}</p>

        <div style={s.disclaimer}>{c.disclaimer}</div>

        {c.sections.map(([heading, body], i) => (
          <div key={i}>
            <h2 style={s.h2}>{heading}</h2>
            <p style={s.p}>{body}</p>
          </div>
        ))}

        <p style={s.note}>{c.note}</p>
      </div>
    </div>
  )
}

const s = {
  wrap:    { minHeight: '100vh', background: '#f5f6fa', padding: '32px 16px' },
  inner:   { maxWidth: 720, margin: '0 auto', background: '#fff', border: `1px solid ${t.border}`, borderRadius: 16, padding: '28px 28px 40px' },
  back:    { display: 'inline-flex', alignItems: 'center', gap: 6, color: t.navyMid, fontWeight: 600, textDecoration: 'none', fontSize: 14, marginBottom: 16 },
  h1:      { fontSize: 26, fontWeight: 800, color: t.navy, margin: '0 0 4px' },
  updated: { fontSize: 12, color: t.navyLight, margin: '0 0 20px' },
  h2:      { fontSize: 16, fontWeight: 700, color: t.navy, margin: '22px 0 6px' },
  p:       { fontSize: 14, color: '#39434f', lineHeight: 1.6, margin: 0 },
  disclaimer: { fontSize: 14, color: '#7a5b00', lineHeight: 1.6, background: '#fff8e6', border: '1px solid #f0d488', borderRadius: 10, padding: '14px 16px', margin: '18px 0' },
  note:    { fontSize: 12, color: t.navyLight, fontStyle: 'italic', marginTop: 24, paddingTop: 14, borderTop: `1px solid ${t.borderLight}`, lineHeight: 1.5 },
}
