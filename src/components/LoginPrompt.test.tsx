import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_ERROR_MESSAGES } from '../auth/urls'
import { renderWithQuery } from '../test/render'
import { LoginPrompt } from './LoginPrompt'

vi.mock('../config', () => ({ getConfig: () => ({ apiBaseUrl: 'https://cms.example' }) }))
vi.mock('./DevLoginForm', () => ({ DevLoginForm: () => <div>dev login</div> }))

const providers = [
  { id: 'zitadel', label: 'Zitadel', login_url: '/login/zitadel/' },
  { id: 'auth0', label: 'Auth0', login_url: '/login/auth0_openidconnect/' },
  { id: 'local', label: 'Username and password', login_url: '/admin/login/' },
]

function stubFetch(ok: boolean, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: ok ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/frontend/')
  window.history.pushState(null, '', '/frontend/?x=1#recipe-en-foo')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('LoginPrompt', () => {
  it('renders one link per provider in response order with the encoded next', async () => {
    stubFetch(true, { providers })
    renderWithQuery(<LoginPrompt />)
    const next = encodeURIComponent(`${window.location.origin}/frontend/?x=1#recipe-en-foo`)
    const links = await screen.findAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual([
      'Zitadel',
      'Auth0',
      'Username and password',
    ])
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      `https://cms.example/login/zitadel/?next=${next}`,
      `https://cms.example/login/auth0_openidconnect/?next=${next}`,
      `https://cms.example/admin/login/?next=${next}`,
    ])
  })

  it('shows a loading state first', () => {
    stubFetch(true, { providers })
    renderWithQuery(<LoginPrompt />)
    expect(screen.getByText('Loading login options...')).toBeInTheDocument()
  })

  it('shows an error without any fallback link when the request fails', async () => {
    stubFetch(false, { detail: 'boom' })
    renderWithQuery(<LoginPrompt />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the login options')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows a message when no provider is enabled', async () => {
    stubFetch(true, { providers: [] })
    renderWithQuery(<LoginPrompt />)
    expect(await screen.findByText('No login method is available.')).toBeInTheDocument()
  })

  it.each(Object.entries(AUTH_ERROR_MESSAGES))('shows the message for %s', async (code, message) => {
    stubFetch(true, { providers })
    window.history.pushState(null, '', `/frontend/?auth_error=${code}`)
    renderWithQuery(<LoginPrompt />)
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    await screen.findAllByRole('link')
  })

  it('treats an unknown code as login_failed', async () => {
    stubFetch(true, { providers })
    window.history.pushState(null, '', '/frontend/?auth_error=nope')
    renderWithQuery(<LoginPrompt />)
    expect(screen.getByRole('alert')).toHaveTextContent(AUTH_ERROR_MESSAGES.login_failed)
    await screen.findAllByRole('link')
  })

  it('removes auth_error from the URL but keeps other params and the hash', async () => {
    stubFetch(true, { providers })
    window.history.pushState(null, '', '/frontend/?auth_error=email_in_use&x=1#h')
    renderWithQuery(<LoginPrompt />)
    await waitFor(() => expect(window.location.search).toBe('?x=1'))
    expect(window.location.hash).toBe('#h')
    expect(screen.getByRole('alert')).toHaveTextContent(AUTH_ERROR_MESSAGES.email_in_use)
    await screen.findAllByRole('link')
  })

  it('shows the dev login form only in dev mode', async () => {
    stubFetch(true, { providers })
    vi.stubEnv('DEV', false)
    renderWithQuery(<LoginPrompt />)
    await screen.findAllByRole('link')
    expect(screen.queryByText('dev login')).not.toBeInTheDocument()
  })

  it('shows the dev login form in dev mode', async () => {
    stubFetch(true, { providers })
    vi.stubEnv('DEV', true)
    renderWithQuery(<LoginPrompt />)
    expect(screen.getByText('dev login')).toBeInTheDocument()
    await screen.findAllByRole('link')
  })

  it('does not accumulate auth_error in the login next URL', async () => {
    stubFetch(true, { providers })
    window.history.pushState(null, '', '/frontend/?auth_error=email_in_use&x=1#h')
    renderWithQuery(<LoginPrompt />)
    const links = await screen.findAllByRole('link')
    const next = encodeURIComponent(`${window.location.origin}/frontend/?x=1#h`)
    expect(links[0]).toHaveAttribute('href', `https://cms.example/login/zitadel/?next=${next}`)
    expect(links[0].getAttribute('href')).not.toContain('auth_error')
  })

  it('shows no error message and leaves the URL alone without auth_error', async () => {
    stubFetch(true, { providers })
    const replace = vi.spyOn(window.history, 'replaceState')
    renderWithQuery(<LoginPrompt />)
    await screen.findAllByRole('link')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })
})
