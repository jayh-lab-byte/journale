import { handle } from './handle.js'

export async function nodeBridge(req, res) {
  const host = req.headers.host || 'localhost'
  const url = `http://${host}${req.url}`
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    headers.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  headers.delete('host')
  headers.delete('content-length')
  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    duplex: 'half',
  })
  const response = await handle(request)
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    if (key === 'transfer-encoding') return
    res.setHeader(key, value)
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}
