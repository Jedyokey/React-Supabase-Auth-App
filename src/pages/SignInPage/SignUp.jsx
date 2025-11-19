import { useState } from "react"
import { supabase } from "../../supabaseClient"
import { useNavigate } from "react-router-dom"
import PasswordToggler from "../../components/PasswordToggler"

export default function SignUp() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage("")
    setLoading(true)

    if (password !== confirmPassword) {
      alert("Passwords do not match")
      setLoading(false);
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/",
        },
      });

      if (error) {
        console.error("Supabase error:", error);
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      alert("Check your email to confirm your account!");
      navigate("/signin");

    } catch (err) {
      console.error("Network error:", err);
      setErrorMessage("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 p-8">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800">Sign Up</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create a new account to get started
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

            {/* PASSWORD */}
            <PasswordToggler
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* CONFIRM PASSWORD */}
            <PasswordToggler
              id="confirmPassword"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 
              text-white font-semibold py-2.5 px-4 rounded-md shadow-md transition-all duration-300 
              focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 cursor-pointer
              ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg hover:scale-[1.02]"}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Signing Up...</span>
                </div>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/signin")}
                className="text-purple-600 hover:text-purple-800 font-medium transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
