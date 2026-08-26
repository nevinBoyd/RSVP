import { useParams } from 'react-router-dom'

// Route: "/event/:eventId/category/:categoryId"
// Detail view for a single category (e.g. "Salads & Sides") so the public
// event page doesn't have to show every category's contents at once.
function CategoryPage() {
  const { eventId, categoryId } = useParams()

  return (
    <div className="page">
      <h1>Category</h1>
      <p>
        Category {categoryId} for event {eventId}
      </p>
    </div>
  )
}

export default CategoryPage
