
export function useReadStream() {
  /** 解析 SSE：网络分片可能切断任意字符，未完成的行必须保留到下一次读取。 */
  async function handleStreamResponse(response: Response, onMessage: (jsonData: unknown) => void) {
    if (!response.ok || !response.body) throw new Error(`流式请求失败: ${response.status}`)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false
    while (!finished) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const payload = line.replace(/^\s*data:\s?/, '').trim()
        if (!payload) continue
        if (payload === '[DONE]') { finished = true; break }
        try { onMessage(JSON.parse(payload)) } catch (error) {
          console.warn('忽略无法解析的 SSE 数据:', payload, error)
        }
      }
      if (done) break
    }
  }
  return { handleStreamResponse }
}
