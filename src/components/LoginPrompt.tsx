import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiUrl } from "../api/client"
import { authProvidersQueryKey, fetchAuthProviders } from "../api/auth"
import {
  AUTH_ERROR_MESSAGES,
  AUTH_ERROR_PARAM,
  authErrorFromLocation,
  loginNextUrl,
} from "../auth/urls"
import { DevLoginForm } from "./DevLoginForm"

export function LoginPrompt() {
  // Read once, then drop it from the address bar so a reload or retry starts clean.
  const [authError] = useState(authErrorFromLocation)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(AUTH_ERROR_PARAM)) return
    url.searchParams.delete(AUTH_ERROR_PARAM)
    window.history.replaceState(window.history.state, "", url.href)
  }, [])

  const providers = useQuery({
    queryKey: authProvidersQueryKey,
    queryFn: fetchAuthProviders,
    retry: false,
  })
  const next = encodeURIComponent(loginNextUrl())

  return (
    <div className="auth-prompt">
      {authError && <p role="alert">{AUTH_ERROR_MESSAGES[authError]}</p>}
      <p>You must be logged in to view this content.</p>
      {import.meta.env.DEV && <DevLoginForm />}
      {providers.isPending && <p>Loading login options...</p>}
      {providers.isError && (
        <p role="alert">Could not load the login options. Please try again later.</p>
      )}
      {providers.isSuccess && providers.data.length === 0 && <p>No login method is available.</p>}
      {providers.isSuccess && providers.data.length > 0 && (
        <ul>
          {providers.data.map((provider) => (
            <li key={provider.id}>
              <a href={apiUrl(`${provider.login_url}?next=${next}`)}>{provider.label}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
