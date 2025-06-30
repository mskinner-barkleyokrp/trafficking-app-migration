// src/components/LoadingSpinner.jsx
import React from 'react'

export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-[#fff8ee] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff501c]"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}