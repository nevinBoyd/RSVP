import { Link, Outlet } from 'react-router-dom'

// Wraps every admin page. Kept visually/structurally separate from the
// public layout. Real auth-gating gets added when the backend/login is built;
// for now this is just the shared shell for admin pages.
function AdminLayout() {
  return (
    <div className="app-shell admin-shell">
      <header className="site-header admin-header">
        <Link to="/admin" className="site-title">
          Admin
        </Link>
        <nav className="admin-nav">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/event/new">New Event</Link>
        </nav>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
