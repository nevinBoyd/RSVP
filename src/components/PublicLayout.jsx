import { Link, Outlet } from 'react-router-dom'

// Wraps every public (resident-facing) page. Residents never see admin
// login/navigation controls from here.
function PublicLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="site-title">
          Community Events
        </Link>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout
