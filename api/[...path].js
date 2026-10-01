import { handle } from '../server/handle.js'
import { nodeBridge } from '../server/node-bridge.js'

export const config = {
  maxDuration: 60,
}

function expandNestedPath(request) {
  const raw = request.url || ''
  const qIndex = raw.indexOf('?')
  if (qIndex === -1) return
  const params = new URLSearchParams(raw.slice(qIndex + 1))
  const parts = params.getAll('rest')
  if (!parts.length) return
  params.delete('rest')
  const extra = params.toString()
  request.url = `${raw.slice(0, qIndex)}/${parts.join('/')}${extra ? `?${extra}` : ''}`
}

export default function handler(request, response) {
  if (typeof request?.url === 'string') expandNestedPath(request)
  if (typeof request?.headers?.get === 'function') return handle(request)
  return nodeBridge(request, response)
}
