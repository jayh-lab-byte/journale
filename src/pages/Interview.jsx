import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formatDayLabel, formatTime } from '../lib/format.js'
import { shrinkForPrompt } from '../lib/resize.js'
import { Notice } from '../components/Shell.jsx'

export function Interview() {
  const { id } = useParams()
  const [journey, setJourney] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [answer, setAnswer] = useState('')
  const [index, setIndex] = useState(0)
  const [pending, setPending] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [note, setNote] = useState('')
  const edited = useRef(false)

  useEffect(() => {
    api(`/api/journeys/${id}`)
      .then((data) => {
        setJourney(data.journey)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [id])

  const questions = journey
    ? journey.days.flatMap((day) =>
        day.moments.flatMap((moment) =>
          (moment.memories || [])
            .filter((memory) => memory.answer == null)
            .map((memory) => ({ ...memory, moment, day })),
        ),
      )
    : []
  const current = questions[Math.min(index, Math.max(questions.length - 1, 0))]

  useEffect(() => {
    if (!current) return undefined
    edited.current = false
    if (current.suggestion) {
      setAnswer(current.suggestion)
      return undefined
    }
    let cancelled = false
    setDrafting(true)
    setAnswer('')
    const photo = current.moment.photos?.find((item) => item.isRepresentative) || current.moment.photos?.[0]
    const form = new FormData()
    form.append('memoryId', current.id)
    shrinkForPrompt(photo?.url || '')
      .catch(() => null)
      .then((file) => {
        if (cancelled) return null
        if (file) form.append('file', file)
        return api(`/api/moments/${current.moment.id}/prompt`, { method: 'POST', form })
      })
      .then((data) => {
        if (cancelled || !data?.journey) return
        setJourney(data.journey)
        const suggestion = data.journey.days
          .flatMap((day) => day.moments)
          .flatMap((moment) => moment.memories || [])
          .find((memory) => memory.id === current.id)?.suggestion
        if (suggestion && !edited.current) setAnswer(suggestion)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDrafting(false)
      })
    return () => {
      cancelled = true
    }
  }, [current?.id])

  async function submit(skip) {
    if (!current) return
    setPending(true)
    setError('')
    try {
      const data = await api(`/api/moments/${current.moment.id}/memory`, {
        method: 'POST',
        json: { memoryId: current.id, answer, skip },
      })
      setJourney(data.journey)
      setAnswer('')
      setNote(skip ? 'Question skipped.' : 'Memory saved.')
      setIndex(0)
    } catch (err) {
      setError(err.message)
      if (err.code === 'STORY_ERROR') {
        const data = await api(`/api/journeys/${id}`)
        setJourney(data.journey)
        setNote('Your memory was saved. The story can be retried from the story page.')
        setAnswer('')
      }
    } finally {
      setPending(false)
    }
  }

  if (status === 'loading') return <div className="page"><p role="status">Loading questions…</p></div>
  if (status === 'error') return <div className="page"><Notice tone="error">{error}</Notice></div>

  return (
    <div className="page">
      <p className="kicker">Memory Interview</p>
      <h1>One question at a time.</h1>
      {note ? <Notice tone="ok">{note}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {!current ? (
        <div className="panel stack">
          <p>There are no open questions for this journey.</p>
          <Link className="button" to={`/journeys/${id}`}>Back to Story</Link>
        </div>
      ) : (
        <div className="interview-layout">
          <figure className="hero-photo">
            <img src={current.moment.photos?.[0]?.url || ''} alt={current.moment.title || 'Related photograph'} />
            <figcaption>
              <span>{formatDayLabel(current.day.dayNumber, current.day.date)} · {formatTime(current.moment.startedAt)}</span>
              <span>{current.moment.photos?.length || 0} photos</span>
            </figcaption>
            <p className="muted">{current.moment.title}</p>
          </figure>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              submit(false)
            }}
          >
            <p className="meta">Question {Math.min(index, questions.length - 1) + 1} of {questions.length}</p>
            <h2>{drafting && !current.suggestion ? 'Looking at this photo…' : current.question}</h2>
            <label className="stack">
              <span className="meta">Suggested answer</span>
              <textarea
                value={answer}
                onChange={(event) => {
                  edited.current = true
                  setAnswer(event.target.value)
                }}
                maxLength={2000}
                placeholder="A draft will appear from the photo. Change anything that isn't right."
              />
              <span className="faint">Written from the photo. Edit anything that isn't right, then save.</span>
            </label>
            <div className="actions">
              <button className="button" type="submit" disabled={pending || drafting}>Save</button>
              <button className="ghost" type="button" disabled={pending || drafting} onClick={() => submit(true)}>Skip</button>
              <Link className="text-link" to={`/journeys/${id}`}>Back to Story</Link>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
