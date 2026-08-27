import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEventById } from '../../lib/events'
import { fetchPublicRsvps } from '../../lib/rsvps'

// Route: "/event/:eventId"
// The main public page for a single event: core details, an RSVP button
// (when the event is open), and a "Who's Coming" list. Flyer image and
// category navigation are added in later phases.
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

  const [rsvps, setRsvps] = useState([])
  const [rsvpsLoading, setRsvpsLoading] = useState(true)

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

  useEffect(() => {
    let cancelled = false

    fetchPublicRsvps(eventId)
      .then((data) => {
        if (!cancelled) setRsvps(data)
      })
      // Who's Coming is a nice-to-have, not core to the page - if it fails
      // to load, just leave the list empty rather than showing an error.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRsvpsLoading(false)
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

  const goingCount = rsvps.length

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

      {event.status === 'open' && (
        <p>
          <Link to={`/event/${eventId}/rsvp`} className="button-link">
            RSVP to this event
          </Link>
        </p>
      )}
      {event.status === 'closed' && <p className="event-meta">RSVPs are closed for this event.</p>}

      {!rsvpsLoading && goingCount > 0 && (
        <div className="whos-coming">
          <h2>Who&apos;s Coming ({goingCount})</h2>
          <ul>
            {rsvps.map((r) => (
              <li key={r.id}>
                {r.name}
                {event.show_comments_publicly && r.comment ? ` — ${r.comment}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default PublicEventPage
