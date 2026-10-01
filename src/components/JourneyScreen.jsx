import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { confidenceLabel, countNoun, formatCoord, formatDayLabel, formatTime, formatWeekday } from '../lib/format.js'
import { Confidence, Notice } from './Shell.jsx'
import { MapCanvas } from './MapCanvas.jsx'

export function JourneyScreen({ journey, mode, paths, onJourney, mapStyle }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const readOnly = Boolean(journey.readOnly || journey.sample)
  const dayNumber = Number(params.get('day') || 1)
  const dayIndex = Math.min(Math.max(dayNumber, 1), Math.max(journey.days.length, 1)) - 1
  const day = journey.days[dayIndex]
  const demo = Boolean(journey.isDemo || journey.sample || journey.type === 'sample')
  const momentId = params.get('moment') || day?.moments[0]?.id || ''
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sharePath, setSharePath] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const selected = day?.moments.find((moment) => moment.id === momentId) || journey.days.flatMap((item) => item.moments).find((moment) => moment.id === momentId) || day?.moments[0]

  useEffect(() => {
    if (mode !== 'story' || !momentId) return
    document.getElementById(momentId)?.scrollIntoView({ block: 'start' })
  }, [mode, momentId, dayIndex])

  const selectMoment = useCallback((id) => {
    const index = journey.days.findIndex((item) => item.moments.some((moment) => moment.id === id))
    const next = new URLSearchParams(params)
    next.set('day', String((index >= 0 ? index : dayIndex) + 1))
    next.set('moment', id)
    setParams(next)
  }, [dayIndex, journey.days, params, setParams])

  function chooseDay(index) {
    const next = new URLSearchParams(params)
    next.set('day', String(index + 1))
    const first = journey.days[index]?.moments[0]?.id
    if (first) next.set('moment', first)
    setParams(next)
  }

  async function refresh(request) {
    setError('')
    const data = await request()
    if (data.journey) onJourney?.(data.journey)
    return data
  }

  const unanswered = journey.days.reduce(
    (sum, item) => sum + item.moments.reduce((inner, moment) => inner + moment.memories.filter((memory) => memory.answer == null).length, 0),
    0,
  )

  return (
    <div className="page wide">
      <div className="journey-title">
        <div>
          {journey.sample ? <p className="kicker">Sample · Demo</p> : <p className="kicker">{readOnly ? 'Shared storybook' : 'Your journey'}</p>}
          {readOnly || !editing ? <h1>{journey.title}</h1> : <TitleEditor journey={journey} onJourney={onJourney} />}
          <p className="faint">{countNoun(journey.counts.days, 'day')} · {countNoun(journey.counts.photos, 'photo')} · {countNoun(journey.counts.moments, 'moment')}</p>
        </div>
        {readOnly ? null : (
          <div className="row">
            <button className="ghost" type="button" aria-pressed={editing} onClick={() => setEditing((value) => !value)}>{editing ? 'Done' : 'Edit'}</button>
            <button className="ghost" type="button" onClick={() => setShareOpen(true)}>Share Journey</button>
            <button className="ghost" type="button" onClick={() => setDeleteOpen(true)}>Delete</button>
          </div>
        )}
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="ok">{message}</Notice> : null}
      {!readOnly && unanswered ? (
        <p className="muted">A few questions can fill in what the photos leave out. <Link to={paths.interview}>Open Memory Interview</Link></p>
      ) : null}
      <DaySwitch days={journey.days} dayIndex={dayIndex} onChoose={chooseDay} />
      {mode === 'story' ? <StoryDay day={day} days={journey.days} dayIndex={dayIndex} readOnly={readOnly} editing={editing} demo={demo} paths={paths} onSaved={onJourney} onError={setError} /> : null}
      {mode === 'timeline' ? (
        <Timeline
          day={day}
          selectedId={selected?.id}
          onSelect={selectMoment}
          readOnly={readOnly}
          editing={editing}
          demo={demo}
          paths={paths}
          onJourney={onJourney}
          onError={setError}
        />
      ) : null}
      {mode === 'map' ? (
        <MapMode
          journey={journey}
          dayIndex={dayIndex}
          selectedId={selected?.id || ''}
          onSelect={selectMoment}
          demo={demo}
          mapStyle={mapStyle}
          paths={paths}
        />
      ) : null}
      {readOnly || !shareOpen ? null : (
          <dialog className="modal" open>
            <h2>Share this Journey</h2>
            <p>Anyone with this link can view the Story, Timeline and Map.</p>
            <p className="muted">Sharing: {journey.shareActive || sharePath ? 'On' : 'Off'}</p>
            {sharePath ? <p className="panel">{window.location.origin}{sharePath}</p> : <p className="faint">A new link replaces the previous one. Copy it now — it will not be shown again.</p>}
            <div className="actions">
              <button
                className="button"
                type="button"
                disabled={sharing}
                onClick={async () => {
                  setSharing(true)
                  setError('')
                  try {
                    const data = await api(paths.shareApi, { method: 'POST' })
                    setSharePath(data.path)
                    await navigator.clipboard.writeText(`${window.location.origin}${data.path}`)
                    setMessage('Link copied.')
                    onJourney?.({ ...journey, shareActive: true })
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setSharing(false)
                  }
                }}
              >
                {sharePath ? 'Copy link again' : 'Copy Link'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={async () => {
                  try {
                    await api(paths.shareApi, { method: 'DELETE' })
                    setSharePath('')
                    setMessage('Sharing is off.')
                    onJourney?.({ ...journey, shareActive: false })
                  } catch (err) {
                    setError(err.message)
                  }
                }}
              >
                Stop Sharing
              </button>
              <button className="ghost" type="button" onClick={() => setShareOpen(false)}>Close</button>
            </div>
          </dialog>
      )}
      {readOnly || !deleteOpen ? null : (
          <dialog className="modal" open>
            <h2>Delete this journey?</h2>
            <p>The storybook and its photos will be removed from this archive.</p>
            <div className="actions">
              <button
                className="button"
                type="button"
                onClick={async () => {
                  await api(`/api/journeys/${journey.id}`, { method: 'DELETE' })
                  navigate('/')
                }}
              >
                Delete journey
              </button>
              <button className="ghost" type="button" onClick={() => setDeleteOpen(false)}>Cancel</button>
            </div>
          </dialog>
      )}
    </div>
  )
}

