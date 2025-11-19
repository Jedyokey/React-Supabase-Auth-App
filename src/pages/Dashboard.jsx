import React from 'react'
import { Link } from "react-router-dom";
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'

const Dashboard = () => {
  const { user } = useAuth()

  // Insert an order
  const insertOrder = async () => {
    try {
      // First, get the client_id from the clients table using the user's user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (clientError || !clientData) {
        console.error("Error fetching client:", clientError)
        alert("Error: Could not find client record. Please ensure you have signed up.")
        return
      }

      // Insert the order with the fetched client_id
      const { data, error } = await supabase
        .from('orders')
        .insert({
          address: "324 Main Avenue",
          zip_code: "11990",
          city: "New York",
          name: "Emily Williams",
          price: 34,
          client_id: clientData.id
        })
        .select()

      if (error) {
        console.error("Error inserting order:", error)
        alert(`Error inserting order: ${error.message}`)
        return
      }

      if (data) {
        console.log("Order inserted successfully:", data)
        alert("Order inserted successfully! Check the console for details.")
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      alert(`Unexpected error: ${error.message}`)
    }
  }

  // Update an order for Emily Williams
  const updateOrderEmilyWilliams = async () => {
    try {
      // First, get the client_id from the clients table using the user's user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (clientError || !clientData) {
        console.error("Error fetching client:", clientError)
        alert("Error: Could not find client record. Please ensure you have signed up.")
        return
      }

      // Find an order with name "Emily Williams" to update
      const { data: existingOrder, error: findError } = await supabase
        .from('orders')
        .select('id')
        .eq('name', 'Emily Williams')
        .limit(1)
        .single()

      if (findError || !existingOrder) {
        console.error("Error finding order:", findError)
        alert("Error: Could not find an order for Emily Williams. Please insert an order first.")
        return
      }

      // Update the order with new values for all fields
      const { data, error } = await supabase
        .from('orders')
        .update({
          address: "456 Oak Street",
          zip_code: "10001",
          city: "Los Angeles",
          name: "Emily Williams",
          price: 75,
          client_id: clientData.id
        })
        .eq('id', existingOrder.id)
        .select()

      if (error) {
        console.error("Error updating order:", error)
        alert(`Error updating order: ${error.message}`)
        return
      }

      if (data) {
        console.log("Order updated successfully:", data)
        alert("Order updated successfully! Check the console for details.")
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      alert(`Unexpected error: ${error.message}`)
    }
  }

  // Delete Emily Williams Order
  const deleteEmilyWilliamOrder = async () => {
    try {
      // Find an order with name "Emily Williams" to delete
      const { data: existingOrder, error: findError } = await supabase
        .from('orders')
        .select('id')
        .eq('name', 'Emily Williams')
        .limit(1)
        .single()

      if (findError || !existingOrder) {
        console.error("Error finding order:", findError)
        alert("Error: Could not find an order for Emily Williams to delete.")
        return
      }

      // Delete the order
      // RLS policy will automatically ensure user can only delete their own orders
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', existingOrder.id)

      if (error) {
        console.error("Error deleting order:", error)
        alert(`Error deleting order: ${error.message}`)
        return
      }

      console.log("Order deleted successfully")
      alert("Order deleted successfully! Check the console for details.")
    } catch (error) {
      console.error("Unexpected error:", error)
      alert(`Unexpected error: ${error.message}`)
    }
  }


  const handleLogout = async () => {
    try {
      console.log("Attempting logout...")
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("Logout Error:", error)
      } else {
        console.log("User logged out successfully!")
      }
    } catch (err) {
      console.error("Unexpected error:", err)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            You are not signed in. Please sign in to view the dashboard.
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header/Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-600 font-medium">{user.email}</span>
              </div>
              <Link
                to="/dashboard/orders"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
              >
                View Live Orders
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600">
            Here's an overview of your account
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* User Info Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Account Status</h3>
            <p className="text-2xl font-bold text-gray-800">Active</p>
            <p className="text-xs text-gray-500 mt-2">Verified user account</p>
          </div>

          {/* Email Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Email Address</h3>
            <p className="text-lg font-semibold text-gray-800 truncate">{user.email}</p>
            <p className="text-xs text-gray-500 mt-2">Your registered email</p>
          </div>

          {/* User ID Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">User ID</h3>
            <p className="text-sm font-mono font-semibold text-gray-800 truncate">{user.id}</p>
            <p className="text-xs text-gray-500 mt-2">Unique identifier</p>
          </div>
        </div>

        {/* Insert, Update, and Delete Order Buttons */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            onClick={insertOrder}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
          >
            Insert an Order
          </button>
          <button
            onClick={updateOrderEmilyWilliams}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
          >
            Update Order
          </button>
          <button
            onClick={deleteEmilyWilliamOrder}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
          >
            Delete Order
          </button>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg hover:from-indigo-100 hover:to-indigo-200 transition-all duration-200 text-left group">
              <div className="p-2 bg-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Create New</p>
                <p className="text-xs text-gray-600">Start a new project</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 text-left group">
              <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">View Reports</p>
                <p className="text-xs text-gray-600">Check your analytics</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg hover:from-pink-100 hover:to-pink-200 transition-all duration-200 text-left group">
              <div className="p-2 bg-pink-500 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Settings</p>
                <p className="text-xs text-gray-600">Manage preferences</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
