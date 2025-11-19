import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../supabaseClient"

const PAGE_SIZE = 10

export default function OrdersLive() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const sortOrders = (list) =>
    [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching orders:", error)
    } else {
      setOrders(sortOrders(data || []))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("Realtime event:", payload)

          setOrders((prev) => {
            if (payload.eventType === "INSERT") {
              const filtered = prev.filter((order) => order.id !== payload.new.id)
              return sortOrders([payload.new, ...filtered])
            }

            if (payload.eventType === "UPDATE") {
              return sortOrders(
                prev.map((order) => (order.id === payload.new.id ? payload.new : order))
              )
            }

            if (payload.eventType === "DELETE") {
              return prev.filter((order) => order.id !== payload.old.id)
            }

            return prev
          })
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
    setOrderToDelete(order)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setOrderToDelete(null)
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

    closeModal()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Live Orders
              </h1>
              <p className="text-sm text-gray-500">
                Monitor inserts, updates, and deletes in real-time
              </p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg shadow hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
            >
              <span aria-hidden="true">←</span>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Realtime Updates</h2>
              <p className="text-sm text-gray-500">
                Showing {paginatedOrders.length} of {orders.length} total orders
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchOrders}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading orders…</div>
          ) : paginatedOrders.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No orders found…</p>
          ) : (
            <ul className="space-y-4">
              {paginatedOrders.map((order) => (
                <li
                  key={order.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-800">{order.name}</p>
                      <p className="text-sm text-gray-600">
                        {order.address}, {order.city}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-indigo-600 font-semibold">${order.price}</p>
                        <p className="text-xs text-gray-400">{order.zip_code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-not-allowed"
                          title="Edit feature coming soon"
                          disabled
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(order)}
                          className="px-3 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg shadow hover:bg-red-600 transition"
                        >
                          Delete
                        </button>
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
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                    currentPage === 1
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                    currentPage === totalPages
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-right text-sm text-gray-600">
            Total Orders: <span className="font-semibold text-gray-900">{orders.length}</span>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {isModalOpen && orderToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Order</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the order for{" "}
              <span className="font-semibold text-gray-900">{orderToDelete.name}</span>? This
              action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                disabled={isDeleting}
              >
                No, keep it
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 shadow transition disabled:opacity-70"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
