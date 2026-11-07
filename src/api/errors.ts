export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

// The CMS answers authenticated users without a role with 403 and code "no_access".
export function isNoAccessError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) return false
  const body = error.body
  return (
    typeof body === "object" && body !== null && (body as { code?: unknown }).code === "no_access"
  )
}

// 401/403 mean "not logged in", not a failure worth retrying.
export function isLoginRequiredError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}
