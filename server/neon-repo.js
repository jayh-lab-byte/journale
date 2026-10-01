import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from '@neondatabase/serverless'
import { createId } from './http.js'

const PHOTO_COLUMNS = `id, journey_id, moment_id, blob_url, filename, taken_at, latitude, longitude, width, height, vision_description, is_representative, is_cover, created_at`

let pool
let schemaReady

function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return pool
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const file = fileURLToPath(new URL('../db/migrations/001_init.sql', import.meta.url))
      const sql = await readFile(file, 'utf8')
      const client = getPool()
      await client.query(sql)
      await client.query('ALTER TABLE photos ADD COLUMN IF NOT EXISTS content bytea')
      await client.query('ALTER TABLE memories ADD COLUMN IF NOT EXISTS suggestion text')
      await client.query(`CREATE TABLE IF NOT EXISTS photo_chunks (
        upload_id text NOT NULL,
        journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
        chunk_index integer NOT NULL,
        total_count integer NOT NULL,
        content bytea NOT NULL,
        PRIMARY KEY (upload_id, chunk_index)
      )`)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

async function query(text, params = []) {
  await ensureSchema()
  const result = await getPool().query(text, params)
  return result.rows
}

function mapJourney(row) {
  if (!row) return null
  return {
    id: row.id,
    ownerKeyHash: row.owner_key_hash,
    title: row.title || '',
    startedAt: row.started_at,
    endedAt: row.ended_at,
    coverPhotoId: row.cover_photo_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function calendarDate(value) {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (part) => String(part).padStart(2, '0')
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
  }
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

function isoTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  return value || null
}

function mapPhoto(row) {
  return {
    id: row.id,
    journeyId: row.journey_id,
    momentId: row.moment_id,
    blobUrl: row.blob_url,
    filename: row.filename,
    takenAt: isoTimestamp(row.taken_at),
    latitude: row.latitude,
    longitude: row.longitude,
    width: row.width,
    height: row.height,
    visionDescription: row.vision_description,
    isRepresentative: row.is_representative,
    isCover: row.is_cover,
    createdAt: row.created_at,
  }
}

async function hydrate(journey) {
  if (!journey) return null
  const [dayRows, momentRows, photoRows, placeRows, memoryRows, shareRows] = await Promise.all([
    query('SELECT * FROM days WHERE journey_id = $1 ORDER BY day_number ASC', [journey.id]),
    query('SELECT * FROM moments WHERE journey_id = $1 ORDER BY started_at ASC NULLS LAST', [journey.id]),
    query(`SELECT ${PHOTO_COLUMNS} FROM photos WHERE journey_id = $1 ORDER BY taken_at ASC NULLS LAST`, [journey.id]),
    query('SELECT * FROM places WHERE journey_id = $1', [journey.id]),
    query(
      `SELECT memories.* FROM memories
       JOIN moments ON moments.id = memories.moment_id
       WHERE moments.journey_id = $1`,
      [journey.id],
    ),
    query('SELECT is_active FROM journey_shares WHERE journey_id = $1 AND is_active = true LIMIT 1', [journey.id]),
  ])
  const photos = photoRows.map(mapPhoto)
  const memories = memoryRows.map((row) => ({
    id: row.id,
    momentId: row.moment_id,
    question: row.question,
    answer: row.answer,
    suggestion: row.suggestion || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  const days = dayRows.map((day) => ({
    id: day.id,
    journeyId: day.journey_id,
    dayNumber: day.day_number,
    date: calendarDate(day.date),
    title: day.title || '',
    createdAt: day.created_at,
    updatedAt: day.updated_at,
    moments: momentRows
      .filter((moment) => moment.day_id === day.id)
      .map((moment) => ({
        id: moment.id,
        journeyId: moment.journey_id,
        dayId: moment.day_id,
        title: moment.title || '',
        startedAt: moment.started_at,
        endedAt: moment.ended_at,
        latitude: moment.latitude,
        longitude: moment.longitude,
        locationConfidence: moment.location_confidence,
        story: moment.story || '',
        createdAt: moment.created_at,
        updatedAt: moment.updated_at,
        photos: photos.filter((photo) => photo.momentId === moment.id),
        memories: memories.filter((memory) => memory.momentId === moment.id),
      })),
  }))
  return {
    ...journey,
    days,
    unassigned: photos.filter((photo) => !photo.momentId),
    places: placeRows.map((place) => ({
      id: place.id,
      journeyId: place.journey_id,
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      confidence: place.confidence,
    })),
    shareActive: shareRows.length > 0,
  }
}

export const neonRepo = {
  async listJourneys(ownerHash) {
    const rows = await query(
      'SELECT * FROM journeys WHERE owner_key_hash = $1 ORDER BY created_at DESC',
      [ownerHash],
    )
    const journeys = []
    for (const row of rows) journeys.push(await hydrate(mapJourney(row)))
    return journeys
  },

  async createJourney(ownerHash) {
    const id = createId()
    const rows = await query(
      `INSERT INTO journeys (id, owner_key_hash, title, status)
       VALUES ($1, $2, '', 'draft')
       RETURNING *`,
      [id, ownerHash],
    )
    return hydrate(mapJourney(rows[0]))
  },

  async getJourney(id) {
    const rows = await query('SELECT * FROM journeys WHERE id = $1', [id])
    return hydrate(mapJourney(rows[0]))
  },

  async updateJourney(id, patch) {
    const current = await this.getJourney(id)
    if (!current) return null
    const next = { ...current, ...patch }
    await query(
      `UPDATE journeys
       SET title = $2, started_at = $3, ended_at = $4, cover_photo_id = $5, status = $6, updated_at = now()
       WHERE id = $1`,
      [id, next.title, next.startedAt, next.endedAt, next.coverPhotoId, next.status],
    )
    return this.getJourney(id)
  },

  async deleteJourney(id) {
    await query('DELETE FROM journeys WHERE id = $1', [id])
  },

  async addPhoto({ journeyId, bytes, blobUrl, filename, takenAt, latitude, longitude, width, height }) {
    const id = createId()
    let url = blobUrl
    let content = null
    if (bytes && process.env.VERCEL) {
      url = `/api/media/${id}`
      content = bytes
    } else if (bytes) {
      const { mkdir, writeFile } = await import('node:fs/promises')
      const blobDir = path.resolve('data/blobs')
      await mkdir(blobDir, { recursive: true })
      await writeFile(path.join(blobDir, id), bytes)
      url = `/api/media/${id}`
    }
    const rows = await query(
      `INSERT INTO photos
        (id, journey_id, blob_url, filename, taken_at, latitude, longitude, width, height, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING ${PHOTO_COLUMNS}`,
      [id, journeyId, url, filename || 'photo', takenAt, latitude, longitude, width, height, content],
    )
    return mapPhoto(rows[0])
  },

  async listPhotos(journeyId) {
    const rows = await query(`SELECT ${PHOTO_COLUMNS} FROM photos WHERE journey_id = $1`, [journeyId])
    return rows.map(mapPhoto)
  },

  async getPhoto(id) {
    const rows = await query(`SELECT ${PHOTO_COLUMNS} FROM photos WHERE id = $1`, [id])
    return rows[0] ? mapPhoto(rows[0]) : null
  },

  async saveChunk({ journeyId, uploadId, index, total, bytes }) {
    await query(
      `INSERT INTO photo_chunks (upload_id, journey_id, chunk_index, total_count, content)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (upload_id, chunk_index)
       DO UPDATE SET content = EXCLUDED.content, total_count = EXCLUDED.total_count`,
      [uploadId, journeyId, index, total, bytes],
    )
  },

  async listChunks(journeyId, uploadId) {
    const rows = await query(
      'SELECT chunk_index, content FROM photo_chunks WHERE journey_id = $1 AND upload_id = $2 ORDER BY chunk_index ASC',
      [journeyId, uploadId],
    )
    return rows.map((row) => ({
      index: row.chunk_index,
      bytes: Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content),
    }))
  },

  async deleteChunks(journeyId, uploadId) {
    await query('DELETE FROM photo_chunks WHERE journey_id = $1 AND upload_id = $2', [journeyId, uploadId])
  },

  async photoByteLength(id) {
    const rows = await query('SELECT octet_length(content) AS size FROM photos WHERE id = $1', [id])
    return Number(rows[0]?.size || 0)
  },

  async readPhotoBytes(id) {
    const rows = await query('SELECT content FROM photos WHERE id = $1', [id])
    const content = rows[0]?.content
    if (content) return Buffer.isBuffer(content) ? content : Buffer.from(content)
    try {
      return await readFile(path.resolve('data/blobs', id))
    } catch {
      return null
    }
  },

  async removePhoto(id) {
    const photo = await this.getPhoto(id)
    if (!photo) return null
    await query('DELETE FROM photos WHERE id = $1', [id])
    if (photo.momentId) {
      const remaining = await query('SELECT id FROM photos WHERE moment_id = $1', [photo.momentId])
      if (!remaining.length) {
        const momentRows = await query('SELECT day_id FROM moments WHERE id = $1', [photo.momentId])
        await query('DELETE FROM moments WHERE id = $1', [photo.momentId])
        const dayId = momentRows[0]?.day_id
        if (dayId) {
          const still = await query('SELECT id FROM moments WHERE day_id = $1', [dayId])
          if (!still.length) await query('DELETE FROM days WHERE id = $1', [dayId])
        }
      }
    }
    const { rm } = await import('node:fs/promises')
    await rm(path.resolve('data/blobs', id), { force: true })
    return photo
  },

  async saveReconstruction(journeyId, payload) {
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM days WHERE journey_id = $1', [journeyId])
      await client.query('DELETE FROM places WHERE journey_id = $1', [journeyId])
      await client.query(
        `UPDATE photos
         SET moment_id = NULL, is_representative = false, is_cover = false
         WHERE journey_id = $1`,
        [journeyId],
      )
      for (const day of payload.days) {
        await client.query(
          `INSERT INTO days (id, journey_id, day_number, date, title)
           VALUES ($1,$2,$3,$4,$5)`,
          [day.id, journeyId, day.dayNumber, /^\d{4}-\d{2}-\d{2}$/.test(day.date || '') ? day.date : null, day.title],
        )
      }
      for (const moment of payload.moments) {
        await client.query(
          `INSERT INTO moments
            (id, journey_id, day_id, title, started_at, ended_at, latitude, longitude, location_confidence, story)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            moment.id,
            journeyId,
            moment.dayId,
            moment.title,
            moment.startedAt,
            moment.endedAt,
            moment.latitude,
            moment.longitude,
            moment.locationConfidence,
            moment.story,
          ],
        )
      }
      for (const place of payload.places) {
        await client.query(
          `INSERT INTO places (id, journey_id, name, latitude, longitude, confidence)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [place.id, journeyId, place.name, place.latitude, place.longitude, place.confidence],
        )
      }
      for (const memory of payload.memories) {
        await client.query(
          `INSERT INTO memories (id, moment_id, question, answer)
           VALUES ($1,$2,$3,$4)`,
          [memory.id, memory.momentId, memory.question, memory.answer],
        )
      }
      for (const vision of payload.photoVision) {
        await client.query('UPDATE photos SET vision_description = $2 WHERE id = $1', [
          vision.id,
          vision.visionDescription,
        ])
      }
      for (const link of payload.photoLinks) {
        await client.query(
          `UPDATE photos
           SET moment_id = $2, is_representative = $3, is_cover = $4
           WHERE id = $1`,
          [link.id, link.momentId, link.isRepresentative, link.isCover],
        )
      }
      await client.query(
        `UPDATE journeys
         SET title = $2, started_at = $3, ended_at = $4, cover_photo_id = $5, status = 'ready', updated_at = now()
         WHERE id = $1`,
        [journeyId, payload.title, payload.startedAt, payload.endedAt, payload.coverPhotoId],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    return this.getJourney(journeyId)
  },

  async updateMoment(id, patch) {
    const rows = await query('SELECT * FROM moments WHERE id = $1', [id])
    if (!rows[0]) return null
    const current = rows[0]
    const title = patch.title ?? current.title
    const story = patch.story ?? current.story
    const confidence = patch.locationConfidence ?? current.location_confidence
    const latitude = patch.latitude === undefined ? current.latitude : patch.latitude
    const longitude = patch.longitude === undefined ? current.longitude : patch.longitude
    await query(
      `UPDATE moments
       SET title = $2, story = $3, location_confidence = $4, latitude = $5, longitude = $6, updated_at = now()
       WHERE id = $1`,
      [id, title, story, confidence, latitude, longitude],
    )
    return { id, journeyId: current.journey_id }
  },

  async getMoment(id) {
    const journeyRows = await query('SELECT journey_id FROM moments WHERE id = $1', [id])
    if (!journeyRows[0]) return null
    const journey = await this.getJourney(journeyRows[0].journey_id)
    for (const day of journey.days) {
      const moment = day.moments.find((item) => item.id === id)
      if (moment) return moment
    }
    return null
  },

  async setMemoryPrompt(momentId, memoryId, { suggestion }) {
    await query(
      `UPDATE memories
       SET suggestion = $3, updated_at = now()
       WHERE id = $1 AND moment_id = $2`,
      [memoryId, momentId, suggestion],
    )
  },

  async saveMemory(momentId, { question, answer }) {
    const rows = await query(
      `SELECT * FROM memories
       WHERE moment_id = $1 AND (question = $2 OR answer IS NULL)
       ORDER BY created_at ASC
       LIMIT 1`,
      [momentId, question],
    )
    if (!rows[0]) return null
    await query('UPDATE memories SET answer = $2, question = $3, updated_at = now() WHERE id = $1', [
      rows[0].id,
      answer,
      question || rows[0].question,
    ])
    return { id: rows[0].id, momentId, question, answer }
  },

  async updateMomentStory(id, story) {
    return this.updateMoment(id, { story })
  },

  async createShare(journeyId, shareTokenHash) {
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE journey_shares SET is_active = false, updated_at = now()
         WHERE journey_id = $1 AND is_active = true`,
        [journeyId],
      )
      const id = createId()
      await client.query(
        `INSERT INTO journey_shares (id, journey_id, share_token_hash, is_active)
         VALUES ($1,$2,$3,true)`,
        [id, journeyId, shareTokenHash],
      )
      await client.query('COMMIT')
      return { id, journeyId }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async revokeShare(journeyId) {
    const rows = await query(
      `UPDATE journey_shares SET is_active = false, updated_at = now()
       WHERE journey_id = $1 AND is_active = true
       RETURNING id`,
      [journeyId],
    )
    return rows.length > 0
  },

  async findActiveShare(shareTokenHash) {
    const rows = await query(
      `SELECT journey_id FROM journey_shares
       WHERE share_token_hash = $1 AND is_active = true
       LIMIT 1`,
      [shareTokenHash],
    )
    return rows[0] ? { journeyId: rows[0].journey_id } : null
  },
}
