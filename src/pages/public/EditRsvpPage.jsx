import { useParams } from 'react-router-dom'

// Route: "/event/:eventId/edit-rsvp/:token"
// A resident reaches this page via their unique edit link/token (no account needed).
// From here they can change Going/Not Going, edit their comment, edit what
// they're bringing, or remove their RSVP entirely.
function EditRsvpPage() {
  const { eventId, token } = useParams()

  return (
    <div className="page">
      <h1>Edit Your RSVP</h1>
      <p>
        Editing RSVP for event: {eventId} (token: {token})
      </p>
    </div>
  )
}

export default EditRsvpPage
