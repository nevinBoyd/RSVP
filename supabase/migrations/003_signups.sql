-- ============================================================================
-- Phase 5 — Categories & signups ("what I'm bringing" / slots / volunteering)
-- ============================================================================
-- Run this once in the SQL Editor, same as the earlier migration files.
-- Only adds functions - doesn't touch existing tables or data.
--
-- Same reasoning as 002_rsvp_submission.sql: "signups" has no public
-- insert/delete policy (see schema.sql), so claiming or removing a signup
-- goes through these narrow SECURITY DEFINER functions instead. Reading
-- categories/slots/signups does NOT need a function - schema.sql already
-- grants public select on all three, so the app queries those tables
-- directly for anything read-only.
--
-- Design choice worth knowing about: a resident authorizes a signup with
-- their RSVP edit_token (the same one from Phase 4), not a new identity.
-- That means "what I'm bringing" is managed from the edit-RSVP page, not
-- the public event page directly - matches the original EditRsvpPage
-- comment ("edit what they're bringing") and keeps the same one-token
-- model instead of introducing a second kind of credential.
-- ============================================================================

-- Claim a signup: an open_contribution item, a specific_slot claim, or a
-- volunteer_donation assignment. p_slot_id is required for the latter two,
-- must be null for open_contribution.
--
-- Capacity/dedupe rules (deliberately simple - flag if you want these
-- changed):
--   - open_contribution: no per-person limit (someone can bring two
--     things); category.max_signups caps the total number of signups.
--   - specific_slot: quantity_needed caps that slot's signups; the same
--     rsvp can't claim the same slot twice (but CAN claim a different
--     slot in the same category - e.g. both "Plates" and "Ice").
--   - volunteer_donation: quantity_needed caps the slot same as above,
--     but duplicate claims by the same rsvp ARE allowed, per the
--     category_type comment in schema.sql ("a resident can volunteer for
--     multiple assignments").
create or replace function submit_signup(
  p_token text,
  p_category_id uuid,
  p_slot_id uuid default null,
  p_item_description text default null
)
returns signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rsvp rsvps%rowtype;
  v_category categories%rowtype;
  v_slot category_slots%rowtype;
  v_event events%rowtype;
  v_count integer;
  v_result signups;
begin
  select * into v_rsvp from rsvps where edit_token = p_token;
  if not found then
    raise exception 'We couldn''t find that RSVP. The link may be invalid.';
  end if;

  if v_rsvp.status <> 'going' then
    raise exception 'Only residents who are Going can sign up to bring something.';
  end if;

  select * into v_category from categories where id = p_category_id;
  if not found or v_category.active is not true then
    raise exception 'This category is not available.';
  end if;

  if v_category.event_id <> v_rsvp.event_id then
    raise exception 'This category does not belong to your event.';
  end if;

  select * into v_event from events where id = v_category.event_id;
  if v_event.status <> 'open' then
    raise exception 'This event is not currently accepting signups.';
  end if;

  if v_category.category_type = 'open_contribution' then
    if p_slot_id is not null then
      raise exception 'This category does not use slots.';
    end if;
    if p_item_description is null or trim(p_item_description) = '' then
      raise exception 'Please describe what you''re bringing.';
    end if;

    if v_category.max_signups is not null then
      select count(*) into v_count from signups where category_id = p_category_id;
      if v_count >= v_category.max_signups then
        raise exception 'This category is already full.';
      end if;
    end if;

  else
    -- specific_slot or volunteer_donation
    if p_slot_id is null then
      raise exception 'Please choose a slot.';
    end if;

    select * into v_slot from category_slots where id = p_slot_id;
    if not found or v_slot.category_id <> p_category_id then
      raise exception 'That slot could not be found.';
    end if;

    if v_slot.quantity_needed is not null then
      select count(*) into v_count from signups where slot_id = p_slot_id;
      if v_count >= v_slot.quantity_needed then
        raise exception 'That slot is already full.';
      end if;
    end if;

    if v_category.category_type = 'specific_slot' then
      select count(*) into v_count
        from signups
        where slot_id = p_slot_id and rsvp_id = v_rsvp.id;
      if v_count > 0 then
        raise exception 'You''ve already claimed this slot.';
      end if;
    end if;
    -- volunteer_donation: duplicate claims by the same rsvp are allowed,
    -- so no dedupe check here.
  end if;

  insert into signups (
    category_id, slot_id, rsvp_id,
    contributor_name, contributor_name_normalized, item_description
  )
  values (
    p_category_id,
    p_slot_id,
    v_rsvp.id,
    v_rsvp.name,
    v_rsvp.name_normalized,
    nullif(trim(p_item_description), '')
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function submit_signup(text, uuid, uuid, text) to anon, authenticated;


-- Remove one of your own signups, via RSVP edit token. Only removes a
-- signup that actually belongs to the rsvp the token resolves to - a
-- token can never be used to remove someone else's signup.
create or replace function remove_signup(p_token text, p_signup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rsvp rsvps%rowtype;
  v_signup signups%rowtype;
begin
  select * into v_rsvp from rsvps where edit_token = p_token;
  if not found then
    raise exception 'We couldn''t find that RSVP. The link may be invalid.';
  end if;

  select * into v_signup from signups where id = p_signup_id;
  if not found or v_signup.rsvp_id <> v_rsvp.id then
    raise exception 'We couldn''t find that signup.';
  end if;

  delete from signups where id = p_signup_id;
end;
$$;

grant execute on function remove_signup(text, uuid) to anon, authenticated;

-- ============================================================================
-- Done. Paste the whole file into Supabase SQL Editor → New query → Run.
-- ============================================================================
