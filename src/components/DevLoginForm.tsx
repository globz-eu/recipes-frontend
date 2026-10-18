import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiPost, resetCsrfToken } from '../api/client'
import { homeQueryKeyPrefix } from '../api/home'

// Dev-only: signs in a local user created by recipes-cms `ensure_users`. It is
// rendered only when `import.meta.env.DEV` is true, so production builds drop it.
export function DevLoginForm() {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await apiPost('/api/dev-login/', { username, password })
      // The session (and with it the CSRF token) changed on login.
      resetCsrfToken()
      await queryClient.invalidateQueries({ queryKey: homeQueryKeyPrefix })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? 'Invalid username or password.' : 'Login failed.')
    }
  }

  return (
    <form
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}
      onSubmit={(event) => void handleSubmit(event)}>
      <p>Dev login</p>
      <input
        aria-label="Username"
        autoComplete="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <input
        aria-label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit">Log in</button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
