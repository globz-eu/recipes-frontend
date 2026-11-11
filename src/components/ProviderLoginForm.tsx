import { useEffect, useRef, useState, type FormEvent } from "react"
import { fetchFreshCsrfToken, type AuthProvider } from "../api/auth"
import { AUTH_ERROR_MESSAGES, loginNextUrl, providerLoginAction } from "../auth/urls"
import type { EnumValue } from "../enum"

const SubmitState = {
  Idle: "idle",
  FetchingToken: "fetching-token",
  Failed: "failed",
} as const
type SubmitState = EnumValue<typeof SubmitState>

// social-auth only starts a login on POST, so this is a real form submission (top-level
// navigation to the provider), with a token fetched per click because it rotates on login.
export function ProviderLoginForm({ provider }: { provider: AuthProvider }) {
  const tokenInputRef = useRef<HTMLInputElement>(null)
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.Idle)

  // Stays disabled while the navigation is pending; only a page restored from the
  // back-forward cache keeps its state and needs the button back.
  useEffect(() => {
    function enableForRestoredPage(event: PageTransitionEvent) {
      if (event.persisted) setSubmitState(SubmitState.Idle)
    }
    window.addEventListener("pageshow", enableForRestoredPage)
    return () => window.removeEventListener("pageshow", enableForRestoredPage)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitState === SubmitState.FetchingToken) return
    const form = event.currentTarget
    setSubmitState(SubmitState.FetchingToken)
    try {
      const token = await fetchFreshCsrfToken()
      if (tokenInputRef.current) tokenInputRef.current.value = token
      form.submit()
    } catch {
      setSubmitState(SubmitState.Failed)
    }
  }

  return (
    <form
      className="provider-login-form"
      method="post"
      action={providerLoginAction(provider.login_url)}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <input ref={tokenInputRef} type="hidden" name="csrfmiddlewaretoken" />
      <input type="hidden" name="next" value={loginNextUrl()} />
      <button type="submit" disabled={submitState === SubmitState.FetchingToken}>
        {provider.label}
      </button>
      {submitState === SubmitState.Failed && <p role="alert">{AUTH_ERROR_MESSAGES.login_failed}</p>}
    </form>
  )
}
