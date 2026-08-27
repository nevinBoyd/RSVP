import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createCategory,
  createSlot,
  deleteCategory,
  deleteSlot,
  fetchCategoriesForAdmin,
  updateCategory,
  updateSlot,
} from '../../lib/categories'
import { fetchEventById } from '../../lib/events'

// Route: "/admin/event/:eventId/categories"
// Cass's category + slot management for a single event. Categories are
// one of three types (open_contribution, specific_slot,
// volunteer_donation - see schema.sql for what each means); only the
// latter two have slots to manage.
const emptyCategoryForm = {
  name: '',
  description: '',
  category_type: 'open_contribution',
  max_signups: '',
  active: true,
}

const emptySlotForm = { name: '', quantity_needed: '', instructions: '' }

function AdminCategoriesPage() {
  const { eventId } = useParams()

  const [event, setEvent] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newCategory, setNewCategory] = useState(emptyCategoryForm)
  const [creatingCategory, setCreatingCategory] = useState(false)

  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editCategoryForm, setEditCategoryForm] = useState(emptyCategoryForm)
  const [savingCategory, setSavingCategory] = useState(false)

  const [slotFormOpenFor, setSlotFormOpenFor] = useState(null)
  const [newSlot, setNewSlot] = useState(emptySlotForm)
  const [savingSlot, setSavingSlot] = useState(false)

  const [editingSlotId, setEditingSlotId] = useState(null)
  const [editSlotForm, setEditSlotForm] = useState(emptySlotForm)

  async function loadCategories() {
    const data = await fetchCategoriesForAdmin(eventId)
    setCategories(data)
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchEventById(eventId), fetchCategoriesForAdmin(eventId)])
      .then(([eventData, categoryData]) => {
        if (cancelled) return
        setEvent(eventData)
        setCategories(categoryData)
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

  function toPayload(form) {
    return {
      name: form.name,
      description: form.description || null,
      category_type: form.category_type,
      max_signups:
        form.category_type === 'open_contribution' && form.max_signups !== ''
          ? Number(form.max_signups)
          : null,
      active: form.active,
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault()
    setError('')
    setCreatingCategory(true)

    try {
      await createCategory(eventId, toPayload(newCategory))
      setNewCategory(emptyCategoryForm)
      await loadCategories()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingCategory(false)
    }
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id)
    setEditCategoryForm({
      name: category.name,
      description: category.description ?? '',
      category_type: category.category_type,
      max_signups: category.max_signups ?? '',
      active: category.active,
    })
  }

  async function handleSaveCategory(e, categoryId) {
    e.preventDefault()
    setError('')
    setSavingCategory(true)

    try {
      await updateCategory(categoryId, toPayload(editCategoryForm))
      setEditingCategoryId(null)
      await loadCategories()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingCategory(false)
    }
  }

  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? This also removes every signup for it. This can't be undone.`,
    )
    if (!confirmed) return

    setError('')
    try {
      await deleteCategory(category.id)
      await loadCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddSlot(e, categoryId) {
    e.preventDefault()
    setError('')
    setSavingSlot(true)

    try {
      await createSlot(categoryId, {
        name: newSlot.name,
        quantity_needed: newSlot.quantity_needed !== '' ? Number(newSlot.quantity_needed) : null,
        instructions: newSlot.instructions || null,
      })
      setNewSlot(emptySlotForm)
      setSlotFormOpenFor(null)
      await loadCategories()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingSlot(false)
    }
  }

  function startEditSlot(slot) {
    setEditingSlotId(slot.id)
    setEditSlotForm({
      name: slot.name,
      quantity_needed: slot.quantity_needed ?? '',
      instructions: slot.instructions ?? '',
    })
  }

  async function handleSaveSlot(e, slotId) {
    e.preventDefault()
    setError('')
    setSavingSlot(true)

    try {
      await updateSlot(slotId, {
        name: editSlotForm.name,
        quantity_needed:
          editSlotForm.quantity_needed !== '' ? Number(editSlotForm.quantity_needed) : null,
        instructions: editSlotForm.instructions || null,
      })
      setEditingSlotId(null)
      await loadCategories()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingSlot(false)
    }
  }

  async function handleDeleteSlot(slot) {
    const confirmed = window.confirm(
      `Delete slot "${slot.name}"? This also removes every signup for it. This can't be undone.`,
    )
    if (!confirmed) return

    setError('')
    try {
      await deleteSlot(slot.id)
      await loadCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading categories…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <p><Link to={`/admin/event/${eventId}`}>&larr; Back to event</Link></p>
      <h1>Categories{event ? ` — ${event.title}` : ''}</h1>

      {error && <p className="form-error">{error}</p>}

      {categories.map((category) => {
        const usesSlots = category.category_type !== 'open_contribution'
        const isEditing = editingCategoryId === category.id

        return (
          <div className="category-manage-card" key={category.id}>
            {isEditing ? (
              <form onSubmit={(e) => handleSaveCategory(e, category.id)} className="form">
                <label>
                  Name
                  <input
                    type="text"
                    value={editCategoryForm.name}
                    onChange={(e) =>
                      setEditCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={editCategoryForm.description}
                    onChange={(e) =>
                      setEditCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={editCategoryForm.category_type}
                    onChange={(e) =>
                      setEditCategoryForm((prev) => ({ ...prev, category_type: e.target.value }))
                    }
                  >
                    <option value="open_contribution">Open contribution (free text)</option>
                    <option value="specific_slot">Specific slots (fixed quantity)</option>
                    <option value="volunteer_donation">Volunteer / donation</option>
                  </select>
                </label>
                {editCategoryForm.category_type === 'open_contribution' && (
                  <label>
                    Max total sign-ups (optional)
                    <input
                      type="number"
                      min="1"
                      value={editCategoryForm.max_signups}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({ ...prev, max_signups: e.target.value }))
                      }
                    />
                  </label>
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={editCategoryForm.active}
                    onChange={(e) =>
                      setEditCategoryForm((prev) => ({ ...prev, active: e.target.checked }))
                    }
                  />{' '}
                  Active (visible to residents)
                </label>

                <div className="form-actions form-actions-split">
                  <button type="submit" disabled={savingCategory}>
                    {savingCategory ? 'Saving…' : 'Save Category'}
                  </button>
                  <button type="button" onClick={() => setEditingCategoryId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="slot-card-header">
                  <strong>
                    {category.name} {!category.active && '(inactive)'}
                  </strong>
                  <span className="event-meta">
                    {category.category_type === 'open_contribution'
                      ? 'Open contribution'
                      : category.category_type === 'specific_slot'
                        ? 'Specific slots'
                        : 'Volunteer / donation'}
                  </span>
                </div>
                {category.description && <p className="event-meta">{category.description}</p>}
                {category.category_type === 'open_contribution' && category.max_signups != null && (
                  <p className="event-meta">Max {category.max_signups} sign-ups</p>
                )}

                <div className="form-actions form-actions-split">
                  <button type="button" onClick={() => startEditCategory(category)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}

            {usesSlots && !isEditing && (
              <div className="slot-manage">
                {category.category_slots.map((slot) =>
                  editingSlotId === slot.id ? (
                    <form
                      onSubmit={(e) => handleSaveSlot(e, slot.id)}
                      className="form"
                      key={slot.id}
                    >
                      <label>
                        Slot name
                        <input
                          type="text"
                          value={editSlotForm.name}
                          onChange={(e) =>
                            setEditSlotForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Quantity needed (blank = unlimited)
                        <input
                          type="number"
                          min="1"
                          value={editSlotForm.quantity_needed}
                          onChange={(e) =>
                            setEditSlotForm((prev) => ({
                              ...prev,
                              quantity_needed: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Instructions (optional)
                        <input
                          type="text"
                          value={editSlotForm.instructions}
                          onChange={(e) =>
                            setEditSlotForm((prev) => ({ ...prev, instructions: e.target.value }))
                          }
                        />
                      </label>
                      <div className="form-actions form-actions-split">
                        <button type="submit" disabled={savingSlot}>
                          {savingSlot ? 'Saving…' : 'Save Slot'}
                        </button>
                        <button type="button" onClick={() => setEditingSlotId(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="slot-card" key={slot.id}>
                      <div className="slot-card-header">
                        <span>{slot.name}</span>
                        <span className="capacity-badge">
                          {slot.quantity_needed != null ? `needs ${slot.quantity_needed}` : 'unlimited'}
                        </span>
                      </div>
                      {slot.instructions && <p className="event-meta">{slot.instructions}</p>}
                      <div className="form-actions form-actions-split">
                        <button type="button" onClick={() => startEditSlot(slot)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => handleDeleteSlot(slot)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )}

                {slotFormOpenFor === category.id ? (
                  <form onSubmit={(e) => handleAddSlot(e, category.id)} className="form">
                    <label>
                      Slot name
                      <input
                        type="text"
                        value={newSlot.name}
                        onChange={(e) => setNewSlot((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Quantity needed (blank = unlimited)
                      <input
                        type="number"
                        min="1"
                        value={newSlot.quantity_needed}
                        onChange={(e) =>
                          setNewSlot((prev) => ({ ...prev, quantity_needed: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Instructions (optional)
                      <input
                        type="text"
                        value={newSlot.instructions}
                        onChange={(e) =>
                          setNewSlot((prev) => ({ ...prev, instructions: e.target.value }))
                        }
                      />
                    </label>
                    <div className="form-actions form-actions-split">
                      <button type="submit" disabled={savingSlot}>
                        {savingSlot ? 'Adding…' : 'Add Slot'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSlotFormOpenFor(null)
                          setNewSlot(emptySlotForm)
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setSlotFormOpenFor(category.id)}>
                    + Add Slot
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      <h2>Add a Category</h2>
      <form onSubmit={handleCreateCategory} className="form">
        <label>
          Name
          <input
            type="text"
            value={newCategory.name}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </label>
        <label>
          Description (optional)
          <textarea
            value={newCategory.description}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </label>
        <label>
          Type
          <select
            value={newCategory.category_type}
            onChange={(e) =>
              setNewCategory((prev) => ({ ...prev, category_type: e.target.value }))
            }
          >
            <option value="open_contribution">Open contribution (free text)</option>
            <option value="specific_slot">Specific slots (fixed quantity)</option>
            <option value="volunteer_donation">Volunteer / donation</option>
          </select>
        </label>
        {newCategory.category_type === 'open_contribution' && (
          <label>
            Max total sign-ups (optional)
            <input
              type="number"
              min="1"
              value={newCategory.max_signups}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, max_signups: e.target.value }))
              }
            />
          </label>
        )}

        <div className="form-actions">
          <button type="submit" disabled={creatingCategory}>
            {creatingCategory ? 'Adding…' : 'Add Category'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminCategoriesPage
