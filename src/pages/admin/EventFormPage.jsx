import { useParams } from 'react-router-dom'

// Routes: "/admin/event/new" and "/admin/event/:eventId"
// Create/Edit Event page. When eventId is present we're editing an
// existing event; otherwise we're creating a new one.
function EventFormPage() {
  const { eventId } = useParams()
  const isEditing = Boolean(eventId)

  return (
    <div className="page">
      <h1>{isEditing ? 'Edit Event' : 'Create Event'}</h1>
      <p>{isEditing ? `Editing event: ${eventId}` : 'New event form will go here.'}</p>
    </div>
  )
}

export default EventFormPage
