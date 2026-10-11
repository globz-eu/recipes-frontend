import { apiUrl } from '../api/client'

export function NoAccessPrompt() {
  const next = encodeURIComponent(window.location.href)
  return (
    <div className="auth-prompt">
      <p>Your account has no access to this content. Ask an administrator to assign you a role, then log in again.</p>
      <a href={apiUrl(`/admin/logout/?next=${next}`)}>Log out</a>
    </div>
  )
}
