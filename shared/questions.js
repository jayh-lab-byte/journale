import { hasGps, minutesBetween } from './cluster.js'

const QUESTIONS = {
  many: 'You took many photos here. What made this place memorable?',
  long: 'You stayed here for a while. What do you remember most about this stop?',
  gap: 'There is a long gap before this stop. Do you remember what happened?',
  unknown: 'This place is still unclear. What do you remember about this stop?',
  default: 'What do you remember most about this stop?',
}

function reasonFor(moment, previous) {
  const duration = minutesBetween(moment.startedAt, moment.endedAt) || 0
  const gap = previous ? minutesBetween(previous.endedAt || previous.startedAt, moment.startedAt) : 0
  if ((moment.photos?.length || 0) >= 4) return 'many'
  if (gap >= 180) return 'gap'
  if (duration >= 60) return 'long'
  if (moment.locationConfidence === 'unknown' || moment.locationConfidence === 'estimated') return 'unknown'
  return 'default'
}

export function selectQuestions(days) {
  const moments = days.flatMap((day) => day.moments.map((moment) => ({ ...moment, dayNumber: day.dayNumber })))
  const ranked = moments.map((moment, index) => {
    const previous = moments[index - 1]
    const reason = reasonFor(moment, previous)
    let score = reason === 'default' ? 1 : 4
    if ((moment.photos?.length || 0) >= 4) score += 2
    if (moment.locationConfidence !== 'confirmed') score += 1
    return { moment, reason, score }
  })
  ranked.sort((a, b) => b.score - a.score)
  const picked = []
  for (const item of ranked) {
    if (picked.length >= 5) break
    picked.push(item)
  }
  while (picked.length < Math.min(3, moments.length)) {
    const next = ranked.find((item) => !picked.includes(item))
    if (!next) break
    picked.push(next)
  }
  return picked.slice(0, 5).map((item) => ({
    momentKey: item.moment.key,
    question: QUESTIONS[item.reason] || QUESTIONS.default,
  }))
}

export function placeLabel(moment) {
  if (moment.title) return moment.title
  if (hasGps(moment)) return 'Pinned location'
  return 'Untitled stop'
}
