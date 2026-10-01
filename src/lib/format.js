export function formatDayLabel(dayNumber, date) {
  const number = String(dayNumber).padStart(2, '0')
  if (!date) return `Day ${number} · Undated`
  const parsed = new Date(`${date}T00:00:00Z`)
  const pretty = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
  return `Day ${number} · ${pretty}`
}

export function formatWeekday(date) {
  if (!date) return 'Undated'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`))
}

export function formatTime(iso) {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

export function formatRange(start, end) {
  if (!start && !end) return ''
  const options = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  const left = start ? new Intl.DateTimeFormat('en-US', options).format(new Date(start)) : ''
  const right = end ? new Intl.DateTimeFormat('en-US', options).format(new Date(end)) : ''
  if (left && right && left !== right) return `${left} – ${right}`
  return left || right
}

export function formatCoord(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return ''
  const ns = latitude >= 0 ? 'N' : 'S'
  const ew = longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(latitude).toFixed(4)}° ${ns}, ${Math.abs(longitude).toFixed(4)}° ${ew}`
}

export function countNoun(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function confidenceLabel(value) {
  if (value === 'confirmed') return 'Confirmed'
  if (value === 'estimated') return 'Estimated'
  return 'Unknown'
}
