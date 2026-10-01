import { berlin } from './data/sampleJourneys/berlin.js'
import { paris } from './data/sampleJourneys/paris.js'
import { seoul } from './data/sampleJourneys/seoul.js'

function withCounts(sample) {
  const photos = sample.journey.days.flatMap((day) => day.moments.flatMap((moment) => moment.photos))
  const moments = sample.journey.days.flatMap((day) => day.moments)
  sample.journey.counts = {
    photos: photos.length,
    days: sample.journey.days.length,
    moments: moments.length,
    locations: moments.filter((moment) => moment.locationConfidence !== 'unknown').length,
  }
  return sample
}

export const samples = [berlin, paris, seoul].map(withCounts)

export function getSample(slug) {
  return samples.find((sample) => sample.slug === slug) || null
}
