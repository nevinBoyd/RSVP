import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchCategoriesForEvent } from '../../lib/categories'
import {
  cancelRsvpByToken,
  fetchRsvpByToken,
  forgetRsvpToken,
  updateRsvpByToken,
} from '../../lib/rsvps'
import { fetchSignupsForCategory, removeSignup, submitSignup } from '../../lib/signups'

// Route: "/event/:eventId/edit-rsvp/:token"
// A resident reaches this page via their unique edit link (no account
// needed - the token in the URL is the only credential). From here they
// can change Going/Not Going, edit their comment, remove their RSVP
// entirely, and - new in Phase 5 - sign up for categories (bring an item,
// claim a slot, volunteer) using that same token. The event id in the
// URL is only used for the "not found" fallback link back to the event;
// the token alone is what every get/update/cancel/submit/remove function
// actually authorizes against.
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

  // Categories the resident can sign up for, plus who's already signed up
  // for each one (keyed by category id) so slot capacity and "you already
  // claimed this" can be shown without a second round trip per action.
  const [categories, setCategories] = useState([])
  const [categorySignups, setCategorySignups] = useState({})
  // Starts true so the "loading" gate holds from first render - the
  // effect below only flips it false (in a finally), it never needs to
  // set it back to true, since it only ever runs once per rsvp/token.
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [signupError, setSignupError] = useState('')
  const [signupBusyKey, setSignupBusyKey] = useState('')
  const [itemInputs, setItemInputs] = useState({})

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

  // Categories only matter while the RSVP is "going" on an "open" event -
  // load them (and their current signups) once we know that's the case.
  useEffect(() => {
    if (!rsvp || rsvp.status !== 'going' || rsvp.event_status !== 'open') return

    let cancelled = false

    fetchCategoriesForEvent(rsvp.event_id)
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
      .catch(() => {
        // Category sign-ups are a nice-to-have on this page - if they
        // fail to load, the RSVP itself (already loaded above) still
        // works fine without them.
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [rsvp])

  async function refreshCategorySignups(categoryId) {
    const data = await fetchSignupsForCategory(categoryId)
    setCategorySignups((prev) => ({ ...prev, [categoryId]: data }))
  }

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
      // So the event page stops offering "Edit Your RSVP" on this device
      // for an RSVP that no longer exists.
      forgetRsvpToken(rsvp.event_id)
      setRemoved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddItem(categoryId) {
    const description = (itemInputs[categoryId] ?? '').trim()
    if (!description) return

    setSignupError('')
    setSignupBusyKey(`${categoryId}:open`)

    try {
      await submitSignup({ token, categoryId, itemDescription: description })
      setItemInputs((prev) => ({ ...prev, [categoryId]: '' }))
      await refreshCategorySignups(categoryId)
    } catch (err) {
      setSignupError(err.message)
    } finally {
      setSignupBusyKey('')
    }
  }

  async function handleClaimSlot(categoryId, slotId) {
    setSignupError('')
    setSignupBusyKey(`${categoryId}:${slotId}`)

    try {
      await submitSignup({ token, categoryId, slotId })
      await refreshCategorySignups(categoryId)
    } catch (err) {
      setSignupError(err.message)
    } finally {
      setSignupBusyKey('')
    }
  }

  async function handleRemoveSignup(categoryId, signupId) {
    setSignupError('')
    setSignupBusyKey(`remove:${signupId}`)

    try {
      await removeSignup(token, signupId)
      await refreshCategorySignups(categoryId)
    } catch (err) {
      setSignupError(err.message)
    } finally {
      setSignupBusyKey('')
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

  const showCategories = status === 'going' && rsvp.event_status === 'open'

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

      {showCategories && !categoriesLoading && categories.length > 0 && (
        <div className="category-manage">
          <h2>What You&apos;re Bringing / Doing</h2>
          {signupError && <p className="form-error">{signupError}</p>}

          {categories.map((category) => {
            const signups = categorySignups[category.id] ?? []
            const mine = signups.filter((s) => s.rsvp_id === rsvp.id)

            if (category.category_type === 'open_contribution') {
              const atCapacity =
                category.max_signups != null && signups.length >= category.max_signups
              const busy = signupBusyKey === `${category.id}:open`

              return (
                <div className="category-manage-card" key={category.id}>
                  <strong>{category.name}</strong>
                  {category.description && <p className="event-meta">{category.description}</p>}

                  {mine.length > 0 && (
                    <ul className="signup-list">
                      {mine.map((s) => (
                        <li key={s.id}>
                          {s.item_description}{' '}
                          <button
                            type="button"
                            className="link-button"
                            disabled={signupBusyKey === `remove:${s.id}`}
                            onClick={() => handleRemoveSignup(category.id, s.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {atCapacity ? (
                    <p className="event-meta">This category is full.</p>
                  ) : (
                    <div className="inline-form">
                      <input
                        type="text"
                        placeholder="What are you bringing?"
                        value={itemInputs[category.id] ?? ''}
                        onChange={(e) =>
                          setItemInputs((prev) => ({ ...prev, [category.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={busy || !(itemInputs[category.id] ?? '').trim()}
                        onClick={() => handleAddItem(category.id)}
                      >
                        {busy ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            // specific_slot / volunteer_donation
            return (
              <div className="category-manage-card" key={category.id}>
                <strong>{category.name}</strong>
                {category.description && <p className="event-meta">{category.description}</p>}

                {category.category_slots.map((slot) => {
                  const slotSignups = signups.filter((s) => s.slot_id === slot.id)
                  const mySlotSignups = slotSignups.filter((s) => s.rsvp_id === rsvp.id)
                  const full =
                    slot.quantity_needed != null && slotSignups.length >= slot.quantity_needed
                  const alreadyClaimed =
                    category.category_type === 'specific_slot' && mySlotSignups.length > 0
                  const busy = signupBusyKey === `${category.id}:${slot.id}`

                  return (
                    <div className="slot-card" key={slot.id}>
                      <div className="slot-card-header">
                        <span>{slot.name}</span>
                        <span className={full ? 'capacity-badge capacity-full' : 'capacity-badge'}>
                          {slotSignups.length}
                          {slot.quantity_needed != null ? ` / ${slot.quantity_needed}` : ' signed up'}
                        </span>
                      </div>
                      {slot.instructions && <p className="event-meta">{slot.instructions}</p>}

                      {mySlotSignups.map((s) => (
                        <p key={s.id} className="event-meta">
                          You&apos;re signed up for this.{' '}
                          <button
                            type="button"
                            className="link-button"
                            disabled={signupBusyKey === `remove:${s.id}`}
                            onClick={() => handleRemoveSignup(category.id, s.id)}
                          >
                            Remove
                          </button>
                        </p>
                      ))}

                      {!alreadyClaimed && !full && (
                        <button type="button" disabled={busy} onClick={() => handleClaimSlot(category.id, slot.id)}>
                          {busy ? 'Signing up…' : 'Sign Up'}
                        </button>
                      )}
                      {!alreadyClaimed && full && <p className="event-meta">Full.</p>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EditRsvpPage
