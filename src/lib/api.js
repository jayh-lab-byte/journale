const KEY = 'journey_owner_key'

export function getOwnerKey() {
  let key = localStorage.getItem(KEY)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(KEY, key)
  }
  return key
}

export async function api(path, { method = 'GET', json: body, form } = {}) {
  const headers = { 'x-owner-key': getOwnerKey() }
  const options = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  if (form) options.body = form
  const response = await fetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Something went wrong.')
    error.code = data.error?.code || 'REQUEST_ERROR'
    error.status = response.status
    throw error
  }
  return data
}
