/** Resolve the DashScope credentials once, keeping request modules consistent. */
export function getApiKey() {
  const raw = String(import.meta.env.VITE_APP_API_KEY ?? '').trim()
  if (raw.startsWith('ws-')) {
    throw new Error('VITE_APP_API_KEY 当前填写的是业务空间 ID（ws-...），请改为百炼 API Key（通常以 sk- 开头）')
  }
  return raw
}

export function getApiBaseUrl() {
  return String(import.meta.env.VITE_APP_BASE_API ?? '/api').replace(/\/$/, '')
}
