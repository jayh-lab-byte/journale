import { handle } from '../server/handle.js'
import { nodeBridge } from '../server/node-bridge.js'

export const config = {
  maxDuration: 60,
}

export default function handler(request, response) {
  if (typeof request?.headers?.get === 'function') return handle(request)
  return nodeBridge(request, response)
}
