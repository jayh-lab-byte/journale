import { handle } from '../server/handle.js'

export const config = {
  maxDuration: 60,
}

export default function handler(request) {
  return handle(request)
}
