import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wraps every admin page. Kept visually/structurally separate from the
// public layout. Only rendered once RequireAdminAuth has confirmed a
// logged-in session, so it's safe to assume `user` is set here.
function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

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
        <div className="admin-account">
          {user?.email && <span className="admin-email">{user.email}</span>}
          <button type="button" onClick={handleLogout} className="logout-button">
            Log Out
          </button>
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
