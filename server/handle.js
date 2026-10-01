import { loadEnvFile } from './env.js'
import { cleanText, createToken, error, hashSecret, json, ownerHashFrom } from './http.js'
import { getRepo } from './repo.js'
import { reconstructJourney, regenerateMomentStory } from './reconstruct.js'

loadEnvFile()

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg'])

function presentPhoto(photo) {
  return {
    id: photo.id,
    url: photo.blobUrl,
    filename: photo.filename,
    takenAt: photo.takenAt,
    latitude: photo.latitude,
    longitude: photo.longitude,
    width: photo.width,
    height: photo.height,
    visionDescription: photo.visionDescription || '',
    isRepresentative: Boolean(photo.isRepresentative),
    isCover: Boolean(photo.isCover),
  }
}

export function presentJourney(journey, { readOnly = false } = {}) {
  const photos = [
    ...journey.unassigned,
    ...journey.days.flatMap((day) => day.moments.flatMap((moment) => moment.photos)),
  ]
  const cover = photos.find((photo) => photo.id === journey.coverPhotoId) || photos[0]
  return {
    id: journey.id,
    title: journey.title || 'Untitled journey',
    status: journey.status,
    startedAt: journey.startedAt,
    endedAt: journey.endedAt,
    coverUrl: cover?.blobUrl || '',
    shareActive: Boolean(journey.shareActive),
    readOnly,
    counts: {
      photos: photos.length,
      days: journey.days.length,
      moments: journey.days.reduce((sum, day) => sum + day.moments.length, 0),
      locations: journey.days.reduce(
        (sum, day) => sum + day.moments.filter((moment) => moment.locationConfidence !== 'unknown').length,
        0,
      ),
    },
    days: journey.days.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title || '',
      moments: day.moments.map((moment) => ({
        id: moment.id,
        title: moment.title || '',
        startedAt: moment.startedAt,
        endedAt: moment.endedAt,
        latitude: moment.latitude,
        longitude: moment.longitude,
        locationConfidence: moment.locationConfidence || 'unknown',
        story: moment.story || '',
        photos: moment.photos.map(presentPhoto),
        memories: moment.memories.map((memory) => ({
          id: memory.id,
          question: memory.question,
          answer: memory.answer,
        })),
      })),
    })),
  }
}

function summary(journey) {
  const full = presentJourney(journey)
  return {
    id: full.id,
    title: full.title,
    status: full.status,
    startedAt: full.startedAt,
    endedAt: full.endedAt,
    coverUrl: full.coverUrl,
    shareActive: full.shareActive,
    counts: full.counts,
  }
}

function repoOrError() {
  const repo = getRepo()
  if (!repo) return { error: error('CONFIG_ERROR', 'DATABASE_URL is not configured.', 503) }
  return { repo }
}

async function ownedJourney(request, id) {
  const owner = ownerHashFrom(request)
  if (!owner) return { response: error('UNAUTHORIZED', 'Missing owner key.', 401) }
  const { repo, error: configError } = repoOrError()
  if (configError) return { response: configError }
  const journey = await repo.getJourney(id)
  if (!journey || journey.ownerKeyHash !== owner) {
    return { response: error('NOT_FOUND', 'Journey not found.', 404) }
  }
  return { repo, journey, owner }
}

function numberOrNull(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function readPhotoMeta(request) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await request.json()
    return {
      blobUrl: typeof body.blobUrl === 'string' ? body.blobUrl : '',
      filename: cleanText(body.filename || 'photo', 180),
      takenAt: typeof body.takenAt === 'string' ? body.takenAt : null,
      latitude: numberOrNull(body.latitude),
      longitude: numberOrNull(body.longitude),
      width: numberOrNull(body.width),
      height: numberOrNull(body.height),
    }
  }
  const form = await request.formData()
  const file = form.get('file')
  const meta = JSON.parse(typeof form.get('meta') === 'string' ? form.get('meta') : '{}')
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { invalid: 'Choose a photo to upload.' }
  }
  if (file.type && !IMAGE_TYPES.has(file.type)) {
    return { invalid: 'Use a JPG or PNG photo. HEIC is attempted when the browser can read it.' }
  }
  if (file.size > 15 * 1024 * 1024) return { invalid: 'Each photo needs to be under 15 MB.' }
  const bytes = Buffer.from(await file.arrayBuffer())
  return {
    bytes,
    filename: cleanText(file.name || meta.filename || 'photo', 180),
    takenAt: typeof meta.takenAt === 'string' ? meta.takenAt : null,
    latitude: numberOrNull(meta.latitude),
    longitude: numberOrNull(meta.longitude),
    width: numberOrNull(meta.width),
    height: numberOrNull(meta.height),
  }
}

async function handleBlob(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return error('CONFIG_ERROR', 'Cloud photo storage is not configured.', 501)
  }
  if (!ownerHashFrom(request)) return error('UNAUTHORIZED', 'Missing owner key.', 401)
  const { handleUpload } = await import('@vercel/blob/client')
  const body = await request.json()
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
        addRandomSuffix: true,
        maximumSizeInBytes: 15 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    })
    return json(result)
  } catch {
    return error('UPLOAD_ERROR', 'The photo could not be uploaded.', 400)
  }
}

export async function handle(request) {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'api') return error('NOT_FOUND', 'Not found.', 404)
  const method = request.method

  try {
    if (method === 'GET' && parts[1] === 'health') return json({ ok: true })
    if (method === 'GET' && parts[1] === 'config') {
      return json({
        ai: Boolean(process.env.OPENAI_API_KEY),
        blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        database: process.env.DATABASE_URL ? 'neon' : 'local-file',
        mapStyle: process.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
      })
    }
    if (method === 'POST' && parts[1] === 'blob') return handleBlob(request)
    if (method === 'GET' && parts[1] === 'media' && parts[2]) return serveMedia(parts[2])

    if (parts[1] === 'shared' && parts[2] && method === 'GET') return getShared(parts[2])

    if (parts[1] === 'journeys' && parts.length === 2) {
      if (method === 'GET') return listJourneys(request)
      if (method === 'POST') return createJourney(request)
    }
    if (parts[1] === 'journeys' && parts[2] && parts.length === 3) {
      if (method === 'GET') return getJourney(request, parts[2])
      if (method === 'PATCH') return patchJourney(request, parts[2])
      if (method === 'DELETE') return removeJourney(request, parts[2])
    }
    if (parts[1] === 'journeys' && parts[3] === 'photos' && method === 'POST') {
      return addPhoto(request, parts[2])
    }
    if (parts[1] === 'journeys' && parts[3] === 'reconstruct' && method === 'POST') {
      return reconstruct(request, parts[2])
    }
    if (parts[1] === 'journeys' && parts[3] === 'share' && method === 'POST') {
      return createShare(request, parts[2])
    }
    if (parts[1] === 'journeys' && parts[3] === 'share' && method === 'DELETE') {
      return revokeShare(request, parts[2])
    }
    if (parts[1] === 'moments' && parts[2] && parts.length === 3 && method === 'PATCH') {
      return patchMoment(request, parts[2])
    }
    if (parts[1] === 'moments' && parts[3] === 'memory' && method === 'POST') {
      return saveMemory(request, parts[2])
    }
    if (parts[1] === 'moments' && parts[3] === 'story' && method === 'POST') {
      return retellMoment(request, parts[2])
    }
    if (parts[1] === 'moments' && parts[3] === 'story' && method === 'PATCH') {
      return editStory(request, parts[2])
    }
    if (parts[1] === 'photos' && parts[2] && method === 'DELETE') {
      return removePhoto(request, parts[2])
    }
    return error('NOT_FOUND', 'Not found.', 404)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Request failed')
    return error('SERVER_ERROR', 'Something went wrong.', 500)
  }
}

async function serveMedia(id) {
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const photo = await repo.getPhoto(id)
  if (!photo) return error('NOT_FOUND', 'Photo not found.', 404)
  if (typeof photo.blobUrl === 'string' && photo.blobUrl.startsWith('http')) {
    return Response.redirect(photo.blobUrl, 302)
  }
  const bytes = await repo.readPhotoBytes(id)
  if (!bytes) return error('NOT_FOUND', 'Photo not found.', 404)
  const lower = (photo.filename || '').toLowerCase()
  const type = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.heic') ? 'image/heic' : 'image/jpeg'
  return new Response(bytes, {
    headers: { 'content-type': type, 'cache-control': 'private, max-age=86400' },
  })
}

async function listJourneys(request) {
  const owner = ownerHashFrom(request)
  if (!owner) return error('UNAUTHORIZED', 'Missing owner key.', 401)
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const journeys = await repo.listJourneys(owner)
  return json({ journeys: journeys.map(summary) })
}

async function createJourney(request) {
  const owner = ownerHashFrom(request)
  if (!owner) return error('UNAUTHORIZED', 'Missing owner key.', 401)
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const journey = await repo.createJourney(owner)
  return json({ journey: presentJourney(journey) }, 201)
}

async function getJourney(request, id) {
  const result = await ownedJourney(request, id)
  if (result.response) return result.response
  return json({ journey: presentJourney(result.journey) })
}

async function patchJourney(request, id) {
  const result = await ownedJourney(request, id)
  if (result.response) return result.response
  const body = await request.json()
  const title = cleanText(body.title || '', 120)
  const journey = await result.repo.updateJourney(id, { title })
  return json({ journey: presentJourney(journey) })
}

async function removeJourney(request, id) {
  const result = await ownedJourney(request, id)
  if (result.response) return result.response
  await result.repo.deleteJourney(id)
  return json({ ok: true })
}

async function addPhoto(request, id) {
  const result = await ownedJourney(request, id)
  if (result.response) return result.response
  const meta = await readPhotoMeta(request)
  if (meta.invalid) return error('VALIDATION_ERROR', meta.invalid, 400)
  if (meta.blobUrl && !meta.blobUrl.startsWith('https://')) {
    return error('VALIDATION_ERROR', 'Photo storage URL is invalid.', 400)
  }
  if (!meta.bytes && !meta.blobUrl) return error('VALIDATION_ERROR', 'Choose a photo to upload.', 400)
  const photo = await result.repo.addPhoto({ journeyId: id, ...meta })
  return json({ photo: presentPhoto(photo) }, 201)
}

