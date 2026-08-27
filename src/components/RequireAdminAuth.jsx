import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Route guard for everything under /admin (except /admin/login itself).
// Renders the nested admin routes only if a Supabase Auth session exists;
// otherwise redirects to the login page and remembers where the visitor
// was trying to go, so login can send them back afterward.
function RequireAdminAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page">
        <p>Checking login…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default RequireAdminAuth
