import { useCallback, useEffect, useReducer } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GitHubUser {
  login: string // username e.g. "dogxii"
  name: string | null // display name
  avatar_url: string
  html_url: string
}

export interface AuthState {
  token: string | null
  user: GitHubUser | null
  loading: boolean // true while fetching user profile
  initialized: boolean
}

type AuthAction =
  | { type: 'INIT_START' }
  | { type: 'SET_TOKEN'; token: string }
  | { type: 'SET_USER'; user: GitHubUser }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; loading: boolean }

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'iface_gh_token'

function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {}
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INIT_START':
      return { ...state, loading: true }
    case 'SET_TOKEN':
      return { ...state, token: action.token, loading: true }
    case 'SET_USER':
      return { ...state, user: action.user, loading: false, initialized: true }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'LOGOUT':
      return { token: null, user: null, loading: false, initialized: true }
    default:
      return state
  }
}

// ─── GitHub API ───────────────────────────────────────────────────────────────

async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  }
  const data = await res.json()
  return {
    login: data.login,
    name: data.name ?? null,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
  }
}

// ─── OAuth URL builder ────────────────────────────────────────────────────────

/**
 * Build the GitHub OAuth authorization URL.
 * Scopes: only `gist` — the minimum required for creating/reading private gists.
 */
export function buildGitHubOAuthUrl(): string {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  if (!clientId) {
    throw new Error('VITE_GITHUB_CLIENT_ID is not set')
  }
  // Random state to protect against CSRF
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  try {
    sessionStorage.setItem('iface_oauth_state', state)
  } catch {}

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'gist',
    state,
  })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

// ─── Global listener registry (one store, many hook instances) ────────────────

const _listeners = new Set<(action: AuthAction) => void>()

function broadcastAuth(action: AuthAction) {
  for (const fn of _listeners) fn(action)
}

// ─── Singleton state (shared across all hook instances) ───────────────────────

let _globalToken: string | null = null
let _globalUser: GitHubUser | null = null
let _initialized = false

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthStore() {
  const [state, dispatch] = useReducer(reducer, {
    token: _globalToken,
    user: _globalUser,
    loading: false,
    initialized: _initialized,
  })

  // ── Register as global listener ──
  useEffect(() => {
    const listener = (action: AuthAction) => dispatch(action)
    _listeners.add(listener)
    return () => {
      _listeners.delete(listener)
    }
  }, [])

  // ── On mount: restore token from storage and fetch user ──
  useEffect(() => {
    if (_initialized) return
    _initialized = true

    const token = loadToken()
    if (!token) {
      broadcastAuth({ type: 'LOGOUT' }) // sets initialized = true
      return
    }

    _globalToken = token
    broadcastAuth({ type: 'SET_TOKEN', token })

    fetchGitHubUser(token)
      .then((user) => {
        _globalUser = user
        broadcastAuth({ type: 'SET_USER', user })
      })
      .catch(() => {
        // Token expired or revoked — clear it
        _globalToken = null
        _globalUser = null
        clearToken()
        broadcastAuth({ type: 'LOGOUT' })
      })
  }, [])

  // ── Handle OAuth callback: token arrives via URL hash ──
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('token=')) return

    const params = new URLSearchParams(hash.slice(1)) // remove leading #
    const token = params.get('token')
    if (!token) return

    // Validate state (CSRF protection)
    const returnedState = params.get('state')
    const savedState = (() => {
      try {
        return sessionStorage.getItem('iface_oauth_state')
      } catch {
        return null
      }
    })()
    if (savedState && returnedState && savedState !== returnedState) {
      console.warn('[auth] OAuth state mismatch — possible CSRF, ignoring token')
      // Clean URL anyway
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      return
    }
    try {
      sessionStorage.removeItem('iface_oauth_state')
    } catch {}

    // Clean token from URL immediately so it doesn't persist in history
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    saveToken(token)
    _globalToken = token
    broadcastAuth({ type: 'SET_TOKEN', token })

    fetchGitHubUser(token)
      .then((user) => {
        _globalUser = user
        broadcastAuth({ type: 'SET_USER', user })
      })
      .catch(() => {
        clearToken()
        _globalToken = null
        broadcastAuth({ type: 'LOGOUT' })
      })
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const login = useCallback(() => {
    try {
      window.location.href = buildGitHubOAuthUrl()
    } catch (err) {
      console.error('[auth] Failed to build OAuth URL:', err)
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    _globalToken = null
    _globalUser = null
    broadcastAuth({ type: 'LOGOUT' })
  }, [])

  /**
   * Manually supply a token (e.g. for testing or token refresh).
   * Fetches user profile immediately.
   */
  const setToken = useCallback(async (token: string) => {
    saveToken(token)
    _globalToken = token
    broadcastAuth({ type: 'SET_TOKEN', token })
    try {
      const user = await fetchGitHubUser(token)
      _globalUser = user
      broadcastAuth({ type: 'SET_USER', user })
    } catch {
      clearToken()
      _globalToken = null
      broadcastAuth({ type: 'LOGOUT' })
    }
  }, [])

  return {
    token: state.token,
    user: state.user,
    loading: state.loading,
    initialized: state.initialized,
    isLoggedIn: !!state.token && !!state.user,
    login,
    logout,
    setToken,
  }
}
