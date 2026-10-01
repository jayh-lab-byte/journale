import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { confidenceLabel, countNoun, formatCoord, formatTime } from '../lib/format.js'

const DEFAULT_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function MapCanvas({ moments, selectedId, onSelect, mapStyle, label }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    const map = new maplibregl.Map({
      container: ref.current,
      style: mapStyle || DEFAULT_STYLE,
      center: [10, 25],
      zoom: 1.4,
      attributionControl: true,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      map.remove()
    }
  }, [mapStyle])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      const located = moments.filter((moment) => Number.isFinite(moment.latitude) && Number.isFinite(moment.longitude))
      if (map.getLayer('route')) map.removeLayer('route')
      if (map.getSource('route')) map.removeSource('route')
      if (!located.length) return
      located.forEach((moment, index) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = String(index + 1)
        button.setAttribute('aria-label', `${moment.title || 'Stop'}, ${confidenceLabel(moment.locationConfidence)}`)
        button.style.minWidth = '32px'
        button.style.minHeight = '32px'
        button.style.border = moment.id === selectedId ? '1px solid #1f1e1d' : '1px solid #d9d5cd'
        button.style.background = moment.id === selectedId ? '#1f1e1d' : '#fcfbfa'
        button.style.color = moment.id === selectedId ? '#fcfbfa' : '#1f1e1d'
        button.style.borderRadius = '2px'
        const marker = new maplibregl.Marker({ element: button })
          .setLngLat([moment.longitude, moment.latitude])
          .addTo(map)
        button.addEventListener('click', () => onSelect(moment.id))
        markersRef.current.push(marker)
      })
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: located.map((moment) => [moment.longitude, moment.latitude]),
          },
        },
      })
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#b85024', 'line-width': 2 },
      })
      const bounds = new maplibregl.LngLatBounds()
      located.forEach((moment) => bounds.extend([moment.longitude, moment.latitude]))
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 })
    }
    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)
  }, [moments, selectedId, onSelect])

  const selected = moments.find((moment) => moment.id === selectedId) || moments[0]

  return (
    <>
      <div className="map-wrap">
        <div ref={ref} className="map-canvas" role="region" aria-label={label || 'Reconstructed photo locations'} />
      </div>
      {selected ? (
        <article className="sheet">
          <p className="meta">{formatTime(selected.startedAt)} · {confidenceLabel(selected.locationConfidence)}</p>
          <h3>{selected.title || 'Untitled stop'}</h3>
          <p className="faint">{formatCoord(selected.latitude, selected.longitude)}</p>
          <p className="muted">{countNoun(selected.photos?.length || 0, 'photo')}</p>
        </article>
      ) : (
        <p className="sheet">No photo locations for this day. The timeline still lists every stop.</p>
      )}
    </>
  )
}
