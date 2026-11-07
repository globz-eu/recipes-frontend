import { describe, expect, it } from "vitest"
import { ApiError, isLoginRequiredError, isNoAccessError } from "../../../src/api/errors"

describe("isLoginRequiredError", () => {
  it.each([401, 403])("is true for an ApiError with status %i", (status) => {
    expect(isLoginRequiredError(new ApiError(status, "denied"))).toBe(true)
  })

  it.each([400, 404, 500])("is false for an ApiError with status %i", (status) => {
    expect(isLoginRequiredError(new ApiError(status, "failed"))).toBe(false)
  })

  it("is false for errors that are not an ApiError", () => {
    expect(isLoginRequiredError(new Error("HTTP 401"))).toBe(false)
    expect(isLoginRequiredError({ status: 401 })).toBe(false)
    expect(isLoginRequiredError(null)).toBe(false)
  })
})

describe("isNoAccessError", () => {
  it("is true for a 403 with code no_access", () => {
    expect(isNoAccessError(new ApiError(403, "denied", { code: "no_access" }))).toBe(true)
  })

  it("is false for other 403 bodies, other statuses and non-ApiErrors", () => {
    expect(isNoAccessError(new ApiError(403, "denied", { code: "other" }))).toBe(false)
    expect(isNoAccessError(new ApiError(403, "denied"))).toBe(false)
    expect(isNoAccessError(new ApiError(401, "denied", { code: "no_access" }))).toBe(false)
    expect(isNoAccessError(new Error("x"))).toBe(false)
  })
})
