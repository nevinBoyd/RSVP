-- ============================================================================
-- Phase 5 follow-up — find an RSVP by name (no saved link required)
-- ============================================================================
-- Run this once in the SQL Editor. Only adds one function - doesn't touch
-- existing tables or data.
--
-- Why this exists: the only way to reach the edit-RSVP page was a link
-- shown once on the confirmation screen. Realistically, residents won't
-- save it, and asking them to call/email/visit the office to fix a typo
-- or add something they forgot defeats the point of a self-serve app.
-- This looks an RSVP up by name instead, the same way the "Who's Coming"
-- list already shows names publicly - it's a deliberate trade-off for a
-- small trusted community, not a security boundary. Anyone who knows a
-- resident's name (which is already public on the event page) can pull up
-- their edit token this way. If that ever stops being acceptable - a
-- larger community, or residents who'd rather it not work this way -
-- this function is the one place that would need to change.
create or replace function find_rsvp_token(p_event_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name_normalized text;
  v_token text;
begin
  v_name_normalized := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));

  select edit_token into v_token
    from rsvps
    where event_id = p_event_id and name_normalized = v_name_normalized;

  return v_token; -- null if no match - the caller treats that as "not found"
end;
$$;

grant execute on function find_rsvp_token(uuid, text) to anon, authenticated;

-- ============================================================================
-- Done. Paste the whole file into Supabase SQL Editor → New query → Run.
-- ============================================================================
