import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchEventById } from '../../lib/events'
import { submitRsvp } from '../../lib/rsvps'

// Route: "/event/:eventId/rsvp"
// Where a resident enters their name and RSVPs (Going / Not Going +
// optional comment). No login required - the event-must-be-open check and
// the duplicate-name check both happen server-side in the submit_rsvp
// Postgres function, not just here, so this form can't be bypassed by
// calling the API directly with a closed event or a duplicate name.
function RsvpPage() {
  const { eventId } = useParams()

  const [event, setEvent] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [name, setName] = useState('')
  const [status, setStatus] = useState('going')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmed, setConfirmed] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchEventById(eventId)
      .then((data) => {
        if (!cancelled) setEvent(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingEvent(false)
      })

    return () => {
      cancelled = true
    }
  }, [eventId])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)

    try {
      const rsvp = await submitRsvp({ eventId, name, status, comment })
      setConfirmed(rsvp)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEvent) {
    return (
      <div className="page">
        <p>Loading event…</p>
      </div>
    )
  }

  if (loadError || !event) {
    return (
      <div className="page">
        <h1>Event Not Found</h1>
        <p>We couldn&apos;t find that event.</p>
      </div>
    )
  }

  if (event.status !== 'open') {
    return (
      <div className="page">
        <h1>RSVPs Not Open</h1>
        <p>This event isn&apos;t currently accepting RSVPs.</p>
      </div>
    )
  }

  if (confirmed) {
    const editUrl = `${window.location.origin}/event/${eventId}/edit-rsvp/${confirmed.edit_token}`

    return (
      <div className="page">
        <h1>You&apos;re All Set</h1>
        <p>
          Thanks, {confirmed.name}! We&apos;ve recorded you as{' '}
          <strong>{confirmed.status === 'going' ? 'Going' : 'Not Going'}</strong> to{' '}
          {event.title}.
        </p>
        <p>
          Need to change your response later? Save this link — it&apos;s the only way to
          edit or cancel your RSVP:
          <br />
          <a href={editUrl}>{editUrl}</a>
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>RSVP — {event.title}</h1>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Your name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <fieldset>
          <legend>Will you be attending?</legend>
          <label>
            <input
              type="radio"
              name="status"
              value="going"
              checked={status === 'going'}
              onChange={() => setStatus('going')}
            />
            Going
          </label>
          <label>
            <input
              type="radio"
              name="status"
              value="not_going"
              checked={status === 'not_going'}
              onChange={() => setStatus('not_going')}
            />
            Not Going
          </label>
        </fieldset>

        <label>
          Comment (optional)
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </label>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit RSVP'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RsvpPage
