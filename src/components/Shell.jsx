import { NavLink } from 'react-router-dom'

export function Shell({ children }) {
  return (
    <>
      <a className="skip" href="#content">Skip to content</a>
      <header className="site-header">
        <NavLink to="/" className="wordmark">Journale</NavLink>
        <nav className="desktop-nav" aria-label="Primary">
          <NavLink to="/" end>Library</NavLink>
          <NavLink to="/create">Create Journey</NavLink>
          <a href="/#samples">Sample Storybooks</a>
        </nav>
      </header>
      <main id="content">{children}</main>
      <nav className="tabbar" aria-label="Mobile">
        <NavLink to="/" end>Library</NavLink>
        <NavLink to="/create">Create</NavLink>
      </nav>
    </>
  )
}

export function Notice({ tone = '', children }) {
  return <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function Confidence({ value }) {
  return <span className={`badge ${value === 'confirmed' ? 'confirmed' : ''}`}>{value === 'confirmed' ? 'Confirmed' : value === 'estimated' ? 'Estimated' : 'Unknown'}</span>
}
