import { useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { getSample } from '../samples.js'
import { JourneyScreen } from '../components/JourneyScreen.jsx'
import { Notice } from '../components/Shell.jsx'

export function JourneyPage({ mode = 'story', source = 'owner', mapStyle }) {
  const { id, slug, token } = useParams()
  const sample = source === 'sample' ? getSample(slug) : null
  const [journey, setJourney] = useState(sample?.journey || null)
  const [status, setStatus] = useState(sample ? 'ready' : 'loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (source === 'sample') {
      if (!sample) {
        setStatus('missing')
        return
      }
      setJourney(sample.journey)
      setStatus('ready')
      return
    }
    const path = source === 'share' ? `/api/shared/${token}` : `/api/journeys/${id}`
    setStatus('loading')
    api(path)
      .then((data) => {
        setJourney(data.journey)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [source, id, slug, token, sample])

  const paths = source === 'sample'
    ? { story: `/samples/${slug}`, timeline: `/samples/${slug}/timeline`, map: `/samples/${slug}/map` }
    : source === 'share'
      ? { story: `/share/${token}`, timeline: `/share/${token}/timeline`, map: `/share/${token}/map` }
      : {
          story: `/journeys/${id}`,
          timeline: `/journeys/${id}/timeline`,
          map: `/journeys/${id}/map`,
          interview: `/journeys/${id}/interview`,
          shareApi: `/api/journeys/${id}/share`,
        }

  if (status === 'loading') return <div className="page"><p role="status">Loading storybook…</p></div>
  if (status === 'missing') return <div className="page"><Notice tone="error">Sample storybook not found.</Notice></div>
  if (status === 'error') return <div className="page"><Notice tone="error">{error}</Notice></div>

  return (
    <>
      <nav className="subnav" aria-label="Storybook">
        <NavLink to={paths.story} end>Story</NavLink>
        <NavLink to={paths.timeline}>Timeline</NavLink>
        <NavLink to={paths.map}>Map</NavLink>
      </nav>
      <JourneyScreen journey={journey} mode={mode} paths={paths} mapStyle={mapStyle} onJourney={setJourney} />
    </>
  )
}
