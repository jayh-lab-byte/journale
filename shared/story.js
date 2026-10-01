function timeLabel(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function sentence(parts) {
  return parts.filter(Boolean).join(' ')
}

export function draftMomentStory(moment) {
  const place = moment.title || 'This stop'
  const when = timeLabel(moment.startedAt)
  const count = moment.photos?.length || 0
  const photoLine =
    count === 1 ? '1 photo was made here.' : `${count} photos were made here.`
  const confidence =
    moment.locationConfidence === 'estimated'
      ? 'The place is estimated from nearby photos.'
      : moment.locationConfidence === 'unknown'
        ? 'A place name could not be read from the photos.'
        : ''
  const vision = moment.visionDescription ? moment.visionDescription : ''
  const memory = moment.memories?.find((item) => item.answer)?.answer
  const memoryLine = memory ? memory.trim() : ''
  return sentence([
    when ? `${place}, around ${when}.` : `${place}.`,
    photoLine,
    confidence,
    vision,
    memoryLine,
  ])
}

export function draftDayTitle(day) {
  const names = []
  for (const moment of day.moments) {
    if (!moment.title || moment.title === 'Pinned location' || moment.title === 'Untitled stop') continue
    if (!names.includes(moment.title)) names.push(moment.title)
  }
  if (!names.length) return day.date ? 'Untitled day' : 'Undated photographs'
  if (names.length === 1) return names[0]
  return `${names[0]} to ${names[1]}`
}

export function draftJourneyTitle(days, startedAt) {
  const names = []
  for (const day of days) {
    for (const moment of day.moments) {
      const name = moment.placeName || moment.title
      if (!name || name === 'Pinned location' || name === 'Untitled stop') continue
      const city = name.split(',').pop().trim()
      if (city && !names.includes(city)) names.push(city)
    }
  }
  const when = startedAt
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' }).format(new Date(startedAt))
    : ''
  const where = names.slice(0, 2).join(' · ')
  if (where && when) return `${where} · ${when}`
  return where || when || 'Untitled journey'
}