function TitleEditor({ journey, onJourney }) {
  const [title, setTitle] = useState(journey.title)
  return (
    <input
      className="title-input"
      aria-label="Journey title"
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={async () => {
        if (title.trim() === journey.title) return
        const data = await api(`/api/journeys/${journey.id}`, { method: 'PATCH', json: { title } })
        onJourney?.(data.journey)
      }}
    />
  )
}

function DaySwitch({ days, dayIndex, onChoose }) {
  if (!days.length) return <Notice>This journey has no days yet.</Notice>
  return (
    <div className="day-switch" role="group" aria-label="Days">
      {days.map((day, index) => (
        <button key={day.id} type="button" aria-pressed={index === dayIndex} onClick={() => onChoose(index)}>
          {formatDayLabel(day.dayNumber, day.date)}
        </button>
      ))}
    </div>
  )
}

function StoryDay({ day, days, dayIndex, readOnly, editing, demo, paths, onSaved, onError }) {
  if (!day) return null
  const blocks = day.storyBlocks
  const next = days[dayIndex + 1]
  return (
    <div className="story-layout">
      <aside>
        <p className="meta">Days</p>
        <ol className="stack">
          {days.map((item) => (
            <li key={item.id}>
              <span className="muted">{formatDayLabel(item.dayNumber, item.date)}</span>
              <div>{item.title}</div>
            </li>
          ))}
        </ol>
      </aside>
      <article className="story-copy">
        <div className="story-prose">
          <p className="meta">{formatWeekday(day.date)}</p>
          <h2>{day.title || 'Untitled day'}</h2>
        </div>
        {blocks?.length ? <StoryBlocks day={day} /> : (
          <>
            {day.moments.map((moment) => (
              <section key={moment.id} id={moment.id} className="anchor story-moment">
                <div className="story-prose stack">
                  <p className="meta">{formatTime(moment.startedAt)} · {moment.title} · <Confidence value={moment.locationConfidence} /></p>
                  <StoryEditor moment={moment} readOnly={readOnly} editing={editing} onSaved={onSaved} onError={onError} />
                  {moment.memories.filter((memory) => memory.answer).map((memory) => (
                    <blockquote className="quote" key={memory.id}>
                      <p className="meta">Memory</p>
                      <p>{memory.answer}</p>
                    </blockquote>
                  ))}
                </div>
                <PhotoGroups photos={moment.photos} />
              </section>
            ))}
            <p className="faint story-prose" style={{ marginTop: '1.5rem' }}>Written from photo times, places, and any notes you added.</p>
          </>
        )}
        {demo && !next ? (
          <footer className="panel stack" style={{ marginTop: '2rem' }}>
            <p className="meta">Sample storybook · Demo content</p>
            <p className="serif">Your trip can become a story like this.</p>
            <Link className="button" to="/create">Create Your Journey</Link>
          </footer>
        ) : null}
        {next ? (
          <p style={{ marginTop: '1.5rem' }}>
            <Link className="text-link" to={`${paths.story}?day=${dayIndex + 2}`}>Next · {formatDayLabel(next.dayNumber, next.date)}</Link>
          </p>
        ) : null}
        <p><Link className="text-link" to={`${paths.timeline}?day=${dayIndex + 1}`}>View this day on the timeline</Link></p>
      </article>
    </div>
  )
}

function StoryBlocks({ day }) {
  const photos = Object.fromEntries(day.moments.flatMap((moment) => moment.photos.map((photo) => [photo.id, { photo, momentId: moment.id }])))
  const anchored = new Set()
  return (
    <div className="story-flow">
      {day.storyBlocks.map((block, index) => {
        const ids = block.type === 'photo' ? [block.photoId] : block.photoIds || []
        const owner = ids.map((id) => photos[id]).find(Boolean)
        const anchor = owner && !anchored.has(owner.momentId) ? owner.momentId : ''
        if (anchor) anchored.add(owner.momentId)
        if (block.type === 'text') return <p className="essay" key={index}>{block.content}</p>
        if (block.type === 'photo' && owner) {
          return <div className="anchor" id={anchor || undefined} key={index}><PhotoFigure photo={owner.photo} /></div>
        }
        return (
          <div className="photo-grid anchor" id={anchor || undefined} key={index}>
            {ids.map((id) => photos[id] ? <PhotoFigure key={id} photo={photos[id].photo} compact /> : null)}
          </div>
        )
      })}
    </div>
  )
}

function StoryEditor({ moment, readOnly, editing, onSaved, onError }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(moment.story || '')
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!editing) setOpen(false)
  }, [editing])
  if (readOnly || !editing || !open) {
    return (
      <div>
        <p className="essay">{moment.story || 'No story has been written for this stop yet.'}</p>
        {readOnly || !editing ? null : (
          <div className="actions">
            <button className="ghost" type="button" onClick={() => { setText(moment.story || ''); setOpen(true) }}>Edit story</button>
            <button
              className="ghost"
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true)
                try {
                  const data = await api(`/api/moments/${moment.id}/story`, { method: 'POST' })
                  onSaved?.(data.journey)
                } catch (err) {
                  onError?.(err.message)
                } finally {
                  setPending(false)
                }
              }}
            >
              Retry story
            </button>
          </div>
        )}
      </div>
    )
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        try {
          const data = await api(`/api/moments/${moment.id}/story`, { method: 'PATCH', json: { story: text } })
          onSaved?.(data.journey)
          setOpen(false)
        } catch (err) {
          onError?.(err.message)
        } finally {
          setPending(false)
        }
      }}
    >
      <label className="stack">
        <span className="meta">Story</span>
        <textarea value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="actions">
        <button className="button" type="submit" disabled={pending}>Save story</button>
        <button className="ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  )
}

