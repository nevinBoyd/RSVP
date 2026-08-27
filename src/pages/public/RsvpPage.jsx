import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchCategoriesForEvent } from '../../lib/categories'
import { fetchEventById } from '../../lib/events'
import { fetchSignupsForCategory, submitSignup } from '../../lib/signups'
import { rememberRsvpToken, submitRsvp } from '../../lib/rsvps'

// Route: "/event/:eventId/rsvp"
// Where a resident enters their name, RSVPs (Going / Not Going + optional
// comment), and - as of Phase 5 - picks what they're bringing/volunteering
// for right here in the same form, instead of having to submit the RSVP
// first and then dig up their confirmation link to sign up for anything.
// That's still possible afterward (the edit-RSVP page has the same
// sign-up controls, for changing your mind later), but it's no longer the
// only way in - this is meant to be a simple app for residents who
// shouldn't have to hunt for a second page just to say "I'll bring ice."
//
// Mechanically: the categories/slots are just informational until the
// RSVP itself is submitted (there's no rsvp/token yet to attach a signup
// to). On submit, this first creates the RSVP, then - only if the
// resident is Going - submits one signup per thing they picked, using the
// token the RSVP submission just returned. If the RSVP succeeds but one
// or two signups fail (e.g. someone else claimed the last slot a moment
// earlier), that's reported without discarding the RSVP - they already
// have the edit link to fix it up in the confirmation that follows.
function RsvpPage() {
  const { eventId } = useParams()

  const [event, setEvent] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [categories, setCategories] = useState([])
  const [categorySignups, setCategorySignups] = useState({})

  const [name, setName] = useState('')
  const [status, setStatus] = useState('going')
  const [comment, setComment] = useState('')
  const [itemInputs, setItemInputs] = useState({})
  const [selectedSlots, setSelectedSlots] = useState({})

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmed, setConfirmed] = useState(null)
  const [signupWarnings, setSignupWarnings] = useState([])

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

  useEffect(() => {
    let cancelled = false

    fetchCategoriesForEvent(eventId)
      .then(async (categoryList) => {
        if (cancelled) return
        setCategories(categoryList)

        const signupsByCategory = await Promise.all(
          categoryList.map((c) => fetchSignupsForCategory(c.id)),
        )
        if (cancelled) return

        const map = {}
        categoryList.forEach((c, i) => {
          map[c.id] = signupsByCategory[i]
        })
        setCategorySignups(map)
      })
      // Categories are a nice-to-have on this form - if they fail to
      // load, a resident can still RSVP with just name/status/comment.
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [eventId])

  function toggleSlot(categoryId, slotId) {
    setSelectedSlots((prev) => {
      const current = new Set(prev[categoryId] ?? [])
      if (current.has(slotId)) {
        current.delete(slotId)
      } else {
        current.add(slotId)
      }
      return { ...prev, [categoryId]: current }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)

    try {
      const rsvp = await submitRsvp({ eventId, name, status, comment })
      // So returning on this same device later shows an "Edit Your RSVP"
      // link automatically, without needing the saved link or a name
      // lookup - see the "Find My RSVP" section on the event page for the
      // other ways back in.
      rememberRsvpToken(eventId, rsvp.edit_token)

      const warnings = []
      const confirmedItems = []

      if (status === 'going') {
        for (const category of categories) {
          if (category.category_type === 'open_contribution') {
            const description = (itemInputs[category.id] ?? '').trim()
            if (!description) continue

            try {
              await submitSignup({
                token: rsvp.edit_token,
                categoryId: category.id,
                itemDescription: description,
              })
              confirmedItems.push(`${category.name}: ${description}`)
            } catch (err) {
              warnings.push(`${category.name}: ${err.message}`)
            }
          } else {
            const chosen = selectedSlots[category.id] ?? new Set()
            for (const slot of category.category_slots) {
              if (!chosen.has(slot.id)) continue

              try {
                await submitSignup({
                  token: rsvp.edit_token,
                  categoryId: category.id,
                  slotId: slot.id,
                })
                confirmedItems.push(`${category.name}: ${slot.name}`)
              } catch (err) {
                warnings.push(`${category.name} — ${slot.name}: ${err.message}`)
              }
            }
          }
        }
      }

      setSignupWarnings(warnings)
      setConfirmed({ ...rsvp, items: confirmedItems })
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

        {confirmed.items.length > 0 && (
          <>
            <p>You signed up for:</p>
            <ul className="signup-list">
              {confirmed.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}

        {signupWarnings.length > 0 && (
          <div>
            <p className="form-error">
              A couple of things couldn&apos;t be added (they may have just filled up):
            </p>
            <ul className="signup-list">
              {signupWarnings.map((w) => (
                <li key={w} className="form-error">{w}</li>
              ))}
            </ul>
          </div>
        )}

        <p>
          Need to change your response later? Coming back on this same device (phone, tablet,
          or computer) will show an &quot;Edit Your RSVP&quot; button on the event page
          automatically. From any other device, just go back to the event page and use
          &quot;Find My RSVP&quot; with your name. You can also use this link directly:
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

        {status === 'going' && categories.length > 0 && (
          <div className="category-manage">
            <h2>What Can You Bring or Help With? (optional)</h2>
            {categories.map((category) => {
              const signups = categorySignups[category.id] ?? []

              if (category.category_type === 'open_contribution') {
                const atCapacity =
                  category.max_signups != null && signups.length >= category.max_signups

                return (
                  <div className="category-manage-card" key={category.id}>
                    <strong>{category.name}</strong>
                    {category.description && (
                      <p className="event-meta">{category.description}</p>
                    )}
                    {atCapacity ? (
                      <p className="event-meta">This is full.</p>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Orzo salad"
                        value={itemInputs[category.id] ?? ''}
                        onChange={(e) =>
                          setItemInputs((prev) => ({ ...prev, [category.id]: e.target.value }))
                        }
                      />
                    )}
                  </div>
                )
              }

              return (
                <div className="category-manage-card" key={category.id}>
                  <strong>{category.name}</strong>
                  {category.description && <p className="event-meta">{category.description}</p>}

                  {category.category_slots.map((slot) => {
                    const slotSignups = signups.filter((s) => s.slot_id === slot.id)
                    const full =
                      slot.quantity_needed != null && slotSignups.length >= slot.quantity_needed
                    const checked = (selectedSlots[category.id] ?? new Set()).has(slot.id)

                    return (
                      <label key={slot.id} className="slot-checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={full && !checked}
                          onChange={() => toggleSlot(category.id, slot.id)}
                        />
                        {slot.name}
                        {slot.quantity_needed != null
                          ? ` (${slotSignups.length} / ${slot.quantity_needed}${full ? ' — full' : ''})`
                          : ''}
                        {slot.instructions ? ` — ${slot.instructions}` : ''}
                      </label>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

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
