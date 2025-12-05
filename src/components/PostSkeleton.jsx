// components/PostSkeleton.jsx
import React from 'react';

const PostSkeleton = () => {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 animate-pulse">
      {/* Author skeleton */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32 mb-1"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      
      {/* Title skeleton */}
      <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      
      {/* Description skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/6"></div>
      </div>
      
      {/* Comments section skeleton */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
        </div>
        
        <div className="flex gap-2 mb-3">
          <div className="flex-1 h-9 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-16 h-9 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        </div>
        
        {/* Comment items skeleton */}
        <div className="space-y-3 mt-3">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostSkeleton;