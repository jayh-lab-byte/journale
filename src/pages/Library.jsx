import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formatRange } from '../lib/format.js'
import { samples } from '../samples.js'

export function Library() {
  const [journeys, setJourneys] = useState([])

  function load() {
    api('/api/journeys')
      .then((data) => setJourneys(data.journeys || []))
      .catch(() => setJourneys([]))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="kicker">Journale</p>
          <h1>Turn your camera roll into the story you remember.</h1>
          <p className="lede">Upload the photos from one trip. Journale reads the dates and places on your device, then rebuilds the days, moments, and story.</p>
          <div className="actions">
            <Link className="button" to="/create">Create Journey</Link>
            <a className="ghost" href="#samples">Sample Storybooks</a>
          </div>
          <p className="faint">Preview locally before upload. Private by default — your journey is not shared unless you choose to share it.</p>
        </div>
        <figure className="card">
          <img src={samples[0].cover} alt="" />
          <figcaption className="card-body">
            <p className="meta">Demo</p>
            <p>{samples[0].title}</p>
            <p className="faint">Photo: {samples[0].coverCredit.photographerName} · Unsplash</p>
          </figcaption>
        </figure>
      </section>

      {journeys.length > 0 ? (
        <>
          <div className="section-head">
            <h2>My Journeys</h2>
          </div>
          <div className="card-grid">
            {journeys.map((journey) => (
              <article className="card" key={journey.id}>
                {journey.coverUrl ? <img src={journey.coverUrl} alt="" /> : <div className="fallback" style={{ aspectRatio: '16/10', background: '#f0ece1' }} />}
                <div className="card-body stack">
                  <p className="meta">{formatRange(journey.startedAt, journey.endedAt) || journey.status}</p>
                  <h3>{journey.title}</h3>
                  <p className="muted">{journey.counts.days} days · {journey.counts.photos} photos · {journey.counts.moments} moments</p>
                  <Link className="ghost" to={`/journeys/${journey.id}`}>Open Journey</Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      <div className="section-head" id="samples">
        <div>
          <p className="kicker">Demo</p>
          <h2>Sample Storybooks</h2>
        </div>
      </div>
      <p className="muted">Curated editions so you can see a finished storybook. These are not your photos.</p>
      <div className="card-grid samples">
        {samples.map((sample) => (
          <article className="card" key={sample.slug}>
            <img src={sample.cover} alt="" />
            <div className="card-body sample-body">
              <div className="stack">
                <p className="meta"><span className="badge sample">Demo</span> {sample.location}</p>
                <h3>{sample.title}</h3>
                <p className="muted">{sample.theme}</p>
              </div>
              <div className="card-foot stack">
                <p className="faint">{sample.duration} days · {sample.photoCount} photos</p>
                <Link className="ghost" to={`/samples/${sample.slug}`}>Open Sample</Link>
                <a className="faint" href={sample.coverCredit.unsplashUrl}>Photo: {sample.coverCredit.photographerName} · Unsplash</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
