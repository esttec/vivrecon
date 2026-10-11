// Replace these two functions in auth.js

async function parseResponse(res, fallbackMessage) {
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.message || fallbackMessage)
  return data
}

export async function loginWithEmail(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseResponse(res, 'Invalid email or password')
}

export async function registerWithEmail(email, password) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseResponse(res, 'Registration failed')
}
export async function loginWithSocial(provider, body) {
  const res = await fetch(`/api/auth/social/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseResponse(res, 'Sign-in failed')
}

// Public client IDs; an empty value means that provider is not set up on the server yet.
export async function getSocialConfig() {
  try { const res = await fetch('/api/auth/social/config'); return res.ok ? await res.json() : {} } catch { return {} }
}
