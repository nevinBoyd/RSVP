import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllEventsForAdmin } from '../../lib/events'

// Route: "/admin"
// Lists every event the admin has created. Phase 3 keeps this simple
// (title, date, status, link to edit) - RSVP counts, close/reopen, and
// delete actions come with the admin controls phase later on.
function AdminDashboardPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchAllEventsForAdmin()
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>

      <p>
        <Link to="/admin/event/new">+ Create New Event</Link>
      </p>

      {loading && <p>Loading events…</p>}
      {error && <p className="form-error">Couldn&apos;t load events: {error}</p>}
      {!loading && !error && events.length === 0 && <p>No events yet.</p>}

      {!loading && !error && events.length > 0 && (
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id} className="event-card">
              <Link to={`/admin/event/${event.id}`}>{event.title}</Link>
              <span className="event-meta">
                {event.event_date} · {event.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AdminDashboardPage
