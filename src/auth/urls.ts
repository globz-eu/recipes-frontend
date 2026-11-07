import { apiUrl } from "../api/client"

export const AUTH_ERROR_PARAM = "auth_error"

export const AUTH_ERROR_MESSAGES = {
  email_missing: "Your account provider did not share an email address.",
  email_unverified: "Please verify your email address with your provider, then try again.",
  email_in_use:
    "This email address is already used with a different login method. Use that method to sign in.",
  already_signed_in:
    "You are already signed in with another account or this identity belongs to another user.",
  login_failed: "Sign-in failed. Please try again.",
} as const

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES

// The frontend root (e.g. https://host/frontend/). Identity providers only accept exactly
// registered post-logout URIs, so logout must not return to the current page.
export function frontendRootUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

export function logoutUrl(): string {
  return apiUrl(`/admin/logout/?next=${encodeURIComponent(frontendRootUrl())}`)
}

// The current page URL without `auth_error`, so a retry does not accumulate errors.
export function loginNextUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.delete(AUTH_ERROR_PARAM)
  return url.href
}

// The error code from `?auth_error=`; unknown codes count as `login_failed`.
export function authErrorFromLocation(): AuthErrorCode | null {
  const code = new URLSearchParams(window.location.search).get(AUTH_ERROR_PARAM)
  if (code === null) return null
  return Object.hasOwn(AUTH_ERROR_MESSAGES, code) ? (code as AuthErrorCode) : "login_failed"
}
