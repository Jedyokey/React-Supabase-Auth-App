import { useState } from "react"
import { FiEye, FiEyeOff } from "react-icons/fi"

export default function PasswordToggler({ label, value, onChange, id }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Input */}
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        required
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all pr-10"
      />

      {/* Toggle Icon */}
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="
          absolute right-3 
          top-1/2 -translate-y-1/2 
          mt-3   /* Pushes icon down ONLY to match label height */
          text-gray-500 hover:text-gray-700
        "
      >
        {show ? <FiEyeOff size={20} /> : <FiEye size={20} />}
      </button>
    </div>
  )
}
