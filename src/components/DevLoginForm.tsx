import { useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ApiError } from "../api/errors"
import { devLogin } from "../api/auth"
import { homeQueryKeyPrefix } from "../api/home"

function loginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Invalid username or password."
    if (error.status === 404) return "Dev login is disabled on this backend."
  }
  return "Login failed."
}

// Dev-only: signs in a local user created by recipes-cms `ensure_users`. It is
// rendered only when `import.meta.env.DEV` is true, so production builds drop it.
export function DevLoginForm() {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await devLogin({ username, password })
      await queryClient.invalidateQueries({ queryKey: homeQueryKeyPrefix })
    } catch (error) {
      setErrorMessage(loginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="dev-login-form" onSubmit={(event) => void handleSubmit(event)}>
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
      <button type="submit" disabled={isSubmitting}>
        Log in
      </button>
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </form>
  )
}
