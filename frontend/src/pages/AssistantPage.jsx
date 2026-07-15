import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t } from '../theme'

export default function AssistantPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { premium } = useUser()
  const { t: tr } = useT()

  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  async function send(e) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || sending) return
    setInput(''); setError('')
    setMessages(m => [...m, { role: 'user', text: msg }])
    setSending(true)
    try {
      const res = await apiFetch('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: msg }) })
      setMessages(m => [...m, { role: 'ai', text: res?.reply || '' }])
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '16px 12px' : '24px 32px' }}>
        <h1 style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 8 }}><Ico e="🤖" size={22} />{tr('assistant.title')}</h1>

        {!premium ? (
          <div style={s.upsell}>
            <p style={{ fontSize: 15, color: t.navy, marginBottom: 14 }}>{tr('assistant.upsell')}</p>
            <button style={s.cta} onClick={() => navigate('/premium')}>{tr('premium.upgrade')}</button>
          </div>
        ) : (
          <>
            <div style={s.chat}>
              {messages.length === 0 && (
                <p style={s.intro}>{tr('assistant.intro')}</p>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ ...s.bubble, ...(m.role === 'user' ? s.userBubble : s.aiBubble) }}>{m.text}</div>
                </div>
              ))}
              {sending && <div style={{ ...s.bubble, ...s.aiBubble, color: t.navyLight }}>…</div>}
              {error && <p style={s.error}>{error}</p>}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} style={s.inputRow}>
              <input style={s.input} placeholder={tr('assistant.placeholder')} value={input}
                onChange={e => setInput(e.target.value)} />
              <button type="submit" style={s.send} disabled={sending || !input.trim()}>{tr('assistant.send')}</button>
            </form>
          </>
        )}
      </main>
    </PageShell>
  )
}

const s = {
  main:       { maxWidth: 760, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '70vh' },
  title:      { fontSize: 22, fontWeight: 700, color: t.navy, margin: '0 0 16px' },
  upsell:     { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, textAlign: 'center' },
  cta:        { padding: '12px 22px', background: t.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  chat:       { flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 12px' },
  intro:      { color: t.navyLight, fontSize: 14, textAlign: 'center', margin: '24px 0' },
  bubble:     { maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' },
  userBubble: { background: t.navyMid, color: '#fff', borderBottomRightRadius: 4 },
  aiBubble:   { background: '#fff', border: `1px solid ${t.border}`, color: t.navy, borderBottomLeftRadius: 4 },
  error:      { color: '#c0392b', fontSize: 13 },
  inputRow:   { display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: t.bg, paddingTop: 8 },
  input:      { flex: 1, padding: '12px 14px', border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, color: t.navy, background: '#fff', outline: 'none' },
  send:       { padding: '12px 20px', background: t.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
