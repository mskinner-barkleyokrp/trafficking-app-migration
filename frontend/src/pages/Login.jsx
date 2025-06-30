import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Loader2Icon } from 'lucide-react'
import { Button } from '../components/Button'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../lib/api'

export const Login = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setError('Google OAuth authentication failed')
        return
      }

      if (code) {
        setIsLoading(true)
        try {
          const data = await apiClient.handleGoogleCallback(code)
          // The apiClient.handleGoogleCallback already sets the token
          // We just need to trigger a page reload or update the auth context
          window.location.href = '/'
        } catch (err) {
          setError('Authentication failed. Please try again.')
          console.error('OAuth callback error:', err)
        } finally {
          setIsLoading(false)
        }
      }
    }

    handleOAuthCallback()
  }, [searchParams])

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    
    try {
      const response = await apiClient.getGoogleAuthUrl()
      // Redirect to Google OAuth
      window.location.href = response.url
    } catch (err) {
      setError('Failed to initiate Google login')
      console.error('Google OAuth error:', err)
      setIsLoading(false)
    }
  }

  // If we're processing an OAuth callback, show loading
  if (searchParams.get('code') && isLoading) {
    return (
      <div className="min-h-screen bg-[#fff8ee] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex flex-col items-center">
            <Loader2Icon size={32} className="animate-spin text-[#ff501c] mb-4" />
            <p className="text-gray-600">Completing sign in...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fff8ee] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-3xl font-bold text-center text-[#ff501c] mb-2">
          MissionOneMedia
        </h1>
        <h2 className="mt-3 text-center text-2xl font-bold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-black/10">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              fullWidth
              disabled={isLoading}
              className="flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2Icon size={16} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Secure authentication powered by Google
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}