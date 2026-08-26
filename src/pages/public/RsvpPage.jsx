import { useParams } from 'react-router-dom'

// Route: "/event/:eventId/rsvp"
// Where a resident enters their name and RSVPs (Going / Not Going + optional comment).
function RsvpPage() {
  const { eventId } = useParams()

  return (
    <div className="page">
      <h1>RSVP</h1>
      <p>RSVP form for event: {eventId}</p>
    </div>
  )
}

export default RsvpPage
