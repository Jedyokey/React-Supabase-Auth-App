import { useState } from "react"
import { supabase } from "../../supabaseClient"
import { useNavigate } from "react-router-dom"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    // console.log("Sign in attempted with:", { email, password })

    // Sign in user
    const {data, error} = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      return
    }

    console.log("Signed in:", data)
    alert("Signed in successfully!")

    // Add sign-in log/notification to 'clients' table
    // Use the user's ID for the user_id column
    if (data.user) {
        const { error: insertError } = await supabase.from("clients").upsert({
          email: data.user.email,
          user_id: data.user.id, // Supabase user ID
          is_active: true, // Assuming a successful sign-in means the user is active
        },
        { onConflict: "email" }
      )

      if (insertError) {
        console.error("Error logging client sign-in:", insertError)
      } else {
        console.log("Client sign-in logged successfully (created or updated).")
      }
    }

    // Redirect to dashboard
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

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
            </div>

            <div className="text-right mt-2">
              <a
                href="/recover-password"
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Forgot password?
              </a>
            </div>


            {/* Stylish Gradient Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold py-2.5 px-4 rounded-md shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 cursor-pointer"
            >
              Sign In
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