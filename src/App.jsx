import { Routes, Route } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'

import EventListPage from './pages/public/EventListPage'
import PublicEventPage from './pages/public/PublicEventPage'
import RsvpPage from './pages/public/RsvpPage'
import EditRsvpPage from './pages/public/EditRsvpPage'
import CategoryPage from './pages/public/CategoryPage'

import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import EventFormPage from './pages/admin/EventFormPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminAttendeesPage from './pages/admin/AdminAttendeesPage'

import NotFoundPage from './pages/NotFoundPage'

import './App.css'

function App() {
  return (
    <Routes>
      {/* Public (resident-facing) routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<EventListPage />} />
        <Route path="/event/:eventId" element={<PublicEventPage />} />
        <Route path="/event/:eventId/rsvp" element={<RsvpPage />} />
        <Route path="/event/:eventId/edit-rsvp/:token" element={<EditRsvpPage />} />
        <Route path="/event/:eventId/category/:categoryId" element={<CategoryPage />} />
      </Route>

      {/* Admin login has no shared nav chrome */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin (Cass-only) routes */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/event/new" element={<EventFormPage />} />
        <Route path="/admin/event/:eventId" element={<EventFormPage />} />
        <Route path="/admin/event/:eventId/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/event/:eventId/attendees" element={<AdminAttendeesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
