import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"
import SignIn from "./pages/SignInPage/SignIn"
import SignUp from "./pages/SignInPage/SignUp"
import RecoverPassword from "./pages/RecoverPassword"
import UpdatePassword from "./pages/UpdatePassword"
import AuthConfirmHandler from "./components/AuthConfirmHandler"
import ProtectedRoute from "./components/ProtectedRoute"
import Loading from "./components/Loading" 

// Lazy load dashboard pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"))
const OrdersLive = lazy(() => import("./pages/OrdersLive"))
const CreatePost = lazy(() => import("./pages/CreatePost"))
const Analytics = lazy(() => import("./pages/Analytics"))
const Settings = lazy(() => import("./pages/Settings"))

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
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);
}

function AppContent() {
  const { user } = useAuth();
  
  useScrollRestoration();

  return (
    <Suspense fallback={<Loading type="page" />}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />} />

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/recover-password" element={<RecoverPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/auth/confirm" element={<AuthConfirmHandler />} />

        {/* Protected routes */}
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

        <Route path="*" element={<Navigate to="/signin" />} />
      </Routes>
    </Suspense>
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