import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createEvent, deleteEvent, fetchEventById, updateEvent } from '../../lib/events'

// Routes: "/admin/event/new" and "/admin/event/:eventId"
// Create/Edit Event page. When eventId is present we're editing an
// existing event (fetch + prefill); otherwise we're creating a new one.
//
// Phase 3 scope: title, date/time, location, address, notes, and status
// only. Flyer image is deliberately left out - it needs its own upload
// UI and is planned as a separate phase. Delete was added alongside edit
// since there was no other way to remove a test/mistaken event from the
// admin side. Category management (Phase 5) lives on its own page,
// linked from here once an event exists to edit.
const emptyForm = {
  title: '',
  event_date: '',
  start_time: '',
  end_time: '',
  location_name: '',
  address: '',
  notes: '',
  status: 'draft',
}

function EventFormPage() {
  const { eventId } = useParams()
  const isEditing = Boolean(eventId)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) return

    let cancelled = false

    fetchEventById(eventId)
      .then((event) => {
        if (cancelled) return
        setForm({
          title: event.title ?? '',
          event_date: event.event_date ?? '',
          start_time: event.start_time ?? '',
          end_time: event.end_time ?? '',
          location_name: event.location_name ?? '',
          address: event.address ?? '',
          notes: event.notes ?? '',
          status: event.status ?? 'draft',
        })
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
  }, [eventId, isEditing])

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = {
        ...form,
        // Empty string end_time would fail the "time" column type -
        // Postgres wants either a real time value or null.
        end_time: form.end_time || null,
      }

      if (isEditing) {
        await updateEvent(eventId, payload)
        navigate(`/admin/event/${eventId}`)
      } else {
        const created = await createEvent(payload)
        navigate(`/admin/event/${created.id}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${form.title || 'this event'}"? This also removes every RSVP for it. This can't be undone.`,
    )
    if (!confirmed) return

    setError('')
    setDeleting(true)

    try {
      await deleteEvent(eventId)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading event…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>{isEditing ? 'Edit Event' : 'Create Event'}</h1>

      {isEditing && (
        <p>
          <Link to={`/admin/event/${eventId}/categories`}>Manage Categories &amp; Sign-ups</Link>
        </p>
      )}

      <form onSubmit={handleSubmit} className="form">
        <label>
          Event title
          <input type="text" value={form.title} onChange={handleChange('title')} required />
        </label>

        <label>
          Date
          <input
            type="date"
            value={form.event_date}
            onChange={handleChange('event_date')}
            required
          />
        </label>

        <label>
          Start time
          <input type="time" value={form.start_time} onChange={handleChange('start_time')} />
        </label>

        <label>
          End time (optional)
          <input type="time" value={form.end_time} onChange={handleChange('end_time')} />
        </label>

        <label>
          Location name
          <input
            type="text"
            value={form.location_name}
            onChange={handleChange('location_name')}
          />
        </label>

        <label>
          Address
          <input type="text" value={form.address} onChange={handleChange('address')} />
        </label>

        <label>
          Notes / description
          <textarea value={form.notes} onChange={handleChange('notes')} rows={4} />
        </label>

        <label>
          Status
          <select value={form.status} onChange={handleChange('status')}>
            <option value="draft">Draft (not public yet)</option>
            <option value="open">Open (public, accepting RSVPs)</option>
            <option value="closed">Closed (public, RSVPs closed)</option>
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions form-actions-split">
          <button type="submit" disabled={saving || deleting}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Event'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="button-danger"
            >
              {deleting ? 'Deleting…' : 'Delete Event'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default EventFormPage
