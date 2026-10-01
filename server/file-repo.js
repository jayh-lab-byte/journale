import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createId } from './http.js'

const root = path.resolve('data')
const storePath = path.join(root, 'store.json')
const blobDir = path.join(root, 'blobs')
const chunkRoot = path.join(root, 'chunks')

const empty = () => ({
  journeys: [],
  days: [],
  moments: [],
  photos: [],
  places: [],
  memories: [],
  shares: [],
})

let queue = Promise.resolve()

function withLock(fn) {
  const run = queue.then(fn, fn)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function readStore() {
  try {
    const text = await readFile(storePath, 'utf8')
    return JSON.parse(text)
  } catch {
    return empty()
  }
}

async function writeStore(store) {
  await mkdir(root, { recursive: true })
  await writeFile(storePath, JSON.stringify(store, null, 2))
}

function now() {
  return new Date().toISOString()
}

function assemble(store, journey) {
  if (!journey) return null
  const days = store.days
    .filter((day) => day.journeyId === journey.id)
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => ({
      ...day,
      moments: store.moments
        .filter((moment) => moment.dayId === day.id)
        .sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')))
        .map((moment) => ({
          ...moment,
          photos: store.photos
            .filter((photo) => photo.momentId === moment.id)
            .sort((a, b) => String(a.takenAt || '').localeCompare(String(b.takenAt || ''))),
          memories: store.memories.filter((memory) => memory.momentId === moment.id),
        })),
    }))
  const unassigned = store.photos.filter((photo) => photo.journeyId === journey.id && !photo.momentId)
  return {
    ...journey,
    days,
    unassigned,
    places: store.places.filter((place) => place.journeyId === journey.id),
    shareActive: store.shares.some((share) => share.journeyId === journey.id && share.isActive),
  }
}

