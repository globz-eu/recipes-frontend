import { test as base, expect, type Page, type Route } from "@playwright/test"
import { homePages, providers, recipesByLocale } from "./fixtures"

export const CmsSession = {
  Anonymous: "anonymous",
  Editor: "editor",
  NoAccess: "no_access",
} as const
type CmsSession = (typeof CmsSession)[keyof typeof CmsSession]

interface MockCmsOptions {
  session: CmsSession
  // The CMS answers anonymous requests with 403 (DRF session auth); 401 must work too.
  anonymousStatus: 401 | 403
  // Origin the app reaches the CMS on; the app's own origin unless config.json says otherwise.
  apiOrigin?: string
}

interface MockCms {
  session: CmsSession
  // Requests that left the app without a mock; any of them fails the test.
  readonly unmockedRequests: string[]
  // Form bodies of the POSTs that started a social login.
  readonly loginPosts: URLSearchParams[]
}

interface MockContext {
  cms: MockCms
  options: MockCmsOptions
  appOrigin: string
}

function corsHeaders(appOrigin: string) {
  return { "Access-Control-Allow-Origin": appOrigin, "Access-Control-Allow-Credentials": "true" }
}

// Answers like the CMS's session gate: the payload for editors, 401/403 otherwise.
function fulfillGated(route: Route, context: MockContext, payload: unknown) {
  const headers = corsHeaders(context.appOrigin)
  if (context.cms.session === CmsSession.NoAccess) {
    const json = { detail: "Your account has no access to this content.", code: "no_access" }
    return route.fulfill({ status: 403, headers, json })
  }
  if (context.cms.session === CmsSession.Anonymous) {
    const json = { detail: "Authentication credentials were not provided." }
    return route.fulfill({ status: context.options.anonymousStatus, headers, json })
  }
  return route.fulfill({ headers, json: payload })
}

// Local login and logout redirect back to `next`, like the CMS after a round trip.
function redirectToNext(route: Route) {
  const next = new URL(route.request().url()).searchParams.get("next") ?? "/"
  return route.fulfill({ status: 302, headers: { Location: next } })
}

const CSRF_TOKEN = "test-csrf-token"

// Local login is a GET link; social-auth only starts a login on a POST with a valid token.
function loginRoute(cms: MockCms) {
  return (route: Route) => {
    const request = route.request()
    const isSocial = new URL(request.url()).pathname !== "/admin/login/"
    if (!isSocial) {
      cms.session = CmsSession.Editor
      return redirectToNext(route)
    }
    const form = new URLSearchParams(request.postData() ?? "")
    if (request.method() !== "POST") return route.fulfill({ status: 405 })
    if (form.get("csrfmiddlewaretoken") !== CSRF_TOKEN) return route.fulfill({ status: 403 })
    cms.loginPosts.push(form)
    cms.session = CmsSession.Editor
    return route.fulfill({ status: 302, headers: { Location: form.get("next") ?? "/" } })
  }
}

function isLoginPath(pathname: string) {
  return pathname === "/admin/login/" || /^\/login\/[^/]+\/$/.test(pathname)
}

async function routeCmsPaths(page: Page, context: MockContext, apiOrigin: string) {
  const { cms } = context
  const onCms = (pathname: string) => (url: URL) =>
    url.origin === apiOrigin && url.pathname === pathname
  await page.route(onCms("/api/auth/providers/"), (route) =>
    route.fulfill({ headers: corsHeaders(context.appOrigin), json: { providers } }),
  )
  await page.route(onCms("/api/csrf/"), (route) =>
    route.fulfill({ headers: corsHeaders(context.appOrigin), json: { csrfToken: CSRF_TOKEN } }),
  )
  await page.route(onCms("/api/home/"), (route) => {
    const locale = new URL(route.request().url()).searchParams.get("locale")
    const homePage = homePages[locale as keyof typeof homePages]
    return fulfillGated(route, context, homePage ? [homePage] : [])
  })
  await page.route(onCms("/api/recipes/"), (route) => fulfillGated(route, context, recipesByLocale))
  await page.route((url) => url.origin === apiOrigin && isLoginPath(url.pathname), loginRoute(cms))
  await page.route(onCms("/admin/logout/"), (route) => {
    cms.session = CmsSession.Anonymous
    return redirectToNext(route)
  })
}

// Mocks the CMS with page.route on a mutable session. Anything outside the app's
// /frontend/ files and the mocked CMS paths is answered with 501 and recorded.
async function mockCms(page: Page, appUrl: string, options: MockCmsOptions) {
  const appOrigin = new URL(appUrl).origin
  const cms: MockCms = { session: options.session, unmockedRequests: [], loginPosts: [] }
  // Registered first, so every later route takes precedence over it.
  await page.route("**/*", (route) => {
    const url = route.request().url()
    if (url.startsWith(appUrl)) return route.continue()
    cms.unmockedRequests.push(url)
    return route.fulfill({ status: 501, body: `No mock for ${url}` })
  })
  await routeCmsPaths(page, { cms, options, appOrigin }, options.apiOrigin ?? appOrigin)
  return cms
}

export const test = base.extend<{ cmsOptions: MockCmsOptions; cms: MockCms }>({
  cmsOptions: [{ session: CmsSession.Editor, anonymousStatus: 403 }, { option: true }],
  cms: [
    async ({ page, baseURL, cmsOptions }, use) => {
      if (!baseURL) throw new Error("mockCms needs the baseURL from playwright.config.ts")
      const cms = await mockCms(page, baseURL, cmsOptions)
      await use(cms)
      expect(cms.unmockedRequests, "requests without a mock").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
