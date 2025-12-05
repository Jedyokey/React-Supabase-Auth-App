import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"
import SignIn from "./pages/SignInPage/SignIn"
import SignUp from "./pages/SignInPage/SignUp"
import Dashboard from "./pages/Dashboard"
import OrdersLive from "./pages/OrdersLive"
import CreatePost from "./pages/CreatePost"
import Analytics from "./pages/Analytics"
import Settings from "./pages/Settings"
import RecoverPassword from "./pages/RecoverPassword"
import UpdatePassword from "./pages/UpdatePassword"
import ProtectedRoute from "./components/ProtectedRoute"
import AuthConfirmHandler from "./components/AuthConfirmHandler"

// Custom hook for scroll restoration
function useScrollRestoration() {
  const location = useLocation();
  
  // Save scroll position before leaving
  useEffect(() => {
    const saveScrollPosition = () => {
      sessionStorage.setItem(`scrollPos:${location.pathname}`, window.scrollY.toString());
    };
    
    return saveScrollPosition;
  }, [location.pathname]);
  
  // Restore scroll position when coming back
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem(`scrollPos:${location.pathname}`);
    if (savedScrollY !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollY, 10));
      });
    } else {
      // Scroll to top if first visit to this page
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);
}

function AppContent() {
  const { user, loading } = useAuth();
  
  // Use the scroll restoration hook
  useScrollRestoration();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg text-gray-500">
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      {/* Default route redirects to sign in */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />} />

      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/recover-password" element={<RecoverPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
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

      <Route
        path="/dashboard/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/create-post"
        element={
          <ProtectedRoute>
            <CreatePost />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/signin" />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App