function PhotoGroups({ photos }) {
  const groups = groupSimilarPhotos(photos)
  if (!groups.length) return null
  return (
    <div className="story-photos">
      {groups.map((group) => (
        group.length === 1
          ? <PhotoFigure key={group[0].id} photo={group[0]} />
          : (
            <div key={group[0].id} className={`photo-group cols-${Math.min(group.length, 3)}`}>
              {group.map((photo) => <PhotoFigure key={photo.id} photo={photo} compact />)}
            </div>
          )
      ))}
    </div>
  )
}

function groupSimilarPhotos(photos) {
  const sorted = [...(photos || [])].sort((a, b) => String(a.takenAt || '').localeCompare(String(b.takenAt || '')))
  const groups = []
  for (const photo of sorted) {
    const current = groups[groups.length - 1]
    const previous = current?.[current.length - 1]
    if (previous && photosAreSimilar(previous, photo)) current.push(photo)
    else groups.push([photo])
  }
  return groups
}

function photosAreSimilar(a, b) {
  const start = Date.parse(a.takenAt)
  const end = Date.parse(b.takenAt)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  const gap = Math.abs(end - start)
  if (gap > 4 * 60 * 1000) return false
  const meters = photoDistance(a, b)
  if (meters == null) return gap <= 90 * 1000
  return meters <= 150
}

function photoDistance(a, b) {
  const points = [a.latitude, a.longitude, b.latitude, b.longitude]
  if (!points.every((value) => Number.isFinite(value))) return null
  const earth = 6371000
  const lat1 = a.latitude * Math.PI / 180
  const lat2 = b.latitude * Math.PI / 180
  const dLat = (b.latitude - a.latitude) * Math.PI / 180
  const dLng = (b.longitude - a.longitude) * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)))
}

function PhotoFigure({ photo, compact = false }) {
  return (
    <figure className={compact ? 'plate' : 'hero-photo'}>
      <img src={photo.url} alt={photo.alt || photo.filename || 'Travel photograph'} />
      <figcaption>
        <span>{formatCoord(photo.latitude, photo.longitude) || photo.filename || 'Photograph'}</span>
        {photo.credit ? (
          <a href={photo.credit.unsplashUrl || photo.credit.attributionUrl}>Photo: {photo.credit.photographerName || photo.credit.photographer} · Unsplash</a>
        ) : <span>{formatTime(photo.takenAt)}</span>}
      </figcaption>
    </figure>
  )
}

