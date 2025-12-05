import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useTheme } from "../ThemeContext"
import { useAuth } from "../AuthContext"

const PAGE_SIZE = 10

export default function OrdersLive() {
  const navigate = useNavigate()
  const { user } = useAuth() // Get current user
  
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [orderToEdit, setOrderToEdit] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isInserting, setIsInserting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { theme } = useTheme()

  // Add state for current user's client ID
  const [currentClientId, setCurrentClientId] = useState(null)
  const [loadingClient, setLoadingClient] = useState(true)

  // Fetch current user's client ID
  useEffect(() => {
    const fetchCurrentClientId = async () => {
      if (!user) {
        setCurrentClientId(null)
        setLoadingClient(false)
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single()
          
        if (error) {
          console.error('Error fetching client ID:', error)
          setCurrentClientId(null)
        } else {
          setCurrentClientId(data?.id || null)
        }
      } catch (err) {
        console.error('Error fetching client ID:', err)
        setCurrentClientId(null)
      } finally {
        setLoadingClient(false)
      }
    }
    
    fetchCurrentClientId()
  }, [user])

  // Add this useEffect to check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false)
        return
      }
      
      // RLS will block unauthorized access
      setIsAdmin(user.id === '6a7eb85f-81e2-411d-b9dd-c09beb258306')
    }
    
    checkAdminStatus()
  }, [user])

  // Form state for insert/edit
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    zip_code: "",
    price: ""
  })

  // Check if user can modify (edit/delete) the order
  const canModifyOrder = (order) => {
    // Admin can modify all orders (Regular users can only modify their own orders)
    if (isAdmin) return true
    return currentClientId === order.client_id
  }

  // Open edit modal with order data
  const openEditModal = (order) => {
    // Check if user can edit this order
    if (!canModifyOrder(order)) {
      alert(isAdmin ? "You have admin rights" : "You can only edit orders that you created.")
      return
    }
    
    setOrderToEdit(order)
    setFormData({
      name: order.name || "",
      address: order.address || "",
      city: order.city || "",
      zip_code: order.zip_code || "",
      price: order.price || ""
    })
    setIsEditModalOpen(true)
  }

  // Open insert modal with empty form
  const openInsertModal = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      zip_code: "",
      price: ""
    })
    setIsInsertModalOpen(true)
  }

  const closeModals = () => {
    setIsEditModalOpen(false)
    setIsInsertModalOpen(false)
    setIsDeleteModalOpen(false)
    setOrderToEdit(null)
    setOrderToDelete(null)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Check if order already exists (for insert validation)
  const isDuplicateOrder = (name, address) => {
    return orders.some(order => 
      order.name.toLowerCase() === name.toLowerCase() && 
      order.address.toLowerCase() === address.toLowerCase()
    )
  }

  // Insert new order
  const handleInsert = async () => {
    // Validate required fields
    if (!formData.name || !formData.address || !formData.city || !formData.zip_code || !formData.price) {
      alert("Please fill in all fields")
      return
    }

    // Check for duplicates
    if (isDuplicateOrder(formData.name, formData.address)) {
      alert("An order with this name and address already exists")
      return
    }

    // Validate price is a number
    const price = parseFloat(formData.price)
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price")
      return
    }

    setIsInserting(true)

    try {
      // Get current user's client_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("User not authenticated")
        return
      }

      // Get client_id from clients table
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (clientError || !clientData) {
        console.error("Error fetching client:", clientError)
        alert("Error: Could not find client record")
        return
      }

      // Insert the new order - id and created_at are automatically generated by Supabase
      const { error } = await supabase
        .from('orders')
        .insert({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          zip_code: formData.zip_code,
          price: price,
          client_id: clientData.id
        })

      if (error) {
        console.error("Error inserting order:", error)
        alert(`Error inserting order: ${error.message}`)
        return
      }

      alert("Order inserted successfully!")
      closeModals()
    } catch (error) {
      console.error("Unexpected error:", error)
      alert(`Unexpected error: ${error.message}`)
    } finally {
      setIsInserting(false)
    }
  }

  // Update existing order
  const handleUpdate = async () => {
    if (!orderToEdit) return

    // Validate required fields
    if (!formData.name || !formData.address || !formData.city || !formData.zip_code || !formData.price) {
      alert("Please fill in all fields")
      return
    }

    // Validate price is a number
    const price = parseFloat(formData.price)
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price")
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          zip_code: formData.zip_code,
          price: price,
          client_id: orderToEdit.client_id
        })
        .eq('id', orderToEdit.id)

      if (error) {
        console.error("Error updating order:", error)
        alert(`Error updating order: ${error.message}`)
        return
      }

      // Force a refresh of the orders list to ensure we have the latest data
      await fetchOrders()

      alert("Order updated successfully!")
      closeModals()
    } catch (error) {
      console.error("Unexpected error:", error)
      alert(`Unexpected error: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const sortOrders = (list) =>
    [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const fetchOrders = async () => {
    setLoading(true)
    
    // First, get all orders with client info
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`*, clients (user_id, email, is_active)`)
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
      setLoading(false)
      return
    }

    if (!ordersData || ordersData.length === 0) {
      setOrders([])
      setLoading(false)
      return
    }

    // Get unique user IDs from the orders
    const userIds = ordersData
      .map(order => order.clients?.user_id)
      .filter(Boolean)
      .filter((id, index, self) => self.indexOf(id) === index)

    let profileMap = {}

    // Fetch profiles for these users
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (!profilesError && profilesData) {
        profilesData.forEach(profile => {
          // Find the order for this user to get email as fallback
          const userOrder = ordersData.find(order => 
            order.clients?.user_id === profile.id
          )
          const userEmail = userOrder?.clients?.email || ''
          
          profileMap[profile.id] = profile.full_name || 
            userEmail.split('@')[0] || // Use username part of email
            'User'
        })
      }
    }

    // Combine the data
    const ordersWithProfileNames = ordersData.map(order => ({
      ...order,
      client_profile_name: order.clients?.user_id 
        ? (profileMap[order.clients.user_id] || 
          order.clients.email?.split('@')[0] || 
          'User')
        : 'Unknown User'
    }))

    setOrders(sortOrders(ordersWithProfileNames))
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch complete data for the new order
            const { data: newOrder } = await supabase
              .from('orders')
              .select(`*, clients (user_id, email, is_active)`)
              .eq('id', payload.new.id)
              .single()

            if (newOrder?.clients?.user_id) {
              // Get profile name
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', newOrder.clients.user_id)
                .single()

              const orderWithProfile = {
                ...newOrder,
                client_profile_name: profile?.full_name || 
                  newOrder.clients?.email?.split('@')[0] || 
                  'User'
              }

              setOrders(prev => {
                const filtered = prev.filter(order => order.id !== orderWithProfile.id)
                return sortOrders([orderWithProfile, ...filtered])
              })
            }
          }

          if (payload.eventType === "UPDATE") {
            // Similar logic for updates
            const { data: updatedOrder } = await supabase
              .from('orders')
              .select(`*, clients (user_id, email, is_active)`)
              .eq('id', payload.new.id)
              .single()

            if (updatedOrder?.clients?.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', updatedOrder.clients.user_id)
                .single()

              const orderWithProfile = {
                ...updatedOrder,
                client_profile_name: profile?.full_name || 
                  updatedOrder.clients?.email?.split('@')[0] || 
                  'User'
              }

              setOrders(prev => sortOrders(
                prev.map(order => 
                  order.id === orderWithProfile.id ? orderWithProfile : order
                )
              ))
            }
          }

          if (payload.eventType === "DELETE") {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [orders, currentPage])

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return orders.slice(start, start + PAGE_SIZE)
  }, [orders, currentPage])

  const openDeleteModal = (order) => {
    // Check if user can delete this order
    if (!canModifyOrder(order)) {
      alert(isAdmin ? "You have admin rights" : "You can only delete orders that you created.")
      return
    }

    setOrderToDelete(order)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!orderToDelete) return
    setIsDeleting(true)
    const { error } = await supabase.from("orders").delete().eq("id", orderToDelete.id)
    setIsDeleting(false)

    if (error) {
      console.error("Error deleting order:", error)
      alert(`Error deleting order: ${error.message}`)
      return
    }

    closeModals()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">

      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between min-h-[80px] py-4 sm:py-0 sm:h-16">
          {/* LEFT SIDE - Title only */}
          <div className="flex flex-col gap-1 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Live Orders
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor inserts, updates, and deletes in real-time
            </p>
          </div>

          {/* RIGHT SIDE - Dashboard button */}
          <div className="flex items-center justify-end flex-shrink-0 ml-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Realtime Updates</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {paginatedOrders.length} of {orders.length} total orders
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openInsertModal}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition cursor-pointer"
              >
                Insert New Order
              </button>
              <button
                onClick={fetchOrders}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading orders…</div>
          ) : paginatedOrders.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-10">No orders found…</p>
          ) : (
            <ul className="space-y-4">
              {paginatedOrders.map((order) => (
                <li
                  key={order.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">{order.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {order.address}, {order.city}
                      </p>
                      
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {/* ALWAYS show the profile name for EVERY order */}
                        Created by: <span className="font-medium">{order.client_profile_name || 'Unknown User'}</span>

                        {currentClientId === order.client_id && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                            Your Order
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-indigo-600 dark:text-indigo-400 font-semibold">${order.price}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{order.zip_code}</p>
                      </div>
                      <div className="flex gap-2">
                        {canModifyOrder(order) ? (
                          // User owns this order - show enabled buttons
                          <>
                            <button
                              onClick={() => openEditModal(order)}
                              className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteModal(order)}
                              className="px-3 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg shadow hover:bg-red-600 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          // User doesn't own this order - show disabled buttons with tooltip
                          <div className="relative group">
                            <div className="flex gap-2">
                              <button
                                disabled
                                className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed opacity-70"
                              >
                                Edit
                              </button>
                              <button
                                disabled
                                className="px-3 py-2 text-xs font-semibold text-white bg-red-300 dark:bg-red-800 rounded-lg shadow cursor-not-allowed opacity-70"
                              >
                                Delete
                              </button>
                            </div>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                {isAdmin ? "Admin can edit all orders" : "You can only edit/delete your own orders"}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {orders.length > PAGE_SIZE && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                    currentPage === 1
                      ? "text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                    currentPage === totalPages
                      ? "text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-right text-sm text-gray-600 dark:text-gray-400">
            Total Orders: <span className="font-semibold text-gray-900 dark:text-white">{orders.length}</span>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && orderToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Delete Order</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the order for{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{orderToDelete.name}</span>? This
              action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                disabled={isDeleting}
              >
                No, keep it
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 shadow transition disabled:opacity-70 cursor-pointer"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && orderToEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Edit Order</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter city"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter ZIP code"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleFormChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter price"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition disabled:opacity-70 cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Order Modal */}
      {isInsertModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Insert New Order</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter customer name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter city"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code *</label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter ZIP code"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleFormChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter price"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                disabled={isInserting}
              >
                Cancel
              </button>
              <button
                onClick={handleInsert}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 shadow transition disabled:opacity-70 cursor-pointer"
                disabled={isInserting}
              >
                {isInserting ? "Inserting..." : "Insert Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}