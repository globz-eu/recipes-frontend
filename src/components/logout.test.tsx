import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '../test/render'
import { HomeContent } from './HomeContent'
import { NoAccessPrompt } from './NoAccessPrompt'

vi.mock('../config', () => ({ getConfig: () => ({ apiBaseUrl: 'https://cms.example' }) }))
vi.mock('./RecipeList', () => ({ RecipeList: () => null }))

const expectedNext = () =>
  encodeURIComponent(`${window.location.origin}/frontend/`)

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/frontend/')
  window.history.pushState(null, '', '/frontend/deep/page?x=1#recipe-en-foo')
})

afterEach(() => vi.unstubAllEnvs())

describe('logout links', () => {
  it('HomeContent logs out to the fixed frontend root, not the current URL', () => {
    renderWithQuery(<HomeContent pages={[]} locale="en" onLocaleChange={() => {}} />)
    expect(screen.getByRole('link', { name: 'Log out' })).toHaveAttribute(
      'href',
      `https://cms.example/admin/logout/?next=${expectedNext()}`,
    )
  })

  it('NoAccessPrompt logs out to the fixed frontend root, not the current URL', () => {
    renderWithQuery(<NoAccessPrompt />)
    expect(screen.getByRole('link', { name: 'Log out' })).toHaveAttribute(
      'href',
      `https://cms.example/admin/logout/?next=${expectedNext()}`,
    )
  })
})
