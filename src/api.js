export async function api(path, { method = 'GET', body } = {}) {
  const upload = body instanceof FormData
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body && !upload ? { 'Content-Type': 'application/json' } : undefined,
    body: body && !upload ? JSON.stringify(body) : body,
  })
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('账号服务暂不可用')
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || '操作失败')
  return result
}
