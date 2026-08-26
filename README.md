# RSVP

Simplified RSVP app for a Life Style Coordinator.

## Status

Phase 2: data model + backend connection (Supabase). Tables and RLS
policies are defined; no forms are wired to real data yet — that starts in
Phase 3 (event creation).

## Stack

- React + Vite
- react-router-dom
- Supabase (Postgres + Auth + Storage) for the backend

## Routes

- `/` — current/upcoming events
- `/event/:eventId` — public event page
- `/event/:eventId/rsvp` — submit RSVP
- `/event/:eventId/edit-rsvp/:token` — edit/cancel RSVP via token link
- `/event/:eventId/category/:categoryId` — category detail
- `/admin/login` — admin login
- `/admin` — admin dashboard
- `/admin/event/new` — create event
- `/admin/event/:eventId` — edit event
- `/admin/event/:eventId/categories` — manage categories
- `/admin/event/:eventId/attendees` — manage attendees

## Data model

Defined in `supabase/schema.sql`. Six tables:

- **admin_profile** — Cass's coordinator info (name, contact details),
  keyed to her Supabase Auth user so it's entered once, not per event.
- **events** — title, date/time, location, notes, flyer reference,
  draft/open/closed status, optional RSVP deadline.
- **rsvps** — one row per resident's main Going/Not-Going response.
  Duplicate-name protection is a database constraint (`unique (event_id,
  name_normalized)`), not just a UI check. Each row gets a random
  `edit_token` used for the no-login edit link.
- **categories** — food/volunteer/donation categories per event, with a
  `category_type` of `open_contribution`, `specific_slot`, or
  `volunteer_donation`.
- **category_slots** — named slots within a category (e.g. "Plates — 3
  needed"), used by `specific_slot` and `volunteer_donation` categories.
- **signups** — one row per "what I'm bringing" / slot claim / volunteer
  commitment, always linked back to the resident's `rsvp_id` so they can
  manage it from their edit link without a second account.

Row Level Security is enabled on every table. Public (anonymous) visitors
can only read published events, active categories/slots, and a
`rsvps_public` view (name, comment, status — never the edit token).
Writing an RSVP or a signup as a public visitor isn't opened up as a broad
table policy here; that comes in Phase 4/5 as narrow database functions
that can enforce dedupe and capacity checks atomically. Full read/write
access requires an authenticated (admin) session.

## Backend setup (do this once)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor → New query**, paste in
   the entire contents of `supabase/schema.sql`, and run it. This creates
   all six tables, indexes, and RLS policies.
3. Go to **Storage → New bucket**, name it `flyers`, and make it a
   **public** bucket (flyer images are meant to be publicly viewable).
4. Go to **Project Settings → API** and copy the **Project URL** and the
   **anon / public key**.
5. In this project, copy `.env.example` to `.env.local` and paste those
   two values in:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
   `.env.local` is gitignored — never commit real keys.
6. Create Cass's admin login: in the Supabase dashboard go to
   **Authentication → Users → Add user**, enter her email and a password.
   (A real "create/change password" flow inside the app itself comes with
   the admin login feature in the next phase — this manual step just gets
   one working account in place now.)

## Verifying the connection

After completing the steps above:

```
npm install
npm run check-db
```

This runs `scripts/check-connection.mjs`, which connects to your Supabase
project and confirms all six tables are reachable. Fix any errors it
reports before moving on — it's much easier to debug now than after forms
are wired up to it.

## Getting started

```
npm install
npm run dev
```
