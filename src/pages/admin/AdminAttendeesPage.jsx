import { useParams } from 'react-router-dom'

// Route: "/admin/event/:eventId/attendees"
// Cass's attendee management view: active/cancelled RSVPs, comments,
// contributions, and volunteer/donation assignments.
function AdminAttendeesPage() {
  const { eventId } = useParams()

  return (
    <div className="page">
      <h1>Attendees</h1>
      <p>Attendee management for event: {eventId}</p>
    </div>
  )
}

export default AdminAttendeesPage
