function parseDay(date) {
  if (!date) return null
  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/)
  const parsed = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatUtc(date, options) {
  const parsed = parseDay(date)
  if (!parsed) return ''
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(parsed)
}

export function formatDayLabel(dayNumber, date) {
  const number = String(dayNumber).padStart(2, '0')
  const pretty = formatUtc(date, { month: 'short', day: 'numeric' })
  return pretty ? `Day ${number} · ${pretty}` : `Day ${number} · Undated`
}

export function formatWeekday(date) {
  return formatUtc(date, { weekday: 'long', month: 'short', day: 'numeric' }) || 'Undated'
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
  const options = { month: 'short', day: 'numeric', year: 'numeric' }
  const left = start ? formatUtc(start, options) : ''
  const right = end ? formatUtc(end, options) : ''
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
