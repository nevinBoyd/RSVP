import { supabase } from './supabaseClient'

// Data-access layer for RSVP submission and token-based edit/cancel.
// These all call narrow Postgres RPC functions (see
// supabase/migrations/002_rsvp_submission.sql and
// .../004_find_rsvp.sql) rather than touching the "rsvps" table directly
// - the table itself has no public insert/select policy on purpose, so a
// resident can only ever affect their own RSVP, never browse or edit
// anyone else's through a direct table query.

export async function submitRsvp({ eventId, name, status, comment }) {
  const { data, error } = await supabase.rpc('submit_rsvp', {
    p_event_id: eventId,
    p_name: name,
    p_status: status,
    p_comment: comment || null,
  })

  if (error) throw error
  return data
}

export async function fetchRsvpByToken(token) {
  const { data, error } = await supabase.rpc('get_rsvp_by_token', { p_token: token })

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error("We couldn't find that RSVP. The link may be invalid.")
  }
  return data[0]
}

export async function updateRsvpByToken(token, { status, comment }) {
  const { data, error } = await supabase.rpc('update_rsvp_by_token', {
    p_token: token,
    p_status: status,
    p_comment: comment || null,
  })

  if (error) throw error
  return data
}

export async function cancelRsvpByToken(token) {
  const { error } = await supabase.rpc('cancel_rsvp_by_token', { p_token: token })
  if (error) throw error
}

// Public "Who's Coming" list for an event - reads through the
// rsvps_public view (defined in schema.sql), which already excludes
// name_normalized and edit_token and only includes status = 'going' rows.
export async function fetchPublicRsvps(eventId) {
  const { data, error } = await supabase
    .from('rsvps_public')
    .select('id, name, comment, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Look up an existing RSVP's edit token by name, for residents who don't
// have (or never saved) their confirmation link. This is a deliberate
// trade-off, not a security boundary - see the comment on
// find_rsvp_token() in supabase/migrations/004_find_rsvp.sql for why
// that's an acceptable choice here. Returns null if no RSVP matches that
// name for this event (not an error - "not found" is a normal outcome
// here, e.g. a typo or someone who hasn't RSVP'd yet).
export async function findRsvpToken(eventId, name) {
  const { data, error } = await supabase.rpc('find_rsvp_token', {
    p_event_id: eventId,
    p_name: name,
  })

  if (error) throw error
  return data
}

// --- Remembering an RSVP on this device (localStorage) ---------------------
// Purely a convenience for returning on the same device (phone, tablet,
// or computer) - not a credential, and never the only way in (Find My
// RSVP by name always works too). Wrapped in try/catch since localStorage
// can throw in some browser contexts (private browsing, storage
// disabled, etc.) - none of that should ever break the actual RSVP flow,
// just silently skip the "remember me" convenience.

function rsvpStorageKey(eventId) {
  return `rsvp_token:${eventId}`
}

export function rememberRsvpToken(eventId, token) {
  try {
    window.localStorage.setItem(rsvpStorageKey(eventId), token)
  } catch {
    // Ignore - remembering the RSVP is a nice-to-have, not required.
  }
}

export function getRememberedRsvpToken(eventId) {
  try {
    return window.localStorage.getItem(rsvpStorageKey(eventId))
  } catch {
    return null
  }
}

export function forgetRsvpToken(eventId) {
  try {
    window.localStorage.removeItem(rsvpStorageKey(eventId))
  } catch {
    // Ignore.
  }
}
