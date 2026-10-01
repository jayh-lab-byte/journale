import { createHash, randomBytes, randomUUID } from 'node:crypto'

export function hashSecret(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

export function createId() {
  return randomUUID()
}

export function createToken() {
  return randomBytes(24).toString('base64url')
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export function error(code, message, status = 400, fields = undefined) {
  return json({ error: { code, message, fields } }, status)
}

export function ownerHashFrom(request) {
  const key = request.headers.get('x-owner-key')
  if (!key || key.length < 8 || key.length > 200) return null
  return hashSecret(key)
}

export function cleanText(value, max) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}