function Timeline({ day, selectedId, onSelect, readOnly, editing, demo, paths, onJourney, onError }) {
  if (!day) return null
  return (
    <div className="timeline-layout">
      <div>
        {day.moments.map((moment) => {
          const open = moment.id === selectedId
          return (
            <article key={moment.id} className={`moment ${open ? 'selected' : ''}`}>
              <button className="moment-button" type="button" aria-expanded={open} onClick={() => onSelect(moment.id)}>
                <span className="spread">
                  <strong>{formatTime(moment.startedAt) || 'Undated'}</strong>
                  <Confidence value={moment.locationConfidence} />
                </span>
                <span className="serif">{moment.title || 'Untitled stop'}</span>
                <span className="faint">{countNoun(moment.photos.length, 'photo')}</span>
              </button>
              {open ? (
                <div className="stack" style={{ marginTop: '0.75rem' }}>
                  <div className="photo-grid">
                    {moment.photos.slice(0, 4).map((photo) => (
                      <img key={photo.id} src={photo.url} alt={photo.filename || 'Travel photograph'} />
                    ))}
                  </div>
                  {moment.memories.filter((memory) => memory.answer).map((memory) => <p key={memory.id}>{memory.answer}</p>)}
                  <p className="faint">{formatCoord(moment.latitude, moment.longitude)} · {confidenceLabel(moment.locationConfidence)}</p>
                  <div className="actions">
                    <Link className="ghost" to={`${paths.story}?day=${day.dayNumber}&moment=${moment.id}`}>View in Story</Link>
                  </div>
                  {readOnly || !editing ? null : (
                    <PlaceEditor moment={moment} onJourney={onJourney} onError={onError} />
                  )}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      <aside className="panel">
        <p className="meta">Selected stop</p>
        <h3>{day.moments.find((moment) => moment.id === selectedId)?.title}</h3>
        <p className="muted">{demo ? 'Demo route based on story locations. The same stops appear on the map.' : 'The map uses the same stops. The line connects photo locations in time order.'}</p>
        <Link className="text-link" to={`${paths.map}?day=${day.dayNumber}&moment=${selectedId || ''}`}>Show on map</Link>
      </aside>
    </div>
  )
}

function PlaceEditor({ moment, onJourney, onError }) {
  const [name, setName] = useState(moment.title || '')
  const [pending, setPending] = useState(false)
  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        try {
          const data = await api(`/api/moments/${moment.id}`, {
            method: 'PATCH',
            json: { title: name, locationConfidence: 'confirmed' },
          })
          onJourney?.(data.journey)
        } catch (err) {
          onError?.(err.message)
        } finally {
          setPending(false)
        }
      }}
    >
      <label className="stack">
        <span className="meta">Place name</span>
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button className="ghost" type="submit" disabled={pending}>Confirm location</button>
      {moment.photos.map((photo) => (
        <button
          key={photo.id}
          className="text-link"
          type="button"
          onClick={async () => {
            try {
              const data = await api(`/api/photos/${photo.id}`, { method: 'DELETE' })
              if (data.journey) onJourney?.(data.journey)
            } catch (err) {
              onError?.(err.message)
            }
          }}
        >
          Remove {photo.filename || 'photo'}
        </button>
      ))}
    </form>
  )
}

function MapMode({ journey, dayIndex, selectedId, onSelect, demo, mapStyle, paths }) {
  const [allDays, setAllDays] = useState(demo)
  const moments = useMemo(() => {
    const source = allDays ? journey.days : journey.days.filter((_, index) => index === dayIndex)
    return source.flatMap((day) => day.moments)
  }, [allDays, dayIndex, journey.days])
  return (
    <div>
      <p className="legend">{demo ? 'Demo route based on story locations.' : 'Reconstructed from photo locations.'}</p>
      <div className="row">
        <button className="ghost" type="button" aria-pressed={allDays} onClick={() => setAllDays((value) => !value)}>
          {allDays ? 'Showing all days' : 'Show all days'}
        </button>
        <Link className="text-link" to={`${paths.timeline}?day=${dayIndex + 1}&moment=${selectedId}`}>Read the timeline</Link>
      </div>
      <div className="map-layout" style={{ marginTop: '1rem' }}>
        <div>
          {moments.map((moment) => (
            <button key={moment.id} className="moment moment-button" type="button" aria-pressed={moment.id === selectedId} onClick={() => onSelect(moment.id)}>
              <span className="spread">
                <strong>{formatTime(moment.startedAt) || 'Undated'}</strong>
                <Confidence value={moment.locationConfidence} />
              </span>
              <span>{moment.title || 'Untitled stop'}</span>
              <span className="faint">{countNoun(moment.photos.length, 'photo')}</span>
            </button>
          ))}
        </div>
        <MapCanvas moments={moments} selectedId={selectedId} onSelect={onSelect} mapStyle={mapStyle} label={demo ? 'Demo route based on story locations' : undefined} />
      </div>
    </div>
  )
}
