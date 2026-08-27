-- ============================================================================
-- Phase 4 — RSVP submission (public, token-based edit/cancel)
-- ============================================================================
-- Run this once in the SQL Editor, same as schema.sql was. Safe to run on
-- its own — it only adds functions, it doesn't touch any existing tables
-- or data.
--
-- Why RPC functions instead of table policies: the "rsvps" table
-- intentionally has no public select/insert/update policy (see
-- schema.sql) — it holds edit_token, which must never be exposed in a
-- public list or left editable by anyone who can guess a row. These
-- functions are SECURITY DEFINER (they run with the privileges of the
-- function owner, bypassing RLS), but each one does its own authorization
-- check before touching a row, so an anonymous visitor can only ever
-- affect their own RSVP - never browse or edit anyone else's.
-- ============================================================================

-- Submit a new RSVP. Enforces: event must be "open", must be before its
-- rsvp_deadline (if set), and the (event_id, name) pair must be unique -
-- that last one is enforced by the table's own unique constraint, we just
-- turn the raw unique_violation into a friendly message here.
create or replace function submit_rsvp(
  p_event_id uuid,
  p_name text,
  p_status text,
  p_comment text default null
)
returns rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_name_normalized text;
  v_edit_token text;
  v_result rsvps;
begin
  if p_status not in ('going', 'not_going') then
    raise exception 'Invalid RSVP status.';
  end if;

  select * into v_event from events where id = p_event_id;
  if not found then
    raise exception 'Event not found.';
  end if;

  if v_event.status <> 'open' then
    raise exception 'This event is not currently accepting RSVPs.';
  end if;

  if v_event.rsvp_deadline is not null and now() > v_event.rsvp_deadline then
    raise exception 'The RSVP deadline for this event has passed.';
  end if;

  v_name_normalized := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));
  if v_name_normalized = '' then
    raise exception 'Please enter your name.';
  end if;

  -- Generated here (server-side, via pgcrypto) rather than by the client -
  -- more reliable than trusting every caller to bring its own CSPRNG, and
  -- it's already unguessable per the table's own requirement.
  v_edit_token := encode(gen_random_bytes(24), 'hex');

  begin
    insert into rsvps (event_id, name, name_normalized, status, comment, edit_token)
    values (
      p_event_id,
      trim(p_name),
      v_name_normalized,
      p_status,
      nullif(trim(p_comment), ''),
      v_edit_token
    )
    returning * into v_result;
  exception
    when unique_violation then
      raise exception
        'It looks like "%" has already RSVP''d to this event. If that''s you, use the edit link from your original confirmation to make changes.',
        trim(p_name);
  end;

  return v_result;
end;
$$;

grant execute on function submit_rsvp(uuid, text, text, text) to anon, authenticated;


-- Look up an RSVP (plus a bit of its event's info) by edit token, for the
-- "/edit-rsvp/:token" page. Returns zero rows if the token doesn't match
-- anything - deliberately the same behavior as a bad id, so this can't be
-- used to distinguish "wrong token" from "token never existed".
create or replace function get_rsvp_by_token(p_token text)
returns table (
  id uuid,
  event_id uuid,
  name text,
  status text,
  comment text,
  event_title text,
  event_date date,
  event_status text,
  edit_links_disabled_on_close boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select r.id, r.event_id, r.name, r.status, r.comment,
           e.title, e.event_date, e.status, e.edit_links_disabled_on_close
    from rsvps r
    join events e on e.id = r.event_id
    where r.edit_token = p_token;
end;
$$;

grant execute on function get_rsvp_by_token(text) to anon, authenticated;


-- Change Going/Not Going or the comment on an existing RSVP, via token.
-- Blocked once the event is closed AND the event has
-- edit_links_disabled_on_close set - otherwise editing stays open even
-- after close, same as the table comment describes.
create or replace function update_rsvp_by_token(
  p_token text,
  p_status text,
  p_comment text default null
)
returns rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rsvp rsvps%rowtype;
  v_event events%rowtype;
  v_result rsvps;
begin
  if p_status not in ('going', 'not_going') then
    raise exception 'Invalid RSVP status.';
  end if;

  select * into v_rsvp from rsvps where edit_token = p_token;
  if not found then
    raise exception 'We couldn''t find that RSVP. The link may be invalid.';
  end if;

  select * into v_event from events where id = v_rsvp.event_id;

  if v_event.status = 'closed' and v_event.edit_links_disabled_on_close then
    raise exception 'RSVPs for this event are closed and can no longer be changed.';
  end if;

  update rsvps
  set status = p_status,
      comment = nullif(trim(p_comment), ''),
      updated_at = now()
  where edit_token = p_token
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function update_rsvp_by_token(text, text, text) to anon, authenticated;


-- Remove an RSVP entirely, via token. Same edit_links_disabled_on_close
-- rule as update above.
create or replace function cancel_rsvp_by_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rsvp rsvps%rowtype;
  v_event events%rowtype;
begin
  select * into v_rsvp from rsvps where edit_token = p_token;
  if not found then
    raise exception 'We couldn''t find that RSVP. The link may be invalid.';
  end if;

  select * into v_event from events where id = v_rsvp.event_id;

  if v_event.status = 'closed' and v_event.edit_links_disabled_on_close then
    raise exception 'RSVPs for this event are closed and can no longer be changed.';
  end if;

  delete from rsvps where edit_token = p_token;
end;
$$;

grant execute on function cancel_rsvp_by_token(text) to anon, authenticated;

-- ============================================================================
-- Done. Paste the whole file into Supabase SQL Editor → New query → Run.
-- ============================================================================
