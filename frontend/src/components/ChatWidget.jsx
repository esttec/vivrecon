import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../api/client'
import { useUser } from '../context/UserContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useT } from '../i18n'
import { t } from '../theme'
import Ico from './Icon'

// Floating AI chat widget, bottom-right. Premium users only.
export default function ChatWidget() {
  const { premium } = useUser()
  const { t: tr } = useT()
  const isMobile = useIsMobile()
  const fabBottom = isMobile ? 76 : 24 // clear the mobile bottom-nav

  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, open])

  if (!premium) return null

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
    <>
      {open && (
        <div style={{ ...s.panel, bottom: fabBottom + 68 }}>
          <div style={s.header}>
            <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Ico e="🤖" size={17} />{tr('assistant.title')}</span>
            <button style={s.close} onClick={() => setOpen(false)}><Ico e="✕" size={15} /></button>
          </div>
          <div style={s.body}>
            {messages.length === 0 && <p style={s.intro}>{tr('assistant.intro')}</p>}
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
            <button type="submit" style={s.send} disabled={sending || !input.trim()}><Ico e="➤" size={16} /></button>
          </form>
        </div>
      )}

      <button style={{ ...s.fab, bottom: fabBottom }} onClick={() => setOpen(o => !o)} aria-label={tr('assistant.title')}>
        {open ? <Ico e="✕" size={22} /> : <Ico e="💬" size={24} />}
      </button>
    </>
  )
}

const s = {
  fab:        { position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: t.navy, color: '#fff', border: 'none', fontSize: 24, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel:      { position: 'fixed', bottom: 92, right: 24, width: 350, maxWidth: 'calc(100vw - 32px)', height: 480, maxHeight: 'calc(100vh - 150px)', background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000 },
  header:     { background: t.navy, color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  close:      { background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' },
  body:       { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: t.bg },
  intro:      { color: t.navyLight, fontSize: 13, textAlign: 'center', margin: '20px 8px' },
  bubble:     { maxWidth: '85%', padding: '9px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap' },
  userBubble: { background: t.navyMid, color: '#fff', borderBottomRightRadius: 3 },
  aiBubble:   { background: '#fff', border: `1px solid ${t.border}`, color: t.navy, borderBottomLeftRadius: 3 },
  error:      { color: '#c0392b', fontSize: 12 },
  inputRow:   { display: 'flex', gap: 8, padding: 10, borderTop: `1px solid ${t.border}`, background: '#fff', flexShrink: 0 },
  input:      { flex: 1, padding: '10px 12px', border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, color: t.navy, outline: 'none' },
  send:       { padding: '0 16px', background: t.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
}
