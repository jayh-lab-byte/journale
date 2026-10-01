import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupportedPhoto, readPhotoMeta } from '../lib/exif.js'
import { setDraft } from '../lib/draft.js'
import { formatCoord, formatTime } from '../lib/format.js'
import { Notice } from '../components/Shell.jsx'

export function Create() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [hot, setHot] = useState(false)
  const [message, setMessage] = useState('')

  async function addFiles(list) {
    const incoming = [...list]
    const rejected = []
    const oversized = []
    const accepted = []
    for (const file of incoming) {
      if (file.size > 40 * 1024 * 1024) {
        oversized.push(file.name)
        continue
      }
      if (!isSupportedPhoto(file)) {
        rejected.push(file.name)
        continue
      }
      const meta = await readPhotoMeta(file)
      let preview = ''
      if (file.type.startsWith('image/jpeg') || file.type.startsWith('image/png')) preview = URL.createObjectURL(file)
      accepted.push({
        key: crypto.randomUUID(),
        file,
        preview,
        meta,
        name: file.name,
      })
    }
    setItems((current) => [...current, ...accepted])
    if (oversized.length) setMessage(`${oversized.length} photo${oversized.length === 1 ? '' : 's'} skipped. Each original photo needs to be under 40 MB.`)
    else if (rejected.length) setMessage(`${rejected.length} file${rejected.length === 1 ? '' : 's'} skipped. Use JPG, PNG, or HEIC.`)
    else setMessage('')
  }

  function remove(key) {
    setItems((current) => {
      const item = current.find((entry) => entry.key === key)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return current.filter((entry) => entry.key !== key)
    })
  }

  const summary = useMemo(() => {
    const dated = items.map((item) => item.meta.takenAt).filter(Boolean).sort()
    const located = items.filter((item) => Number.isFinite(item.meta.latitude)).length
    return { dated: dated.length, located, start: dated[0], end: dated.at(-1) }
  }, [items])

  return (
    <div className="page">
      <p className="kicker">Create Journey</p>
      <h1>Choose the photos from one trip.</h1>
      <p className="lede">Dates and places are read on this device before anything is uploaded. You do not need to name the trip first.</p>
      <div
        className={`dropzone ${hot ? 'hot' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setHot(true) }}
        onDragLeave={() => setHot(false)}
        onDrop={(event) => {
          event.preventDefault()
          setHot(false)
          addFiles(event.dataTransfer.files)
        }}
      >
        <div className="stack">
          <p>Drop photos here, or choose them from your library.</p>
          <label className="button">
            Select photos
            <input
              className="file-input"
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
              multiple
              onChange={(event) => {
                addFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </label>
          <p className="faint">JPG and PNG work best. Originals are read on this device, then shown at up to 1920 pixels wide. HEIC is attempted, and a photo that cannot be read is skipped without failing the journey.</p>
        </div>
      </div>
      {message ? <Notice>{message}</Notice> : null}
      {items.length ? (
        <>
          <div className="section-head">
            <h2>{items.length} selected</h2>
            <p className="muted">{summary.dated} with dates · {summary.located} with locations</p>
          </div>
          <div className="preview-grid">
            {items.map((item) => (
              <article className="thumb" key={item.key}>
                {item.preview ? <img src={item.preview} alt="" /> : <div className="fallback">{item.name}</div>}
                <button type="button" onClick={() => remove(item.key)} aria-label={`Remove ${item.name}`}>Remove</button>
                <p className="faint" style={{ padding: '0.4rem 0.5rem' }}>
                  {formatTime(item.meta.takenAt) || 'No date'} {item.meta.latitude ? `· ${formatCoord(item.meta.latitude, item.meta.longitude)}` : '· No GPS'}
                </p>
              </article>
            ))}
          </div>
          <div className="actions">
            <button
              className="button"
              type="button"
              onClick={() => {
                setDraft(items)
                navigate('/reconstruct')
              }}
            >
              Reconstruct Journey
            </button>
          </div>
        </>
      ) : (
        <p className="muted">No photos selected yet.</p>
      )}
      <p><Link className="text-link" to="/#samples">Not ready yet? Open a sample storybook</Link></p>
      <p className="faint">Photo metadata is read on your device before reconstruction begins.</p>
    </div>
  )
}