async function reconstruct(request, id) {
  const result = await ownedJourney(request, id)
  if (result.response) return result.response
  try {
    const journey = await reconstructJourney(id)
    return json({ journey: presentJourney(journey) })
  } catch (err) {
    if (err.status) return error(err.code || 'RECONSTRUCT_ERROR', err.message, err.status)
    console.error(err instanceof Error ? err.message : 'Reconstruct failed')
    return error('RECONSTRUCT_ERROR', 'Reconstruction could not finish. Your photos are still saved.', 500)
  }
}

async function createShare(request, id) {
  const result = await ownedJourney(request, id)
  if (result.response) return result.response
  const token = createToken()
  await result.repo.createShare(id, hashSecret(token))
  return json({ token, path: `/share/${token}` })
}

async function revokeShare(request, id) {
  const result = await ownedJourney(request, id)
  if (result.response) return result.response
  await result.repo.revokeShare(id)
  return json({ ok: true })
}

async function getShared(token) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return error('NOT_FOUND', 'Shared journey not found.', 404)
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const share = await repo.findActiveShare(hashSecret(token))
  if (!share) return error('NOT_FOUND', 'Shared journey not found.', 404)
  const journey = await repo.getJourney(share.journeyId)
  if (!journey) return error('NOT_FOUND', 'Shared journey not found.', 404)
  return json({ journey: presentJourney(journey, { readOnly: true }) })
}

async function patchMoment(request, id) {
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const moment = await repo.getMoment(id)
  if (!moment) return error('NOT_FOUND', 'Moment not found.', 404)
  const owned = await ownedJourney(request, moment.journeyId)
  if (owned.response) return owned.response
  const body = await request.json()
  const patch = {}
  if (typeof body.title === 'string') patch.title = cleanText(body.title, 120)
  if (body.locationConfidence === 'confirmed' || body.locationConfidence === 'estimated' || body.locationConfidence === 'unknown') {
    patch.locationConfidence = body.locationConfidence
  }
  await repo.updateMoment(id, patch)
  const journey = await repo.getJourney(moment.journeyId)
  return json({ journey: presentJourney(journey) })
}

async function saveMemory(request, id) {
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const moment = await repo.getMoment(id)
  if (!moment) return error('NOT_FOUND', 'Moment not found.', 404)
  const owned = await ownedJourney(request, moment.journeyId)
  if (owned.response) return owned.response
  const body = await request.json()
  const memory = moment.memories.find((item) => item.id === body.memoryId) || moment.memories.find((item) => item.answer == null)
  if (!memory) return error('NOT_FOUND', 'Question not found.', 404)
  const answer = body.skip ? '' : cleanText(body.answer || '', 2000)
  if (!body.skip && !answer) return error('VALIDATION_ERROR', 'Write a short memory, or skip this question.', 400)
  await repo.saveMemory(id, { question: memory.question, answer: body.skip ? '' : answer })
  try {
    await regenerateMomentStory(id)
  } catch {
    return error('STORY_ERROR', 'Your memory was saved. The story could not be updated yet.', 502)
  }
  const journey = await repo.getJourney(moment.journeyId)
  return json({ journey: presentJourney(journey) })
}

async function retellMoment(request, id) {
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const moment = await repo.getMoment(id)
  if (!moment) return error('NOT_FOUND', 'Moment not found.', 404)
  const owned = await ownedJourney(request, moment.journeyId)
  if (owned.response) return owned.response
  try {
    await regenerateMomentStory(id)
  } catch {
    return error('STORY_ERROR', 'The story could not be written. Your photos and memories are unchanged.', 502)
  }
  const journey = await repo.getJourney(moment.journeyId)
  return json({ journey: presentJourney(journey) })
}

async function editStory(request, id) {
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const moment = await repo.getMoment(id)
  if (!moment) return error('NOT_FOUND', 'Moment not found.', 404)
  const owned = await ownedJourney(request, moment.journeyId)
  if (owned.response) return owned.response
  const body = await request.json()
  const story = typeof body.story === 'string' ? body.story.trim().slice(0, 4000) : ''
  if (!story) return error('VALIDATION_ERROR', 'Story text cannot be empty.', 400)
  await repo.updateMomentStory(id, story)
  const journey = await repo.getJourney(moment.journeyId)
  return json({ journey: presentJourney(journey) })
}

async function removePhoto(request, id) {
  const { repo, error: configError } = repoOrError()
  if (configError) return configError
  const photo = await repo.getPhoto(id)
  if (!photo) return error('NOT_FOUND', 'Photo not found.', 404)
  const owned = await ownedJourney(request, photo.journeyId)
  if (owned.response) return owned.response
  await repo.removePhoto(id)
  const journey = await repo.getJourney(photo.journeyId)
  return json({ journey: journey ? presentJourney(journey) : null })
}
