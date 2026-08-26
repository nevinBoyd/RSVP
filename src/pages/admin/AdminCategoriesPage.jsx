import { useParams } from 'react-router-dom'

// Route: "/admin/event/:eventId/categories"
// Cass's category navigation/management for a single event.
function AdminCategoriesPage() {
  const { eventId } = useParams()

  return (
    <div className="page">
      <h1>Categories</h1>
      <p>Category management for event: {eventId}</p>
    </div>
  )
}

export default AdminCategoriesPage
