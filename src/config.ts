// Environment-specific settings, read at startup from config.json next to
// index.html so the same build can be deployed anywhere. The file in public/
// holds the defaults for the same-origin setup (local compose, vite dev);
// deployments overwrite it.
export interface AppConfig {
  // Base URL of the Django backend, without trailing slash. Empty when the
  // frontend is served from the same origin as the backend.
  apiBaseUrl: string
}

let config: AppConfig | null = null

export async function loadConfig(): Promise<AppConfig> {
  const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Could not load config.json: HTTP ${response.status}`)
  }
  const data = (await response.json()) as Partial<AppConfig>
  config = {
    apiBaseUrl: (data.apiBaseUrl ?? '').replace(/\/$/, ''),
  }
  return config
}

export function getConfig(): AppConfig {
  if (!config) {
    throw new Error('getConfig() called before loadConfig()')
  }
  return config
}
