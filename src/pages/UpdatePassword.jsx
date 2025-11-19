import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate, useSearchParams } from "react-router-dom"
import PasswordToggler from "../components/PasswordToggler"

export default function UpdatePassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("Waiting for password input...")

    useEffect(() => {
    const hash = window.location.hash
    const tokenFromParams = searchParams.get('token')  
    
    // Scenario 1: Direct Supabase link (with hash)
    if (hash && hash.includes("access_token")) {
        setMessage("Please enter your new password")
        return
    }
    
    // Scenario 2: Coming from AuthConfirmHandler (with token parameter)
    if (tokenFromParams) {
        setMessage("Please enter your new password")
        return
    }
    
    // No valid token found
    setTimeout(() => {
        if (!supabase.auth.getUser()) {
            setError("Invalid password recovery link. Please try again from the 'Forgot Password' page.")
        }
    }, 1000)
  }, [searchParams])  

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
        setLoading(false)
        setError("Passwords do not match.")
        return
    }

    // Call updateUser. This works because the access_token in the URL hash 
    // has already been used by the Supabase client to set a temporary session.
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(`Failed to update password: ${error.message}`)
    } else {
      setMessage("✅ Password updated successfully! Redirecting to Sign In...")
      
      // Clear URL fragment and sign out the temporary session
      window.history.replaceState({}, document.title, window.location.pathname)
      await supabase.auth.signOut()

      // Redirect back to sign-in page 
      setTimeout(() => navigate("/signin"), 3000)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleUpdate}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Set New Password</h2>

        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded border border-red-200">{error}</p>}
        {message && !error && <p className="text-gray-600 text-sm mb-4">{message}</p>}

        {/* NEW PASSWORD */}
        <PasswordToggler
          id="password"
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* CONFIRM NEW PASSWORD */}
        <PasswordToggler
          id="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold py-2.5 rounded-md shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  )
}