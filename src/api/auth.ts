import { apiFetch } from './client'

export interface AuthProvider {
  id: string
  label: string
  login_url: string
}

export const authProvidersQueryKey = ['auth', 'providers'] as const

export async function fetchAuthProviders(): Promise<AuthProvider[]> {
  const data = await apiFetch<{ providers: AuthProvider[] }>('/api/auth/providers/')
  return data.providers
}
