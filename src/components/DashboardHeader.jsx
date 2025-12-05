import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DashboardHeader({ title }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const goToOrders = () => {
    navigate("/dashboard/orders");
  };

  const goToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between min-h-[80px] py-4 sm:py-0 sm:h-16">
        {/* LEFT SIDE - Back button + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToDashboard}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition px-1 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>
        </div>

        {/* RIGHT SIDE OPTIONS */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* View Live Orders Button */}
          <button
            onClick={goToOrders}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
          >
            Live Orders
          </button>

          {/* Log Out */}
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}