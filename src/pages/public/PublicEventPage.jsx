import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchCategoriesForEvent } from '../../lib/categories'
import { fetchEventById } from '../../lib/events'
import { findRsvpToken, fetchPublicRsvps, getRememberedRsvpToken } from '../../lib/rsvps'

// Route: "/event/:eventId"
// The main public page for a single event: core details, an RSVP button
// (when the event is open), a "Who's Coming" list, and links into each
// category (what to bring / volunteer slots). Flyer image is added in a
// later phase.
//
// If someone hits this URL for a draft event (or a bad/old id), the
// database's Row Level Security policy simply won't return a row for an
// anonymous visitor - that shows up here as "not found", not an error,
// which is the correct behavior for something that isn't published yet.
//
// Getting back to an existing RSVP: this page checks localStorage first
// (set when the RSVP was submitted on this device - see
// rememberRsvpToken in lib/rsvps.js) and shows a direct "Edit Your RSVP"
// link if found. Otherwise there's a "Find My RSVP" box that looks a
// resident up by name - deliberately not requiring a saved link or an
// email address, since residents realistically won't keep either. See
// the comment on find_rsvp_token() in
// supabase/migrations/004_find_rsvp.sql for the trade-off that involves.
function PublicEventPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [rsvps, setRsvps] = useState([])
  const [rsvpsLoading, setRsvpsLoading] = useState(true)

  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Reading localStorage doesn't need an effect - it's a synchronous
  // lookup, not a subscription to an external system - so useMemo (which
  // just recomputes when eventId changes) is enough. It naturally picks
  // up a token forgotten via EditRsvpPage's "Remove My RSVP" too, since
  // that navigates back here as a fresh mount.
  const rememberedToken = useMemo(() => getRememberedRsvpToken(eventId), [eventId])
  const [findName, setFindName] = useState('')
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState('')

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

  useEffect(() => {
    let cancelled = false

    fetchCategoriesForEvent(eventId)
      .then((data) => {
        if (!cancelled) setCategories(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [eventId])

  async function handleFindRsvp() {
    const trimmed = findName.trim()
    if (!trimmed) return

    setFindError('')
    setFinding(true)

    try {
      const token = await findRsvpToken(eventId, trimmed)
      if (token) {
        navigate(`/event/${eventId}/edit-rsvp/${token}`)
      } else {
        setFindError(
          "We couldn't find an RSVP under that name. Check the spelling, or RSVP above if you haven't yet.",
        )
      }
    } catch (err) {
      setFindError(err.message)
    } finally {
      setFinding(false)
    }
  }

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
        <>
          <p>
            {rememberedToken ? (
              <Link to={`/event/${eventId}/edit-rsvp/${rememberedToken}`} className="button-link">
                Edit Your RSVP
              </Link>
            ) : (
              <Link to={`/event/${eventId}/rsvp`} className="button-link">
                RSVP to this event
              </Link>
            )}
          </p>

          <div className="find-rsvp">
            <p className="event-meta">
              {rememberedToken
                ? 'Not you? Find another RSVP by name:'
                : "Already RSVP'd on a different device? Find your RSVP by name:"}
            </p>
            <div className="inline-form">
              <input
                type="text"
                placeholder="Your name"
                value={findName}
                onChange={(e) => setFindName(e.target.value)}
              />
              <button type="button" onClick={handleFindRsvp} disabled={finding || !findName.trim()}>
                {finding ? 'Looking…' : 'Find My RSVP'}
              </button>
            </div>
            {findError && <p className="form-error">{findError}</p>}
          </div>
        </>
      )}
      {event.status === 'closed' && <p className="event-meta">RSVPs are closed for this event.</p>}

      {!categoriesLoading && categories.length > 0 && (
        <div className="whos-coming">
          <h2>What&apos;s Needed</h2>
          <p className="event-meta">Pick what you&apos;d like to bring or help with when you RSVP.</p>
          <ul className="event-list">
            {categories.map((category) => (
              <li key={category.id} className="event-card">
                <Link to={`/event/${eventId}/category/${category.id}`}>{category.name}</Link>
                <span className="event-meta">
                  {category.category_type === 'open_contribution'
                    ? 'Open sign-up'
                    : `${category.category_slots.length} slot${category.category_slots.length === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
