export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  }
}

// A single in-flight refresh is shared across concurrent requests so we don't
// fire many refreshes at once when several calls fail together.
let refreshPromise = null

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return Promise.resolve(false)

  refreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return false
      const data = await res.json().catch(() => null)
      if (!data?.accessToken) return false
      localStorage.setItem('accessToken', data.accessToken)
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      return true
    })
    .catch(() => false)
    .finally(() => { refreshPromise = null })

  return refreshPromise
}

function logoutRedirect() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/login'
}

export async function apiFetch(url, options = {}) {
  const doFetch = () => fetch(url, { headers: authHeaders(), ...options })

  let res
  try {
    res = await doFetch()
  } catch (networkErr) {
    throw new Error('Cannot reach server — is the backend running?')
  }

  // An expired/invalid access token surfaces as 401 or 403. Try to refresh
  // it once with the stored refresh token, then retry the original request.
  if (res.status === 401 || res.status === 403) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      try {
        res = await doFetch()
      } catch (networkErr) {
        throw new Error('Cannot reach server — is the backend running?')
      }
    }
    // Refresh failed, or the retry is still unauthorised → session is over.
    if (!refreshed || res.status === 401 || res.status === 403) {
      logoutRedirect()
      return
    }
  }

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch {}

  if (!res.ok) {
    // Show the most specific error message available from the backend
    const msg = data?.message || data?.error || `Server error ${res.status}`
    throw new Error(msg)
  }

  return data
}
