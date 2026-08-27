import { supabase } from './supabaseClient'

// Small data-access layer for the "events" table, kept separate from the
// page components so the Supabase query details live in one place. Phase
// 3 only needs the fields below - flyer_path and category relationships
// come in later phases.

// Public: events a resident is allowed to see (RLS also enforces this
// server-side - this select list just avoids over-fetching).
export async function fetchPublishedEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, start_time, status')
    .in('status', ['open', 'closed'])
    .order('event_date', { ascending: true })

  if (error) throw error
  return data
}

// Used by both the public single-event page and the admin edit form.
// RLS decides what's actually returned: a public (anon) request only
// gets the row back if the event is open/closed; an authenticated admin
// request gets it regardless of status (including drafts).
export async function fetchEventById(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error) throw error
  return data
}

// Admin dashboard: every event regardless of status, newest first.
export async function fetchAllEventsForAdmin() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, status')
    .order('event_date', { ascending: false })

  if (error) throw error
  return data
}

export async function createEvent(eventData) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('events')
    .insert({ ...eventData, created_by: user?.id ?? null })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEvent(eventId, eventData) {
  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}
