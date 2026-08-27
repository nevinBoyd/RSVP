import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchCategoryById } from '../../lib/categories'
import { fetchSignupsForCategory } from '../../lib/signups'

// Route: "/event/:eventId/category/:categoryId"
// Read-only detail view for a single category - who's bringing what
// (open_contribution), or which slots are filled/open (specific_slot,
// volunteer_donation). Claiming a slot or adding an item happens from the
// resident's edit-RSVP page (see EditRsvpPage), not here - this page has
// no way to know who's viewing it, so it can only ever show, never
// collect, a signup.
function CategoryPage() {
  const { eventId, categoryId } = useParams()

  const [category, setCategory] = useState(null)
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchCategoryById(categoryId), fetchSignupsForCategory(categoryId)])
      .then(([categoryData, signupsData]) => {
        if (cancelled) return
        setCategory(categoryData)
        setSignups(signupsData)
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
  }, [categoryId])

  if (loading) {
    return (
      <div className="page">
        <p>Loading category…</p>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="page">
        <h1>Category Not Found</h1>
        <p>We couldn&apos;t find that category.</p>
      </div>
    )
  }

  const usesSlots = category.category_type !== 'open_contribution'

  return (
    <div className="page">
      <p><Link to={`/event/${eventId}`}>&larr; Back to event</Link></p>
      <h1>{category.name}</h1>
      {category.description && <p>{category.description}</p>}

      {!usesSlots && (
        <div className="category-detail">
          <p className="event-meta">
            {signups.length} signed up
            {category.max_signups != null ? ` of ${category.max_signups}` : ''}
          </p>
          {signups.length === 0 && <p>No one has signed up yet.</p>}
          {signups.length > 0 && (
            <ul className="signup-list">
              {signups.map((s) => (
                <li key={s.id}>
                  <strong>{s.contributor_name}</strong>
                  {s.item_description ? ` — ${s.item_description}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {usesSlots && (
        <div className="category-detail">
          {category.category_slots.length === 0 && <p>No slots have been set up yet.</p>}
          {category.category_slots.map((slot) => {
            const slotSignups = signups.filter((s) => s.slot_id === slot.id)
            const full = slot.quantity_needed != null && slotSignups.length >= slot.quantity_needed

            return (
              <div className="slot-card" key={slot.id}>
                <div className="slot-card-header">
                  <strong>{slot.name}</strong>
                  <span className={full ? 'capacity-badge capacity-full' : 'capacity-badge'}>
                    {slotSignups.length}
                    {slot.quantity_needed != null ? ` / ${slot.quantity_needed}` : ' signed up'}
                  </span>
                </div>
                {slot.instructions && <p className="event-meta">{slot.instructions}</p>}
                {slotSignups.length > 0 && (
                  <ul className="signup-list">
                    {slotSignups.map((s) => (
                      <li key={s.id}>{s.contributor_name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CategoryPage
