import { hasGps } from '../shared/cluster.js'
import { clusterPhotos } from '../shared/cluster.js'
import { selectQuestions } from '../shared/questions.js'
import { draftDayTitle, draftJourneyTitle, draftMomentStory } from '../shared/story.js'
import { createId } from './http.js'
import { getRepo } from './repo.js'

function placeName(data) {
  const address = data?.address || {}
  const spot =
    address.tourism ||
    address.attraction ||
    address.museum ||
    address.cafe ||
    address.restaurant ||
    address.pedestrian ||
    address.neighbourhood ||
    address.suburb ||
    address.road
  const city = address.city || address.town || address.village || address.hamlet || address.state
  if (spot && city && spot !== city) return `${spot}, ${city}`
  return data?.name || city || spot || ''
}

async function reverseGeocode(latitude, longitude) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('format', 'json')
  const response = await fetch(url, {
    headers: { 'user-agent': 'Journale/0.1 (educational travel storybook)', accept: 'application/json' },
    signal: AbortSignal.timeout(2000),
  })
  if (!response.ok) return ''
  const data = await response.json()
  return placeName(data).slice(0, 120)
}

async function namePlaces(days) {
  const cache = new Map()
  let named = 0
  let lookups = 0
  for (const day of days) {
    for (const moment of day.moments) {
      if (!hasGps(moment)) {
        moment.title = 'Untitled stop'
        continue
      }
      const key = `${moment.latitude.toFixed(3)},${moment.longitude.toFixed(3)}`
      if (!cache.has(key)) {
        if (lookups >= 6) {
          cache.set(key, '')
        } else {
          lookups += 1
          try {
            cache.set(key, await reverseGeocode(moment.latitude, moment.longitude))
          } catch {
            cache.set(key, '')
          }
        }
      }
      const name = cache.get(key)
      moment.title = name || 'Pinned location'
      if (name) named += 1
    }
  }
  return named
}

async function writeWithModel(days) {
  const facts = days.map((day) => ({
    dayNumber: day.dayNumber,
    date: day.date,
    moments: day.moments.map((moment) => ({
      key: moment.key,
      time: moment.startedAt,
      place: moment.title,
      confidence: moment.locationConfidence,
      photoCount: moment.photos?.length || 0,
      visible: moment.visionDescription || '',
      memory: (moment.memories || []).find((memory) => memory.answer)?.answer || '',
    })),
  }))
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(18000),
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Write a short travel essay from confirmed facts only. Never invent events, dialogue, emotions, weather, or place history. Prefer the traveler memory when it is present. Use a calm, plain voice. Return JSON with title, days: [{ dayNumber, title, moments: [{ key, story }] }]. Each story is one or two sentences.',
        },
        { role: 'user', content: JSON.stringify(facts) },
      ],
    }),
  })
  if (!response.ok) throw new Error('Story request failed')
  const data = await response.json()
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}')
  return parsed
}

function applyDraftStories(days) {
  for (const day of days) {
    day.title = draftDayTitle(day)
    for (const moment of day.moments) moment.story = draftMomentStory(moment)
  }
}

function applyModelStories(days, parsed) {
  const dayMap = new Map((parsed.days || []).map((day) => [Number(day.dayNumber), day]))
  for (const day of days) {
    const match = dayMap.get(day.dayNumber)
    day.title = String(match?.title || draftDayTitle(day)).slice(0, 120)
    const stories = new Map((match?.moments || []).map((moment) => [moment.key, moment.story]))
    for (const moment of day.moments) {
      const text = stories.get(moment.key)
      moment.story = String(text || draftMomentStory(moment)).trim().slice(0, 1200)
    }
  }
  return String(parsed.title || '').slice(0, 120)
}

