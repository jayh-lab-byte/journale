export const MOMENT_TIME_GAP_MINUTES = 45
export const MOMENT_DISTANCE_METERS = 400
export const ESTIMATE_GAP_MINUTES = 120

export function hasGps(photo) {
  const lat = Number(photo.latitude)
  const lng = Number(photo.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

export function haversineMeters(a, b) {
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function instant(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function calendarDay(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10)
  }
  return null
}

export function minutesBetween(earlier, later) {
  const start = instant(earlier)
  const end = instant(later)
  if (start == null || end == null) return null
  return Math.abs(end - start) / 60000
}

function averageGps(photos) {
  const located = photos.filter(hasGps)
  if (!located.length) return { latitude: null, longitude: null }
  const latitude = located.reduce((sum, photo) => sum + photo.latitude, 0) / located.length
  const longitude = located.reduce((sum, photo) => sum + photo.longitude, 0) / located.length
  return { latitude, longitude }
}

function buildMoment(photos) {
  const ordered = [...photos].sort((a, b) => String(a.takenAt || '').localeCompare(String(b.takenAt || '')))
  const gps = averageGps(ordered)
  const representative = ordered[Math.floor((ordered.length - 1) / 2)]
  return {
    photos: ordered,
    representativeId: representative.id,
    startedAt: ordered.find((photo) => photo.takenAt)?.takenAt || null,
    endedAt: [...ordered].reverse().find((photo) => photo.takenAt)?.takenAt || null,
    latitude: gps.latitude,
    longitude: gps.longitude,
    locationConfidence: gps.latitude == null ? 'unknown' : 'confirmed',
  }
}

function applyEstimates(moments) {
  for (let index = 0; index < moments.length; index += 1) {
    const moment = moments[index]
    if (moment.latitude != null) continue
    const neighbors = [moments[index - 1], moments[index + 1]].filter(Boolean)
    const donor = neighbors.find((neighbor) => {
      if (neighbor.latitude == null || !moment.startedAt || !neighbor.startedAt) return false
      return minutesBetween(moment.startedAt, neighbor.startedAt) <= ESTIMATE_GAP_MINUTES
    })
    if (!donor) continue
    moment.latitude = donor.latitude
    moment.longitude = donor.longitude
    moment.locationConfidence = 'estimated'
  }
}

export function clusterPhotos(photos) {
  const sorted = [...photos].sort((a, b) => {
    const left = instant(a.takenAt)
    const right = instant(b.takenAt)
    if (left == null && right == null) return 0
    if (left == null) return 1
    if (right == null) return -1
    return left - right
  })
  const groups = new Map()
  for (const photo of sorted) {
    const key = calendarDay(photo.takenAt) || 'undated'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(photo)
  }

  const days = []
  let dayNumber = 1
  for (const [date, list] of groups) {
    const moments = []
    let current = []
    const flush = () => {
      if (!current.length) return
      moments.push(buildMoment(current))
      current = []
    }
    for (const photo of list) {
      if (!current.length) {
        current.push(photo)
        continue
      }
      const previous = current[current.length - 1]
      const gap = minutesBetween(previous.takenAt, photo.takenAt)
      const distance =
        hasGps(previous) && hasGps(photo) ? haversineMeters(previous, photo) : null
      const splitByTime = gap != null && gap > MOMENT_TIME_GAP_MINUTES
      const splitByDistance = distance != null && distance > MOMENT_DISTANCE_METERS
      if (splitByTime || splitByDistance) flush()
      current.push(photo)
    }
    flush()
    applyEstimates(moments)
    days.push({
      dayNumber,
      date: date === 'undated' ? null : date,
      moments,
    })
    dayNumber += 1
  }
  return days
}
