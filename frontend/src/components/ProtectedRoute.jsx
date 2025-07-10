import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Show a loading spinner while the auth state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  // This check is a safeguard. The main routing in App.js already handles non-logged-in users.
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If no specific roles are required, allow any logged-in user.
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }
  
  const isAuthorized = allowedRoles.includes(user.role);

  if (!isAuthorized) {
    // If the user is not authorized, redirect them to the main dashboard page.
    return <Navigate to="/" replace />;
  }

  // If authorized, render the component.
  return children;
};