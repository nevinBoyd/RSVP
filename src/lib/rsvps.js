import { supabase } from './supabaseClient'

// Data-access layer for RSVP submission and token-based edit/cancel.
// These all call narrow Postgres RPC functions (see
// supabase/migrations/002_rsvp_submission.sql) rather than touching the
// "rsvps" table directly - the table itself has no public insert/select
// policy on purpose, so a resident can only ever affect their own RSVP,
// never browse or edit anyone else's.

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
