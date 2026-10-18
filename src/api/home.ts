import { apiFetch } from './client'

export interface HomePage {
  title: string
  description: string | null
}

// Prefix shared by all locales, for invalidating every home query at once.
export const homeQueryKeyPrefix = ['home'] as const
export const homeQueryKey = (locale: string) => [...homeQueryKeyPrefix, locale] as const

export function fetchHome(locale: string): Promise<HomePage[]> {
  return apiFetch<HomePage[]>(`/api/home/?locale=${encodeURIComponent(locale)}`)
}
