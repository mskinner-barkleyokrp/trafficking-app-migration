// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'; // Ensure using react-router-dom
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PlacementBuilder } from './pages/PlacementBuilder';
import { UTMBuilder } from './pages/UTMBuilder';
// import { PlanDetails } from './pages/PlanDetails'; // Assuming commented out based on Navbar
import { CheckoutForm } from './pages/CheckoutForm';
// import { Settings } from './pages/Settings'; // Assuming commented out
import { Login } from './pages/Login';
import { Templates } from './pages/Templates';
import { ClientsCampaigns } from './pages/ClientsCampaigns';
import { TraffickingQueue } from './pages/TraffickingQueue'; // Import the new page
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
        <main className={`flex-1 ${user ? 'p-4 sm:p-6' : ''}`}> {/* Adjusted padding */}
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
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clients-campaigns" element={<ClientsCampaigns />} />
                    <Route path="/placements" element={<PlacementBuilder />} />
                    <Route path="/utms" element={<UTMBuilder />} />
                    {/* <Route path="/plan-details" element={<PlanDetails />} /> */}
                    <Route path="/checkout" element={<CheckoutForm />} />
                    <Route path="/trafficking-queue" element={<TraffickingQueue />} /> {/* Add new route */}
                    {/* <Route path="/settings" element={<Settings />} /> */}
                    <Route path="/templates" element={<Templates />} />
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