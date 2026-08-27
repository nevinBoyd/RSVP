import { supabase } from './supabaseClient'

// Data-access layer for "categories" and "category_slots". Both tables
// have public-read RLS policies already (see schema.sql), so everything
// here is a plain select/insert/update/delete - no RPC functions needed.
// Writing (create/edit/delete a category or slot) only succeeds for an
// authenticated admin; RLS enforces that server-side regardless of what
// these functions do.

// Public: active categories for a published event, with their slots
// nested (category_slots is a reverse foreign-key relationship off
// categories, so supabase-js can select it directly).
export async function fetchCategoriesForEvent(eventId) {
  const { data, error } = await supabase
    .from('categories')
    .select(
      'id, name, description, category_type, max_signups, sort_order, ' +
        'category_slots(id, name, quantity_needed, instructions, sort_order)',
    )
    .eq('event_id', eventId)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error

  // Slots come back in arbitrary order from the nested select - sort them
  // client-side so admin-defined slot order is respected on the public
  // pages too.
  return data.map((category) => ({
    ...category,
    category_slots: [...category.category_slots].sort((a, b) => a.sort_order - b.sort_order),
  }))
}

// Public: a single category + its slots, for the category detail page.
// Only returns a row if it's active on a published event - same RLS
// policy as fetchCategoriesForEvent, just scoped to one id.
export async function fetchCategoryById(categoryId) {
  const { data, error } = await supabase
    .from('categories')
    .select(
      'id, event_id, name, description, category_type, max_signups, ' +
        'category_slots(id, name, quantity_needed, instructions, sort_order)',
    )
    .eq('id', categoryId)
    .single()

  if (error) throw error
  return {
    ...data,
    category_slots: [...data.category_slots].sort((a, b) => a.sort_order - b.sort_order),
  }
}

// Admin dashboard: every category for an event regardless of active
// state, with slots nested.
export async function fetchCategoriesForAdmin(eventId) {
  const { data, error } = await supabase
    .from('categories')
    .select(
      'id, name, description, category_type, max_signups, active, sort_order, ' +
        'category_slots(id, name, quantity_needed, instructions, sort_order)',
    )
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data.map((category) => ({
    ...category,
    category_slots: [...category.category_slots].sort((a, b) => a.sort_order - b.sort_order),
  }))
}

export async function createCategory(eventId, categoryData) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...categoryData, event_id: eventId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(categoryId, categoryData) {
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', categoryId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Deleting a category cascades to its slots and signups (see the
// "on delete cascade" foreign keys in schema.sql).
export async function deleteCategory(categoryId) {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)
  if (error) throw error
}

export async function createSlot(categoryId, slotData) {
  const { data, error } = await supabase
    .from('category_slots')
    .insert({ ...slotData, category_id: categoryId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSlot(slotId, slotData) {
  const { data, error } = await supabase
    .from('category_slots')
    .update(slotData)
    .eq('id', slotId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Deleting a slot cascades to its signups.
export async function deleteSlot(slotId) {
  const { error } = await supabase.from('category_slots').delete().eq('id', slotId)
  if (error) throw error
}
