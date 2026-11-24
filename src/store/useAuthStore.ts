import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { readString, removeKey, STORAGE_KEYS, writeString } from '@/lib/storage'

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

/** Thrown when GitHub rejects the token (as opposed to a network failure). */
class GitHubAuthError extends Error {}

async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 401 || res.status === 403) {
    throw new GitHubAuthError(`GitHub API ${res.status}`)
  }
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

interface AuthActions {
  login: () => void
  logout: () => void
  setToken: (token: string) => Promise<void>
}

export const useAuthState = create<AuthState & AuthActions>()((set) => {
  const signOut = () => {
    removeKey(STORAGE_KEYS.githubToken)
    set({ token: null, user: null, loading: false, initialized: true })
  }

  return {
    token: null,
    user: null,
    loading: false,
    initialized: false,

    login() {
      try {
        window.location.href = buildGitHubOAuthUrl()
      } catch (err) {
        console.error('[auth] Failed to build OAuth URL:', err)
      }
    },

    logout: signOut,

    /** Store a token and load the matching GitHub profile. */
    async setToken(token) {
      writeString(STORAGE_KEYS.githubToken, token)
      set({ token, loading: true })
      try {
        const user = await fetchGitHubUser(token)
        set({ user, loading: false, initialized: true })
      } catch (err) {
        if (err instanceof GitHubAuthError) {
          signOut()
        } else {
          // Offline or GitHub unavailable: keep the token so the next start can retry.
          set({ user: null, loading: false, initialized: true })
        }
      }
    },
  }
})

/** Read an OAuth token returned in the URL hash (`#token=…&state=…`) and clear the hash. */
function consumeOAuthRedirect(): string | null {
  const hash = window.location.hash
  if (!hash.includes('token=')) return null

  const params = new URLSearchParams(hash.slice(1))
  const token = params.get('token')
  const returnedState = params.get('state')
  let savedState: string | null = null
  try {
    savedState = sessionStorage.getItem('iface_oauth_state')
    sessionStorage.removeItem('iface_oauth_state')
  } catch {}

  window.history.replaceState(null, '', window.location.pathname + window.location.search)

  if (savedState && returnedState && savedState !== returnedState) {
    console.warn('[auth] OAuth state mismatch — possible CSRF, ignoring token')
    return null
  }
  return token
}

let authInitialized = false

/** Restore the saved session or finish an OAuth redirect. Safe to call repeatedly. */
export function initAuthStore(): void {
  if (authInitialized || typeof window === 'undefined') return
  authInitialized = true

  const token = consumeOAuthRedirect() ?? readString(STORAGE_KEYS.githubToken)
  if (token) {
    void useAuthState.getState().setToken(token)
  } else {
    useAuthState.setState({ initialized: true })
  }
}

/** Pre-v1.5 API. Prefer `useAuthState(selector)` in new code. */
export function useAuthStore() {
  const state = useAuthState(useShallow((s) => s))
  return { ...state, isLoggedIn: !!state.token && !!state.user }
}
