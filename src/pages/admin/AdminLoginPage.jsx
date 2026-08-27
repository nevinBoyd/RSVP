import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Route: "/admin/login"
// The only place the admin logs in. Residents never see this.
function AdminLoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If RequireAdminAuth redirected here from a specific admin page, send
  // the admin back there after a successful login. Otherwise land on the
  // dashboard.
  const redirectTo = location.state?.from?.pathname ?? '/admin'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: signInError } = await signIn(email, password)

    setSubmitting(false)

    if (signInError) {
      setError('Incorrect email or password.')
      return
    }

    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="page login-page">
      <h1>Admin Login</h1>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log In'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminLoginPage
