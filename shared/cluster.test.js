import assert from 'node:assert/strict'
import test from 'node:test'
import { clusterPhotos } from './cluster.js'

test('splits days and nearby stops', () => {
  const photos = [
    { id: 'a', takenAt: '2026-04-12T09:00:00.000Z', latitude: 52.5, longitude: 13.4 },
    { id: 'b', takenAt: '2026-04-12T09:20:00.000Z', latitude: 52.5004, longitude: 13.4004 },
    { id: 'c', takenAt: '2026-04-12T12:30:00.000Z', latitude: 52.52, longitude: 13.41 },
    { id: 'd', takenAt: '2026-04-13T10:00:00.000Z', latitude: 48.13, longitude: 11.58 },
  ]
  const days = clusterPhotos(photos)
  assert.equal(days.length, 2)
  assert.equal(days[0].moments.length, 2)
  assert.equal(days[0].moments[0].photos.length, 2)
  assert.equal(days[0].moments[0].locationConfidence, 'confirmed')
  assert.equal(days[1].dayNumber, 2)
})

test('estimates a gap without gps from a nearby stop', () => {
  const photos = [
    { id: 'a', takenAt: '2026-04-12T09:00:00.000Z', latitude: 35.66, longitude: 139.7 },
    { id: 'b', takenAt: '2026-04-12T10:00:00.000Z', latitude: null, longitude: null },
  ]
  const days = clusterPhotos(photos)
  assert.equal(days[0].moments[1].locationConfidence, 'estimated')
  assert.equal(days[0].moments[1].latitude, 35.66)
})

test('keeps undated photos together', () => {
  const days = clusterPhotos([{ id: 'a', takenAt: null, latitude: null, longitude: null }])
  assert.equal(days[0].date, null)
  assert.equal(days[0].moments[0].locationConfidence, 'unknown')
})
