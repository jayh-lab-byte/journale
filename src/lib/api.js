import { resizeForDisplay } from './resize.js'

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

const PHOTO_LIMIT = 20 * 1024 * 1024
const CHUNK_SIZE = 3 * 1024 * 1024

async function sendPhoto(journeyId, file, meta) {
  if (file.size <= CHUNK_SIZE) {
    const form = new FormData()
    form.append('file', file)
    form.append('meta', meta)
    return api(`/api/journeys/${journeyId}/photos`, { method: 'POST', form })
  }
  const uploadId = crypto.randomUUID()
  const total = Math.ceil(file.size / CHUNK_SIZE)
  let saved = null
  for (let index = 0; index < total; index += 1) {
    const chunk = file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
    const form = new FormData()
    form.append('chunk', chunk, file.name || 'photo.jpg')
    form.append('uploadId', uploadId)
    form.append('index', String(index))
    form.append('total', String(total))
    form.append('meta', meta)
    saved = await api(`/api/journeys/${journeyId}/photos/chunks`, { method: 'POST', form })
  }
  if (!saved?.photo?.id) throw new Error('The photo did not finish uploading.')
  return saved
}

export async function uploadPhoto(journeyId, item) {
  const display = await resizeForDisplay(item.file)
  const file = display.file
  if (file.size > PHOTO_LIMIT) {
    throw new Error('Each photo needs to be under 20 MB.')
  }
  const meta = JSON.stringify({
    ...item.meta,
    filename: file.name || item.name,
    width: display.width || item.meta?.width || null,
    height: display.height || item.meta?.height || null,
  })
  try {
    return await sendPhoto(journeyId, file, meta)
  } catch (err) {
    if (err.status) throw err
    return sendPhoto(journeyId, file, meta)
  }
}
