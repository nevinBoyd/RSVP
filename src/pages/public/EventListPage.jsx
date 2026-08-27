import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublishedEvents } from '../../lib/events'

// Route: "/"
// Shows current/upcoming events to the public. No login required.
// Only events with status "open" or "closed" ever reach this list -
// drafts are filtered out both here and (as a backstop) by the database's
// Row Level Security policy, so a draft can't leak even if this query
// changes later.
function EventListPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchPublishedEvents()
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
      <h1>Upcoming Events</h1>

      {loading && <p>Loading events…</p>}
      {error && <p className="form-error">Couldn&apos;t load events: {error}</p>}
      {!loading && !error && events.length === 0 && (
        <p>No upcoming events right now — check back soon.</p>
      )}

      {!loading && !error && events.length > 0 && (
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id} className="event-card">
              <Link to={`/event/${event.id}`}>{event.title}</Link>
              <span className="event-meta">{event.event_date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default EventListPage