export async function draftInterviewPrompt({ title, bytes }) {
  if (!process.env.OPENAI_API_KEY) return null
  const content = [
    {
      type: 'text',
      text: `Place label: ${title || 'Unknown place'}. The question is already "What do you remember about this photo?" Look at the photograph and write only a draft answer.`,
    },
  ]
  if (bytes?.length) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}` },
    })
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You help a traveler remember a stop from one photograph. Return JSON with suggestion only. The suggestion is a first-person draft of one or two sentences answering "What do you remember about this photo?" The traveler can keep it or edit it. Base it on what is visible, and where taste or feeling is not visible, offer a gentle likely note rather than a blank. Do not invent names. Do not write a question.',
        },
        { role: 'user', content },
      ],
    }),
  })
  if (!response.ok) return null
  const data = await response.json()
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}')
  const suggestion = String(parsed.suggestion || '').trim().slice(0, 600)
  if (!suggestion) return null
  return { suggestion }
}

export async function reconstructJourney(journeyId) {
  const repo = getRepo()
  const photos = await repo.listPhotos(journeyId)
  if (!photos.length) {
    const error = new Error('Add at least one photo before reconstruction.')
    error.status = 400
    error.code = 'VALIDATION_ERROR'
    throw error
  }
  const days = clusterPhotos(photos)
  let key = 0
  for (const day of days) {
    for (const moment of day.moments) {
      moment.key = `m${key}`
      key += 1
      moment.visionDescription = ''
      moment.memories = []
    }
  }
  await namePlaces(days)
  const photoVision = []
  const questions = selectQuestions(days)
  let modelTitle = ''
  if (process.env.OPENAI_API_KEY) {
    try {
      const parsed = await writeWithModel(days)
      modelTitle = applyModelStories(days, parsed)
    } catch {
      applyDraftStories(days)
    }
  } else {
    applyDraftStories(days)
  }
  const dated = photos.map((photo) => photo.takenAt).filter(Boolean).sort()
  const payload = buildPayload(journeyId, days, questions, photoVision, dated, modelTitle)
  return repo.saveReconstruction(journeyId, payload)
}

function buildPayload(journeyId, days, questions, photoVision, dated, modelTitle) {
  const questionByKey = new Map(questions.map((item) => [item.momentKey, item.question]))
  const savedDays = []
  const moments = []
  const places = []
  const memories = []
  const photoLinks = []
  let coverPhotoId = null
  days.forEach((day, dayIndex) => {
    const dayId = createId()
    savedDays.push({
      id: dayId,
      journeyId,
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title || draftDayTitle(day),
    })
    day.moments.forEach((moment) => {
      const momentId = createId()
      moments.push({
        id: momentId,
        journeyId,
        dayId,
        title: moment.title,
        startedAt: moment.startedAt,
        endedAt: moment.endedAt,
        latitude: moment.latitude,
        longitude: moment.longitude,
        locationConfidence: moment.locationConfidence,
        story: moment.story || '',
      })
      if (moment.latitude != null) {
        places.push({
          id: createId(),
          journeyId,
          name: moment.title,
          latitude: moment.latitude,
          longitude: moment.longitude,
          confidence: moment.locationConfidence,
        })
      }
      const question = questionByKey.get(moment.key)
      if (question) {
        memories.push({ id: createId(), momentId, question, answer: null })
      }
      moment.photos.forEach((photo) => {
        const isRepresentative = photo.id === moment.representativeId
        const isCover = coverPhotoId == null && isRepresentative && dayIndex === 0
        if (isCover) coverPhotoId = photo.id
        photoLinks.push({ id: photo.id, momentId, isRepresentative, isCover })
      })
    })
  })
  if (!coverPhotoId && photoLinks[0]) {
    photoLinks[0].isCover = true
    coverPhotoId = photoLinks[0].id
  }
  const shapedDays = savedDays.map((day) => ({
    ...day,
    moments: moments.filter((moment) => moment.dayId === day.id).map((moment) => ({
      ...moment,
      title: moment.title,
      photos: [],
    })),
  }))
  return {
    title: modelTitle || draftJourneyTitle(shapedDays.length ? days : [], dated[0] || null),
    startedAt: dated[0] || null,
    endedAt: dated.at(-1) || null,
    coverPhotoId,
    days: savedDays,
    moments,
    places,
    memories,
    photoVision,
    photoLinks,
  }
}

export async function regenerateMomentStory(momentId) {
  const repo = getRepo()
  const moment = await repo.getMoment(momentId)
  if (!moment) return null
  const draft = {
    ...moment,
    visionDescription: moment.photos.find((photo) => photo.isRepresentative)?.visionDescription || moment.photos[0]?.visionDescription || '',
  }
  let story = draftMomentStory(draft)
  if (process.env.OPENAI_API_KEY) {
    try {
      const parsed = await writeWithModel([
        {
          dayNumber: 1,
          date: null,
          moments: [
            {
              ...draft,
              key: 'm0',
              photos: moment.photos || [],
              visionDescription: draft.visionDescription,
            },
          ],
        },
      ])
      const text = parsed.days?.[0]?.moments?.find((item) => item.key === 'm0')?.story
      if (text) story = String(text).trim().slice(0, 1200)
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Story rewrite failed')
    }
  }
  await repo.updateMomentStory(momentId, story)
  return story
}
