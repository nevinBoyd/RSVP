import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="page">
      <h1>Page Not Found</h1>
      <p>
        <Link to="/">Back to events</Link>
      </p>
    </div>
  )
}

export default NotFoundPage
