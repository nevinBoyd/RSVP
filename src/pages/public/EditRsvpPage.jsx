import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { cancelRsvpByToken, fetchRsvpByToken, updateRsvpByToken } from '../../lib/rsvps'

// Route: "/event/:eventId/edit-rsvp/:token"
// A resident reaches this page via their unique edit link (no account
// needed - the token in the URL is the only credential). From here they
// can change Going/Not Going, edit their comment, or remove their RSVP
// entirely. The event id in the URL is only used for the "not found"
// fallback link back to the event; the token alone is what the
// get/update/cancel functions actually authorize against.
function EditRsvpPage() {
  const { eventId, token } = useParams()

  const [rsvp, setRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [status, setStatus] = useState('going')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [removed, setRemoved] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchRsvpByToken(token)
      .then((data) => {
        if (cancelled) return
        setRsvp(data)
        setStatus(data.status)
        setComment(data.comment ?? '')
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSave(e) {
    e.preventDefault()
    setSaveError('')
    setSaved(false)
    setSaving(true)

    try {
      const updated = await updateRsvpByToken(token, { status, comment })
      setRsvp((prev) => ({ ...prev, status: updated.status, comment: updated.comment }))
      setSaved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm("Remove your RSVP entirely? This can't be undone.")) return

    setSaveError('')
    setSaving(true)

    try {
      await cancelRsvpByToken(token)
      setRemoved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading your RSVP…</p>
      </div>
    )
  }

  if (loadError || !rsvp) {
    return (
      <div className="page">
        <h1>RSVP Not Found</h1>
        <p>{loadError || "We couldn't find that RSVP. The link may be invalid."}</p>
        {eventId && <p><a href={`/event/${eventId}`}>Back to the event</a></p>}
      </div>
    )
  }

  if (removed) {
    return (
      <div className="page">
        <h1>RSVP Removed</h1>
        <p>
          Your RSVP for {rsvp.event_title} has been removed. You&apos;re welcome to RSVP
          again anytime before the event closes.
        </p>
        <p><a href={`/event/${rsvp.event_id}`}>Back to the event</a></p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Edit Your RSVP</h1>
      <p className="event-meta">
        {rsvp.event_title} · {rsvp.event_date}
      </p>

      <form onSubmit={handleSave} className="form">
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

        {saveError && <p className="form-error">{saveError}</p>}
        {saved && !saveError && <p className="form-success">Saved.</p>}

        <div className="form-actions form-actions-split">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={saving}
            className="button-danger"
          >
            Remove My RSVP
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditRsvpPage

