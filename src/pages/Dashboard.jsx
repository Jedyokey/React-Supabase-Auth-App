import React from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'

const Dashboard = () => {
  const { user } = useAuth()

    const handleLogout = async () => {
    try {
      console.log("Attempting logout...")
      
      // Simple direct approach
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("Logout Error:", error)
        // Don't redirect manually - the auth change will trigger redirect
        // window.location.href = "/signin"
      } else {
        console.log("User logged out successfully!")
        // window.location.href = "/signin"
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      // Always redirect to signin even on error
      // window.location.href = "/signin"
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 p-10 text-center">
        {user ? (
          <>
            <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
              Welcome back, <span className="text-purple-600">{user.email}</span>!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              You are successfully authenticated and viewing your dashboard.
            </p>
            {/* Display User ID (Optional, for debugging) */}
            <p className="text-sm text-gray-500 mb-6">
              **Supabase User ID:** <code className="bg-gray-100 p-1 rounded text-xs">{user.id}</code>
            </p>

            {/* Stylish Gradient Logout Button */}
            <button
              onClick={handleLogout}
              className="mt-6 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white font-semibold py-2.5 px-6 rounded-md shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 cursor-pointer"
            >
              Log Out
            </button>
          </>
        ) : (
          <h1 className="text-3xl font-bold text-gray-800">
            You are not signed in. Please sign in to view the dashboard.
          </h1>
        )}
      </div>
    </div>
  )
}

export default Dashboard
