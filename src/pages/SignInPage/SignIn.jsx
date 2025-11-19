import { useState } from "react"
import { supabase } from "../../supabaseClient"
import { useNavigate } from "react-router-dom"
import PasswordToggler from "../../components/PasswordToggler"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      let { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        // .range(0, 9)

        // Read specific columns (Supabase)
        // .select('id, name')

        // Filters (Supabase)
        // .eq('name', 'Mary Johnson')
        // .lte('price', 500.00)
        .gt('price', 400)

      if (error) {
        console.error("Error fetching orders:", error)
        return
      }

      console.log("Orders:", orders)
      console.log(`Total orders: ${orders?.length || 0}`)
    } catch (err) {
      console.error("Unexpected error fetching orders:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMessage("Invalid email or password, or email not verified.")
      setLoading(false)
      return
    }

    alert("Signed in successfully!")
    setLoading(false)

    if (data.user) {
      await supabase.from("clients").upsert(
        {
          email: data.user.email,
          user_id: data.user.id,
          is_active: true,
        },
        { onConflict: "email" }
      )
    }

    // Fetch and display orders in console
    await fetchOrder()

    navigate("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 p-8">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800">Sign In</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
            </div>

            {/* PASSWORD FIELD (REUSABLE COMPONENT) */}
            <PasswordToggler
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="text-right mt-2">
              <a
                href="/recover-password"
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Forgot password?
              </a>
            </div>

            {errorMessage && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-md text-sm">
                {errorMessage} 
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold py-2.5 px-4 rounded-md shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 cursor-pointer
              ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg hover:scale-[1.02]"}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-purple-600 hover:text-purple-800 font-medium transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
