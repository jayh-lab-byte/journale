import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { clearDraft, getDraft, rememberJourney, rememberedJourney, shareInflight } from '../lib/draft.js'
import { Notice } from '../components/Shell.jsx'

const STAGES = [
  'Reading photo dates',
  'Finding places',
  'Grouping moments',
  'Building your timeline',
  'Preparing your story',
]

export function Reconstruct() {
  const [stage, setStage] = useState(0)
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState('')
  const [journey, setJourney] = useState(null)
  const [uploaded, setUploaded] = useState(0)
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState([])
  const [running, setRunning] = useState(false)
  const journeyIdRef = useRef(rememberedJourney())
  const uploadedKeys = useRef(new Set())

  async function run(files, { upload = true } = {}) {
    setRunning(true)
    setError('')
    setStatus('processing')
    try {
      setStage(1)
      let id = journeyIdRef.current
      if (!id) {
        const created = await api('/api/journeys', { method: 'POST' })
        id = created.journey.id
        journeyIdRef.current = id
        rememberJourney(id)
        setJourney(created.journey)
      }
      const problems = []
      if (upload) {
        let done = uploadedKeys.current.size
        setTotal(files.length)
        for (const item of files) {
          if (uploadedKeys.current.has(item.key)) continue
          try {
            const form = new FormData()
            form.append('file', item.file)
            form.append('meta', JSON.stringify({ ...item.meta, filename: item.name }))
            await api(`/api/journeys/${id}/photos`, { method: 'POST', form })
            uploadedKeys.current.add(item.key)
            done += 1
            setUploaded(done)
          } catch (err) {
            problems.push({ ...item, message: err.message })
          }
        }
      }
      setFailed(problems)
      const savedCount = uploadedKeys.current.size
      if (upload && savedCount === 0) {
        setStatus('partial')
        const message = 'None of the photos could be saved. You can try them again.'
        setError(message)
        return { status: 'partial', error: message, failed: problems }
      }
      setStage(2)
      const result = await api(`/api/journeys/${id}/reconstruct`, { method: 'POST' })
      setJourney(result.journey)
      setStage(5)
      setStatus(problems.length ? 'partial' : 'completed')
      clearDraft()
      if (problems.length) {
        setError(`${problems.length} photo${problems.length === 1 ? '' : 's'} could not be uploaded. The rest of the journey was kept.`)
      }
      return { journey: result.journey, failed: problems, status: problems.length ? 'partial' : 'completed' }
    } catch (err) {
      setStatus('failed')
      setError(err.message || 'Reconstruction could not finish. Your saved photos are still here.')
      return { status: 'failed', error: err.message }
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    let active = true
    const files = getDraft()
    if (files?.length) {
      setTotal(files.length)
      setStage(1)
      shareInflight(() => run(files)).then((result) => {
        if (!active || !result?.journey) return
        setJourney(result.journey)
        setFailed(result.failed || [])
        setStage(result.journey.counts?.moments ? 5 : 1)
        setStatus(result.status || 'completed')
        if (result.error) setError(result.error)
      })
      return () => {
        active = false
      }
    }
    const id = rememberedJourney()
    if (!id) {
      setStatus('empty')
      return
    }
    api(`/api/journeys/${id}`)
      .then((data) => {
        setJourney(data.journey)
        journeyIdRef.current = data.journey.id
        if (data.journey.counts.moments) {
          setStage(5)
          setStatus('completed')
        } else if (data.journey.counts.photos) {
          setStage(1)
          setStatus('partial')
        } else {
          setStatus('empty')
        }
      })
      .catch(() => setStatus('empty'))
  }, [])

  const counts = journey?.counts
  const hasQuestions = journey?.days?.some((day) =>
    day.moments.some((moment) => moment.memories?.some((memory) => memory.answer == null)),
  )

  return (
    <div className="page">
      <p className="kicker">Reconstruction</p>
      <h1>Reconstructing your journey</h1>
      <p className="lede">Dates were read in the browser. Places, moments, and the story are assembled from those photos.</p>
      <div className="stage-list" aria-live="polite">
        {STAGES.map((label, index) => {
          const state = index < stage ? 'done' : index === Math.min(stage, 4) && status === 'processing' ? 'now' : ''
          return (
            <div className="stage" key={label}>
              <span className={`mark ${state}`} aria-hidden="true">{state === 'done' ? '✓' : state === 'now' ? '●' : '○'}</span>
              <div>
                <strong>{label}</strong>
                <p className="faint">
                  {index === 0 && total ? `${total} photos read` : ''}
                  {state === 'now' ? 'In progress' : ''}
                  {state === 'done' && index === 4 && counts
                    ? `${counts.photos} photos indexed · ${counts.locations} locations detected · ${counts.moments} moments created`
                    : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {status === 'processing' ? <p role="status">Uploaded {uploaded} of {total || uploaded} photos.</p> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {status === 'empty' ? (
        <Notice>
          Choose photos before reconstruction. <Link to="/create">Back to Create Journey</Link>
        </Notice>
      ) : null}
      <div className="actions">
        {failed.length ? (
          <button className="button" type="button" disabled={running} onClick={() => run(failed)}>
            Retry failed photos
          </button>
        ) : null}
        {status === 'failed' || (status === 'partial' && journey?.counts?.photos && !journey?.counts?.moments) ? (
          <button className="button" type="button" disabled={running} onClick={() => run([], { upload: false })}>
            Retry reconstruction
          </button>
        ) : null}
        {journey?.counts?.moments ? <Link className="button" to={`/journeys/${journey.id}`}>Open Story</Link> : null}
        {hasQuestions ? <Link className="ghost" to={`/journeys/${journey.id}/interview`}>Memory Interview</Link> : null}
      </div>
      <p className="faint">Photo metadata is read on your device before reconstruction begins.</p>
    </div>
  )
}
