const TOKEN_KEY = 'argex.auth.token'

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function parseJwt(token) {
  if (!token) {
    return null
  }

  try {
    const [, payload] = token.split('.')
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(normalizedPayload)
    return JSON.parse(decodedPayload)
  } catch {
    return null
  }
}

export function isTokenExpired(token) {
  const payload = parseJwt(token)

  if (!payload?.exp) {
    return true
  }

  return payload.exp * 1000 <= Date.now()
}

export function buildUserFromToken(token) {
  const payload = parseJwt(token)

  if (!payload || isTokenExpired(token)) {
    return null
  }

  return {
    id: payload.sub,
    role: normalizeRole(payload.role),
    username: payload.username,
  }
}
