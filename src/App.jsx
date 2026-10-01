import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell.jsx'
import { api } from './lib/api.js'
import { Library } from './pages/Library.jsx'
import { Create } from './pages/Create.jsx'
import { Reconstruct } from './pages/Reconstruct.jsx'
import { JourneyPage } from './pages/JourneyPage.jsx'
import { Interview } from './pages/Interview.jsx'

const DEFAULT_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function App() {
  const [mapStyle, setMapStyle] = useState(DEFAULT_STYLE)

  useEffect(() => {
    api('/api/config')
      .then((data) => {
        if (data.mapStyle) setMapStyle(data.mapStyle)
      })
      .catch(() => {})
  }, [])

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/create" element={<Create />} />
        <Route path="/reconstruct" element={<Reconstruct />} />
        <Route path="/journeys/:id" element={<JourneyPage mapStyle={mapStyle} />} />
        <Route path="/journeys/:id/timeline" element={<JourneyPage mode="timeline" mapStyle={mapStyle} />} />
        <Route path="/journeys/:id/map" element={<JourneyPage mode="map" mapStyle={mapStyle} />} />
        <Route path="/journeys/:id/interview" element={<Interview />} />
        <Route path="/samples/:slug" element={<JourneyPage source="sample" mapStyle={mapStyle} />} />
        <Route path="/samples/:slug/timeline" element={<JourneyPage source="sample" mode="timeline" mapStyle={mapStyle} />} />
        <Route path="/samples/:slug/map" element={<JourneyPage source="sample" mode="map" mapStyle={mapStyle} />} />
        <Route path="/share/:token" element={<JourneyPage source="share" mapStyle={mapStyle} />} />
        <Route path="/share/:token/timeline" element={<JourneyPage source="share" mode="timeline" mapStyle={mapStyle} />} />
        <Route path="/share/:token/map" element={<JourneyPage source="share" mode="map" mapStyle={mapStyle} />} />
        <Route path="*" element={<div className="page"><h1>Page not found</h1></div>} />
      </Routes>
    </Shell>
  )
}
