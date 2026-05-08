import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, loginUser, loginWithPin, verifyLoginOtp } from '../services/authService'
import {
  buildUserFromToken,
  clearStoredToken,
  getStoredToken,
  isTokenExpired,
  storeToken,
} from '../services/tokenService'
import { normalizeRole } from '../utils/roles'

const AuthContext = createContext(null)

function getInitialAuthState() {
  const storedToken = getStoredToken()

  if (!storedToken || isTokenExpired(storedToken)) {
    clearStoredToken()
    return {
      token: null,
      user: null,
    }
  }

  return {
    token: storedToken,
    user: buildUserFromToken(storedToken),
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getInitialAuthState)
  const { token, user } = authState
  const userId = user?.id

  useEffect(() => {
    if (!token || !userId) {
      return undefined
    }

    let isMounted = true
    const timeout = setTimeout(async () => {
      try {
        const currentUser = await getCurrentUser()
        if (isMounted) {
          setAuthState((current) => ({
            ...current,
            user: {
              ...current.user,
              ...currentUser,
              role: normalizeRole(currentUser.role ?? current.user?.role),
            },
          }))
        }
      } catch {
        clearStoredToken()
        if (isMounted) {
          setAuthState({ token: null, user: null })
        }
      }
    }, 0)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [token, userId])

  const applyToken = useCallback(async (nextToken) => {
    const nextUser = buildUserFromToken(nextToken)

    if (!nextToken || !nextUser) {
      throw new Error('Login succeeded, but the token was invalid')
    }

    storeToken(nextToken)
    const currentUser = await getCurrentUser()
    setAuthState({
      token: nextToken,
      user: {
        ...nextUser,
        ...currentUser,
        role: normalizeRole(currentUser.role ?? nextUser.role),
      },
    })

    return {
      ...nextUser,
      ...currentUser,
      role: normalizeRole(currentUser.role ?? nextUser.role),
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await loginUser(credentials)
    if (response.otp_required || response.pin_required) {
      return response
    }

    const nextUser = await applyToken(response.access_token)
    return response.pin_setup_required ? { ...response, user: nextUser } : nextUser
  }, [applyToken])

  const verifyPin = useCallback(async (credentials) => {
    const response = await loginWithPin(credentials)
    return applyToken(response.access_token)
  }, [applyToken])

  const verifyOtp = useCallback(async (payload) => {
    const response = await verifyLoginOtp(payload)
    return applyToken(response.access_token)
  }, [applyToken])

  const logout = useCallback(() => {
    clearStoredToken()
    setAuthState({
      token: null,
      user: null,
    })
  }, [])

  const syncUser = useCallback((nextUser) => {
    if (!nextUser) {
      return
    }

    setAuthState((current) => ({
      ...current,
      user: {
        ...current.user,
        ...nextUser,
        id: String(nextUser.id ?? current.user?.id),
        role: normalizeRole(nextUser.role ?? current.user?.role),
      },
    }))
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      syncUser,
      token,
      user,
      verifyPin,
      verifyOtp,
    }),
    [login, logout, syncUser, token, user, verifyPin, verifyOtp],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
