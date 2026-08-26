# RSVP

A responsive event RSVP and signup application for community coordinators and event organizers.

## Status

Phase 1: app scaffold + page structure only. No backend/data yet.

## Stack

- React + Vite
- react-router-dom

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

## Getting started

```
npm install
npm run dev
```
