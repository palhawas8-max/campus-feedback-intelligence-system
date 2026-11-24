import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import FeedbackForm from './pages/FeedbackForm'
import MySubmissions from './pages/MySubmissions'
import AdminDashboard from './pages/AdminDashboard'
import AdminTickets from './pages/AdminTickets'
import StudentLayout from './components/Layout/StudentLayout'
import AdminLayout from './components/Layout/AdminLayout'

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="skeleton w-32 h-8" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/feedback'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Student routes */}
      <Route path="/" element={<PrivateRoute role="student"><StudentLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/feedback" replace />} />
        <Route path="feedback" element={<FeedbackForm />} />
        <Route path="my-submissions" element={<MySubmissions />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<PrivateRoute role="admin"><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="tickets" element={<AdminTickets />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
