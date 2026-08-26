import { useParams } from 'react-router-dom'

// Route: "/event/:eventId"
// The main public page for a single event: details, flyer, RSVP button,
// Who's Coming list, and category navigation.
function PublicEventPage() {
  const { eventId } = useParams()

  return (
    <div className="page">
      <h1>Event Details</h1>
      <p>Public page for event: {eventId}</p>
    </div>
  )
}

export default PublicEventPage
