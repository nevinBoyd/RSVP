import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchEventById } from '../../lib/events'

// Route: "/event/:eventId"
// The main public page for a single event. Phase 3 shows the core
// details fetched from the database; flyer, RSVP button, Who's Coming
// list, and category navigation are added in later phases.
//
// If someone hits this URL for a draft event (or a bad/old id), the
// database's Row Level Security policy simply won't return a row for an
// anonymous visitor - that shows up here as "not found", not an error,
// which is the correct behavior for something that isn't published yet.
function PublicEventPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchEventById(eventId)
      .then((data) => {
        if (!cancelled) setEvent(data)
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
  }, [eventId])

  if (loading) {
    return (
      <div className="page">
        <p>Loading event…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="page">
        <h1>Event Not Found</h1>
        <p>We couldn&apos;t find that event.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>{event.title}</h1>
      <p className="event-meta">
        {event.event_date}
        {event.start_time ? ` · ${event.start_time}` : ''}
        {event.end_time ? ` – ${event.end_time}` : ''}
      </p>
      {event.location_name && <p>{event.location_name}</p>}
      {event.address && <p>{event.address}</p>}
      {event.notes && <p className="event-notes">{event.notes}</p>}
    </div>
  )
}

export default PublicEventPage

