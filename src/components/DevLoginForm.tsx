import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiPost, resetCsrfToken } from '../api/client'
import { homeQueryKeyPrefix } from '../api/home'

function loginErrorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 400) return 'Invalid username or password.'
    if (err.status === 404) return 'Dev login is disabled on this backend.'
  }
  return 'Login failed.'
}

// Dev-only: signs in a local user created by recipes-cms `ensure_users`. It is
// rendered only when `import.meta.env.DEV` is true, so production builds drop it.
export function DevLoginForm() {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await apiPost('/api/dev-login/', { username, password })
      // The session (and with it the CSRF token) changed on login.
      resetCsrfToken()
      await queryClient.invalidateQueries({ queryKey: homeQueryKeyPrefix })
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="dev-login-form"
      onSubmit={(event) => void handleSubmit(event)}>
      <strong>Dev login</strong>
      <input
        aria-label="Username"
        autoComplete="username"
        required
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <input
        aria-label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" disabled={submitting}>Log in</button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
