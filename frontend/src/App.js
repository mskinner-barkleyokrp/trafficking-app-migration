// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'; 
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute'; // Import our new component
import { Dashboard } from './pages/Dashboard';
import { PlacementBuilder } from './pages/PlacementBuilder';
import { UTMBuilder } from './pages/UTMBuilder';
import { CheckoutForm } from './pages/CheckoutForm';
import { Login } from './pages/Login';
import { Templates } from './pages/Templates';
import { ClientsCampaigns } from './pages/ClientsCampaigns';
import { TraffickingQueue } from './pages/TraffickingQueue';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-[#fff8ee]">
        {user && <Navbar />}
        <main className={`flex-1 ${user ? 'p-4 sm:p-6' : ''}`}>
          <Routes>
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/" replace />}
            />
            <Route
              path="/*"
              element={
                user ? (
                  <Routes>
                    {/* Routes available to all logged-in users */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/placements" element={<PlacementBuilder />} />
                    <Route path="/utms" element={<UTMBuilder />} />
                    <Route path="/checkout" element={<CheckoutForm />} />
                    
                    {/* AdOps-only routes wrapped in ProtectedRoute */}
                    <Route
                      path="/clients-campaigns"
                      element={
                        <ProtectedRoute allowedRoles={['adops']}>
                          <ClientsCampaigns />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/trafficking-queue"
                      element={
                        <ProtectedRoute allowedRoles={['adops']}>
                          <TraffickingQueue />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/templates"
                      element={
                        <ProtectedRoute allowedRoles={['adops']}>
                          <Templates />
                        </ProtectedRoute>
                      }
                    />

                    {/* Redirect any other authenticated routes to dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;