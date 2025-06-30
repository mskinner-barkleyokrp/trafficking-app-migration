// src/components/ErrorBoundary.jsx
import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fff8ee] flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg border border-red-200 max-w-md">
            <h2 className="text-xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              An error occurred while loading the application.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#ff501c] text-white px-4 py-2 rounded hover:bg-[#ff501c]/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}