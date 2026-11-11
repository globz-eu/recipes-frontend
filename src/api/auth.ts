import { apiFetch, apiPost, getCsrfToken, resetCsrfToken } from "./client"

export interface AuthProvider {
  id: string
  label: string
  login_url: string
}

export const authProvidersQueryKey = ["auth", "providers"] as const

export async function fetchAuthProviders(): Promise<AuthProvider[]> {
  const data = await apiFetch<{ providers: AuthProvider[] }>("/api/auth/providers/")
  return data.providers
}

export async function devLogin(credentials: { username: string; password: string }): Promise<void> {
  await apiPost("/api/dev-login/", credentials)
  // The session (and with it the CSRF token) changed on login.
  resetCsrfToken()
}

// Drops the cached CSRF token; the session changes on logout.
export function forgetSession(): void {
  resetCsrfToken()
}

// The token rotates on login, so a cached one may be stale by the time a login form posts.
export function fetchFreshCsrfToken(): Promise<string> {
  resetCsrfToken()
  return getCsrfToken()
}
