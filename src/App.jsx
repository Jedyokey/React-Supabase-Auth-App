import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import SignIn from "./pages/SignInPage/SignIn"
import SignUp from "./pages/SignInPage/SignUp"
import Dashboard from "./pages/Dashboard"
import OrdersLive from "./pages/OrdersLive"
import RecoverPassword from "./pages/RecoverPassword"
import UpdatePassword from "./pages/UpdatePassword"
import ProtectedRoute from "./components/ProtectedRoute"
import AuthConfirmHandler from "./components/AuthConfirmHandler"

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg text-gray-500">
        Loading...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Default route redirects to sign in */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />} />

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/recover-password" element={<RecoverPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Add this new route for handling Supabase auth confirmations */}
        <Route path="/auth/confirm" element={<AuthConfirmHandler />} />

        {/* Protected route for dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/orders"
          element={
            <ProtectedRoute>
              <OrdersLive />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/signin" />} />
      </Routes>
    </Router>
  )
}

export default App
