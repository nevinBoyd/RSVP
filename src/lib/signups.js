import { supabase } from './supabaseClient'

// Data-access layer for "signups". Reading is a plain select - "signups"
// already has a public-read RLS policy (see schema.sql), so counts and
// contributor lists work with no function needed. Claiming or removing a
// signup goes through the submit_signup / remove_signup RPC functions
// (see supabase/migrations/003_signups.sql) instead, the same
// token-authorized pattern as RSVP edit/cancel in src/lib/rsvps.js.

// Public: every signup for a category - used to show "who's bringing
// what" / slot fill counts on the category and event pages.
export async function fetchSignupsForCategory(categoryId) {
  const { data, error } = await supabase
    .from('signups')
    .select('id, category_id, slot_id, rsvp_id, contributor_name, item_description, created_at')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// The current resident's own signups for an event (any category),
// identified by their rsvp id (from fetchRsvpByToken) rather than the
// token itself - the token's job was already done resolving to an rsvp
// id, and signups are public-readable so no RPC is needed here.
export async function fetchMySignupsForEvent(eventId, rsvpId) {
  const { data, error } = await supabase
    .from('signups')
    .select('id, category_id, slot_id, item_description, categories!inner(event_id)')
    .eq('rsvp_id', rsvpId)
    .eq('categories.event_id', eventId)

  if (error) throw error
  return data
}

export async function submitSignup({ token, categoryId, slotId, itemDescription }) {
  const { data, error } = await supabase.rpc('submit_signup', {
    p_token: token,
    p_category_id: categoryId,
    p_slot_id: slotId || null,
    p_item_description: itemDescription || null,
  })

  if (error) throw error
  return data
}

export async function removeSignup(token, signupId) {
  const { error } = await supabase.rpc('remove_signup', {
    p_token: token,
    p_signup_id: signupId,
  })
  if (error) throw error
}
