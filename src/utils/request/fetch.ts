import { getApiBaseUrl, getApiKey } from './config'

export default function fetchRequest(url: string, options: RequestInit = {}) {
  const baseURL = getApiBaseUrl()
  const apiKey = getApiKey()
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('未配置 VITE_APP_API_KEY，请检查 .env 并重启开发服务器')
  }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  }

  return fetch(baseURL + url, requestOptions).then(async (response) => {
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`AI 请求失败 (${response.status}): ${detail}`)
    }
    return response
  })
}
