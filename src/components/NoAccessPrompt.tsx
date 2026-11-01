import { logoutUrl } from '../auth/urls'

export function NoAccessPrompt() {
  return (
    <div className="auth-prompt">
      <p>Your account has no access to this content. Ask an administrator to assign you a role, then log in again.</p>
      <a href={logoutUrl()}>Log out</a>
    </div>
  )
}
