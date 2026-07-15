import { useState } from 'react'
import { loginWithEmail, registerWithEmail } from '../api/auth'
import { t } from '../theme'

// ── Social login button icons (inline SVG) ───────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#1877f2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [mode,       setMode]       = useState('login')   // 'login' | 'register'
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await loginWithEmail(email, password)
        if (rememberMe) localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('accessToken',  data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        // Send to onboarding if they've never completed it
        const onboarded = localStorage.getItem('onboardingCompleted')
        window.location.href = onboarded ? '/budget' : '/onboarding'
      } else {
        const data = await registerWithEmail(email, password)
        localStorage.setItem('accessToken',  data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        // Always send new registrations through onboarding
        window.location.href = '/onboarding'
      }
    } catch (err) {
      setError(err.message || (mode === 'login' ? 'Invalid email or password' : 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setPassword('')
    setConfirm('')
    setForgotSent(false)
  }

  function handleForgotPassword(e) {
    e.preventDefault()
    if (!email) {
      setError('Enter your email address above, then click Forgot password.')
      return
    }
    // TODO: call /api/auth/forgot-password when backend supports it
    setForgotSent(true)
    setError('')
  }

  return (
    <div style={s.page}>
      <div style={s.right}>
        <div style={s.formBox}>

          {/* Logo — always visible since there's no left panel */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: t.navy, letterSpacing: '-1px' }}>
              viv<span style={{ color: t.navyMid }}>recon</span>
            </span>
            <p style={{ fontSize: 13, color: t.navyLight, margin: '6px 0 0' }}>Your personal finance companion</p>
          </div>

          {/* ── Mode toggle ── */}
          <div style={s.modeToggle}>
            <button
              style={{ ...s.modeBtn, ...(mode === 'login'    ? s.modeBtnActive : {}) }}
              onClick={() => switchMode('login')}>
              Sign In
            </button>
            <button
              style={{ ...s.modeBtn, ...(mode === 'register' ? s.modeBtnActive : {}) }}
              onClick={() => switchMode('register')}>
              Create Account
            </button>
          </div>

          {/* Status messages */}
          {success && <p style={s.successMsg}>{success}</p>}
          {error   && <p style={s.errorMsg}>{error}</p>}

          {/* ── Email / password form ── */}
          <form onSubmit={handleSubmit}>
            <label style={s.label}>Email address</label>
            <input
              style={s.input} type="email" placeholder="your@email.com"
              required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} />

            <label style={s.label}>Password</label>
            <input
              style={{ ...s.input, marginBottom: mode === 'login' ? 10 : 16 }}
              type="password" placeholder="••••••••"
              required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password} onChange={e => setPassword(e.target.value)} />

            {/* Remember me + Forgot password — sign-in only */}
            {mode === 'login' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: t.navyMid, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: t.navyLight }}>Remember me</span>
                </label>
                <a href="#" style={s.forgotLink} onClick={handleForgotPassword}>
                  Forgot password?
                </a>
              </div>
            )}

            {forgotSent && (
              <p style={s.successMsg}>
                ✓ If that email is registered, a reset link has been sent.
              </p>
            )}

            {mode === 'register' && (
              <>
                <label style={s.label}>Confirm password</label>
                <input
                  style={s.input} type="password" placeholder="••••••••"
                  required autoComplete="new-password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </>
            )}

            <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In'      : 'Create Account')}
            </button>
          </form>

          {/* ── Divider ── */}
          <div style={s.divider}>
            <div style={s.divLine} />
            <span style={s.divText}>or continue with</span>
            <div style={s.divLine} />
          </div>

          {/* ── Social login buttons ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SocialBtn Icon={GoogleIcon}   label="Continue with Google"   bg="#fff"     color="#3c4043" border="#dadce0" />
            <SocialBtn Icon={FacebookIcon} label="Continue with Facebook"  bg="#1877f2"  color="#fff"    border="#1877f2" />
            <SocialBtn Icon={AppleIcon}    label="Continue with Apple"     bg="#000"     color="#fff"    border="#000"    />
          </div>

          {/* ── Terms & Conditions ── */}
          <p style={s.terms}>
            By continuing you agree to our{' '}
            <a href="#" style={s.termsLink} onClick={e => e.preventDefault()}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={s.termsLink} onClick={e => e.preventDefault()}>Privacy Policy</a>.
          </p>
        </div>
      </div>

    </div>
  )
}

// ── Social button component ───────────────────────────────────────────────────

function SocialBtn({ Icon, label, bg, color, border }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '12px 0',
        background: hov ? bg + 'dd' : bg,
        color, border: `1.5px solid ${border}`,
        borderRadius: 9, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', transition: 'opacity 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => alert(`${label} — coming soon`)}>
      <Icon />
      {label}
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    background: t.bg,
  },

  // Right panel
  right: {
    flex: 1, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: '48px 32px',
    overflowY: 'auto',
  },
  formBox: {
    width: '100%', maxWidth: 400,
  },

  // Mode toggle
  modeToggle: {
    display: 'flex', gap: 4,
    background: t.borderLight, borderRadius: 12, padding: 4,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1, padding: '10px 0',
    border: 'none', borderRadius: 9,
    background: 'transparent',
    fontSize: 14, fontWeight: 600,
    color: t.navyLight, cursor: 'pointer',
    transition: 'all 0.15s',
  },
  modeBtnActive: {
    background: '#fff',
    color: t.navy,
    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
  },

  // Form elements
  label: {
    display: 'block', fontSize: 13, color: t.navyLight,
    fontWeight: 500, marginBottom: 6,
  },
  input: {
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${t.border}`, borderRadius: 9,
    fontSize: 14, color: t.navy, outline: 'none',
    marginBottom: 16, background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  submitBtn: {
    width: '100%', padding: '14px 0',
    background: t.navy, color: '#fff',
    border: 'none', borderRadius: 9,
    fontSize: 15, fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.3px',
    marginTop: 4,
    transition: 'opacity 0.15s',
  },

  // Divider
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '22px 0',
  },
  divLine: {
    flex: 1, height: 1, background: t.border,
  },
  divText: {
    fontSize: 12, color: t.navyLight, whiteSpace: 'nowrap', fontWeight: 500,
  },

  // Messages
  errorMsg:   { color: '#b91c1c', fontSize: 13, marginBottom: 14, marginTop: -4 },
  successMsg: { color: '#1e6b3a', fontSize: 13, marginBottom: 14, marginTop: -4 },
  forgotLink: { fontSize: 13, color: t.navyMid, fontWeight: 600, textDecoration: 'none' },

  // Terms
  terms: {
    fontSize: 12, color: t.navyLight,
    textAlign: 'center', marginTop: 20, lineHeight: 1.6,
  },
  termsLink: {
    color: t.navyMid, fontWeight: 600, textDecoration: 'none',
  },
}