export const fileRepo = {
  async listJourneys(ownerHash) {
    return withLock(async () => {
      const store = await readStore()
      return store.journeys
        .filter((journey) => journey.ownerKeyHash === ownerHash)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map((journey) => assemble(store, journey))
    })
  },

  async createJourney(ownerHash) {
    return withLock(async () => {
      const store = await readStore()
      const journey = {
        id: createId(),
        ownerKeyHash: ownerHash,
        title: '',
        startedAt: null,
        endedAt: null,
        coverPhotoId: null,
        status: 'draft',
        createdAt: now(),
        updatedAt: now(),
      }
      store.journeys.push(journey)
      await writeStore(store)
      return assemble(store, journey)
    })
  },

  async getJourney(id) {
    return withLock(async () => {
      const store = await readStore()
      return assemble(store, store.journeys.find((journey) => journey.id === id) || null)
    })
  },

  async updateJourney(id, patch) {
    return withLock(async () => {
      const store = await readStore()
      const journey = store.journeys.find((item) => item.id === id)
      if (!journey) return null
      Object.assign(journey, patch, { updatedAt: now() })
      await writeStore(store)
      return assemble(store, journey)
    })
  },

  async deleteJourney(id) {
    return withLock(async () => {
      const store = await readStore()
      const photos = store.photos.filter((photo) => photo.journeyId === id)
      const momentIds = new Set(store.moments.filter((moment) => moment.journeyId === id).map((moment) => moment.id))
      store.journeys = store.journeys.filter((journey) => journey.id !== id)
      store.days = store.days.filter((day) => day.journeyId !== id)
      store.moments = store.moments.filter((moment) => moment.journeyId !== id)
      store.photos = store.photos.filter((photo) => photo.journeyId !== id)
      store.places = store.places.filter((place) => place.journeyId !== id)
      store.memories = store.memories.filter((memory) => !momentIds.has(memory.momentId))
      store.shares = store.shares.filter((share) => share.journeyId !== id)
      await writeStore(store)
      await Promise.all(photos.map((photo) => rm(path.join(blobDir, photo.id), { force: true })))
    })
  },

  async addPhoto({ journeyId, bytes, blobUrl, filename, takenAt, latitude, longitude, width, height }) {
    return withLock(async () => {
      const store = await readStore()
      const id = createId()
      let url = blobUrl
      if (bytes) {
        await mkdir(blobDir, { recursive: true })
        await writeFile(path.join(blobDir, id), bytes)
        url = `/api/media/${id}`
      }
      const photo = {
        id,
        journeyId,
        momentId: null,
        blobUrl: url,
        filename: filename || 'photo',
        takenAt: takenAt || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        width: width ?? null,
        height: height ?? null,
        visionDescription: null,
        isRepresentative: false,
        isCover: false,
        createdAt: now(),
      }
      store.photos.push(photo)
      const journey = store.journeys.find((item) => item.id === journeyId)
      if (journey) journey.updatedAt = now()
      await writeStore(store)
      return photo
    })
  },

  async listPhotos(journeyId) {
    const journey = await this.getJourney(journeyId)
    if (!journey) return []
    const assigned = journey.days.flatMap((day) => day.moments.flatMap((moment) => moment.photos))
    return [...journey.unassigned, ...assigned]
  },

  async getPhoto(id) {
    return withLock(async () => {
      const store = await readStore()
      return store.photos.find((photo) => photo.id === id) || null
    })
  },

  async saveChunk({ journeyId, uploadId, index, total, bytes }) {
    const dir = path.join(chunkRoot, uploadId)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, `${index}.bin`), bytes)
    await writeFile(path.join(dir, 'meta.json'), JSON.stringify({ journeyId, total }))
  },

  async listChunks(journeyId, uploadId) {
    const dir = path.join(chunkRoot, uploadId)
    let meta
    try {
      meta = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8'))
    } catch {
      return []
    }
    if (meta.journeyId !== journeyId) return []
    const names = await readdir(dir)
    const chunks = []
    for (const name of names) {
      if (!name.endsWith('.bin')) continue
      chunks.push({
        index: Number(name.slice(0, -4)),
        bytes: await readFile(path.join(dir, name)),
      })
    }
    return chunks
  },

  async deleteChunks(journeyId, uploadId) {
    const dir = path.join(chunkRoot, uploadId)
    try {
      const meta = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8'))
      if (meta.journeyId !== journeyId) return
    } catch {
      return
    }
    await rm(dir, { recursive: true, force: true })
  },

  async photoByteLength(id) {
    try {
      const { stat } = await import('node:fs/promises')
      const info = await stat(path.join(blobDir, id))
      return info.size
    } catch {
      return 0
    }
  },

  async readPhotoBytes(id) {
    try {
      return await readFile(path.join(blobDir, id))
    } catch {
      return null
    }
  },

  async removePhoto(id) {
    return withLock(async () => {
      const store = await readStore()
      const photo = store.photos.find((item) => item.id === id)
      if (!photo) return null
      store.photos = store.photos.filter((item) => item.id !== id)
      const moment = store.moments.find((item) => item.id === photo.momentId)
      if (moment) {
        const remaining = store.photos.filter((item) => item.momentId === moment.id)
        if (!remaining.length) {
          store.moments = store.moments.filter((item) => item.id !== moment.id)
          store.memories = store.memories.filter((item) => item.momentId !== moment.id)
          const dayMoments = store.moments.filter((item) => item.dayId === moment.dayId)
          if (!dayMoments.length) store.days = store.days.filter((item) => item.id !== moment.dayId)
        }
      }
      const journey = store.journeys.find((item) => item.id === photo.journeyId)
      if (journey?.coverPhotoId === id) {
        const next = store.photos.find((item) => item.journeyId === photo.journeyId)
        journey.coverPhotoId = next?.id || null
      }
      await writeStore(store)
      await rm(path.join(blobDir, id), { force: true })
      return photo
    })
  },

  async saveReconstruction(journeyId, payload) {
    return withLock(async () => {
      const store = await readStore()
      const journey = store.journeys.find((item) => item.id === journeyId)
      if (!journey) return null
      const oldMomentIds = new Set(store.moments.filter((moment) => moment.journeyId === journeyId).map((moment) => moment.id))
      store.days = store.days.filter((day) => day.journeyId !== journeyId)
      store.moments = store.moments.filter((moment) => moment.journeyId !== journeyId)
      store.places = store.places.filter((place) => place.journeyId !== journeyId)
      store.memories = store.memories.filter((memory) => !oldMomentIds.has(memory.momentId))
      for (const photo of store.photos.filter((item) => item.journeyId === journeyId)) {
        photo.momentId = null
        photo.isRepresentative = false
        photo.isCover = false
        const vision = payload.photoVision.find((item) => item.id === photo.id)
        if (vision) photo.visionDescription = vision.visionDescription
      }
      store.days.push(...payload.days)
      store.moments.push(...payload.moments)
      store.places.push(...payload.places)
      store.memories.push(...payload.memories)
      for (const update of payload.photoLinks) {
        const photo = store.photos.find((item) => item.id === update.id)
        if (!photo) continue
        photo.momentId = update.momentId
        photo.isRepresentative = update.isRepresentative
        photo.isCover = update.isCover
      }
      Object.assign(journey, {
        title: payload.title,
        startedAt: payload.startedAt,
        endedAt: payload.endedAt,
        coverPhotoId: payload.coverPhotoId,
        status: 'ready',
        updatedAt: now(),
      })
      await writeStore(store)
      return assemble(store, journey)
    })
  },

  async updateMoment(id, patch) {
    return withLock(async () => {
      const store = await readStore()
      const moment = store.moments.find((item) => item.id === id)
      if (!moment) return null
      Object.assign(moment, patch, { updatedAt: now() })
      if (patch.title) {
        const place = store.places.find(
          (item) => item.journeyId === moment.journeyId && item.latitude === moment.latitude && item.longitude === moment.longitude,
        )
        if (place) {
          place.name = patch.title
          place.confidence = patch.locationConfidence || place.confidence
          place.updatedAt = now()
        }
      }
      await writeStore(store)
      return moment
    })
  },

  async getMoment(id) {
    return withLock(async () => {
      const store = await readStore()
      const moment = store.moments.find((item) => item.id === id)
      if (!moment) return null
      return {
        ...moment,
        photos: store.photos.filter((photo) => photo.momentId === id),
        memories: store.memories.filter((memory) => memory.momentId === id),
      }
    })
  },

  async saveMemory(momentId, { question, answer }) {
    return withLock(async () => {
      const store = await readStore()
      let memory = store.memories.find((item) => item.momentId === momentId && item.question === question)
      if (!memory) {
        memory = store.memories.find((item) => item.momentId === momentId && item.answer == null)
      }
      if (!memory) return null
      memory.answer = answer
      memory.updatedAt = now()
      await writeStore(store)
      return memory
    })
  },

  async updateMomentStory(id, story) {
    return this.updateMoment(id, { story })
  },

  async createShare(journeyId, shareTokenHash) {
    return withLock(async () => {
      const store = await readStore()
      const timestamp = now()
      for (const share of store.shares.filter((item) => item.journeyId === journeyId && item.isActive)) {
        share.isActive = false
        share.updatedAt = timestamp
      }
      const share = {
        id: createId(),
        journeyId,
        shareTokenHash,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      store.shares.push(share)
      await writeStore(store)
      return share
    })
  },

  async revokeShare(journeyId) {
    return withLock(async () => {
      const store = await readStore()
      const timestamp = now()
      let changed = false
      for (const share of store.shares.filter((item) => item.journeyId === journeyId && item.isActive)) {
        share.isActive = false
        share.updatedAt = timestamp
        changed = true
      }
      await writeStore(store)
      return changed
    })
  },

  async findActiveShare(shareTokenHash) {
    return withLock(async () => {
      const store = await readStore()
      return store.shares.find((share) => share.shareTokenHash === shareTokenHash && share.isActive) || null
    })
  },
}
