import { useTheme } from '../ThemeContext';

const Loading = ({ type = "page" }) => {
  const { theme } = useTheme();
  
  const bgGradient = theme === 'dark' 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
    : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50';
  
  const headerBg = theme === 'dark' 
    ? 'bg-gray-800/80 dark:bg-gray-800/80' 
    : 'bg-white/80';
  
  const cardBg = theme === 'dark' 
    ? 'bg-gray-800 border-gray-700' 
    : 'bg-white border-gray-100';
  
  const skeletonColor = theme === 'dark' 
    ? 'bg-gray-700' 
    : 'bg-gray-200';
  
  const textColor = theme === 'dark' 
    ? 'text-gray-300' 
    : 'text-gray-600';
  
  if (type === "page") {
    return (
      <div className={`min-h-screen ${bgGradient} transition-colors duration-200`}>
        {/* Header Skeleton */}
        <header className={`${headerBg} backdrop-blur-md border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className={`h-8 w-32 ${skeletonColor} rounded animate-pulse`}></div>
              <div className="flex items-center gap-4">
                <div className={`h-8 w-24 ${skeletonColor} rounded animate-pulse`}></div>
                <div className={`h-8 w-8 rounded-full ${skeletonColor} animate-pulse`}></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className={`h-10 w-64 ${skeletonColor} rounded mb-4 animate-pulse`}></div>
            <div className={`h-4 w-48 ${skeletonColor} rounded animate-pulse`}></div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${cardBg} rounded-xl shadow-md border p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg ${skeletonColor} animate-pulse`}></div>
                </div>
                <div className={`h-4 w-24 ${skeletonColor} rounded mb-2 animate-pulse`}></div>
                <div className={`h-8 w-32 ${skeletonColor} rounded mb-4 animate-pulse`}></div>
                <div className={`h-3 w-40 ${skeletonColor} rounded animate-pulse`}></div>
              </div>
            ))}
          </div>

          {/* Quick Actions Card */}
          <div className={`${cardBg} rounded-xl shadow-md border p-6`}>
            <div className={`h-6 w-32 ${skeletonColor} rounded mb-4 animate-pulse`}></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`p-4 ${skeletonColor} rounded-lg animate-pulse`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} animate-pulse`}></div>
                    <div className="space-y-2">
                      <div className={`h-4 w-20 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded animate-pulse`}></div>
                      <div className={`h-3 w-16 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded animate-pulse`}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Simple spinner for smaller loads
  return (
    <div className={`flex items-center justify-center min-h-screen ${bgGradient}`}>
      <div className="text-center">
        <div className="inline-block relative">
          <div className={`w-12 h-12 rounded-full border-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}></div>
          <div className={`w-12 h-12 rounded-full border-4 ${theme === 'dark' ? 'border-indigo-500' : 'border-indigo-600'} border-t-transparent absolute top-0 left-0 animate-spin`}></div>
        </div>
        <p className={`mt-4 text-lg ${textColor}`}>Loading...</p>
      </div>
    </div>
  );
};

export default Loading;