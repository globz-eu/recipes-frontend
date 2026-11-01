import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_ERROR_MESSAGES,
  authErrorFromLocation,
  frontendRootUrl,
  loginNextUrl,
  logoutUrl,
} from './urls'

vi.mock('../config', () => ({ getConfig: () => ({ apiBaseUrl: 'https://cms.example' }) }))

function setLocation(path: string) {
  window.history.pushState(null, '', path)
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/frontend/')
  setLocation('/')
})

afterEach(() => vi.unstubAllEnvs())

describe('frontendRootUrl', () => {
  it('is the origin plus the base path', () => {
    setLocation('/frontend/deep/page?x=1#recipe-en-foo')
    expect(frontendRootUrl()).toBe(`${window.location.origin}/frontend/`)
  })
})

describe('logoutUrl', () => {
  it('goes to the backend logout with the frontend root as encoded next', () => {
    setLocation('/frontend/deep/page?x=1#recipe-en-foo')
    expect(logoutUrl()).toBe(
      `https://cms.example/admin/logout/?next=${encodeURIComponent(`${window.location.origin}/frontend/`)}`,
    )
  })
})

describe('loginNextUrl', () => {
  it('strips auth_error but keeps other params and the hash', () => {
    setLocation('/frontend/?a=1&auth_error=email_in_use&b=2#recipe-en-foo')
    expect(loginNextUrl()).toBe(`${window.location.origin}/frontend/?a=1&b=2#recipe-en-foo`)
  })

  it('leaves a URL without auth_error unchanged', () => {
    setLocation('/frontend/?a=1#x')
    expect(loginNextUrl()).toBe(window.location.href)
  })
})

describe('authErrorFromLocation', () => {
  it('is null without the param', () => {
    expect(authErrorFromLocation()).toBeNull()
  })

  it.each(Object.keys(AUTH_ERROR_MESSAGES))('returns the known code %s', (code) => {
    setLocation(`/frontend/?auth_error=${code}`)
    expect(authErrorFromLocation()).toBe(code)
  })

  it('maps unknown codes to login_failed', () => {
    setLocation('/frontend/?auth_error=bogus')
    expect(authErrorFromLocation()).toBe('login_failed')
    setLocation('/frontend/?auth_error=toString')
    expect(authErrorFromLocation()).toBe('login_failed')
  })
})

describe('AUTH_ERROR_MESSAGES', () => {
  it('covers the five backend codes', () => {
    expect(Object.keys(AUTH_ERROR_MESSAGES).sort()).toEqual([
      'already_signed_in',
      'email_in_use',
      'email_missing',
      'email_unverified',
      'login_failed',
    ])
  })
})
