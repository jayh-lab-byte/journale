let draft = null
let journeyId = ''

export function setDraft(files) {
  draft = files
}

export function getDraft() {
  return draft
}

export function clearDraft() {
  draft = null
}

export function rememberJourney(id) {
  journeyId = id
  sessionStorage.setItem('journale-reconstruct-id', id)
}

export function rememberedJourney() {
  return journeyId || sessionStorage.getItem('journale-reconstruct-id') || ''
}

let inflight = null

export function shareInflight(factory) {
  if (!inflight) {
    inflight = Promise.resolve()
      .then(factory)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}
