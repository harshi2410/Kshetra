import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import useAuth from './useAuth';
import Loader from '../components/ui/Loader';

/**
 * ProtectedRoute Component
 * Guards routes against unauthenticated users and unauthorized role/permission access.
 */
export default function ProtectedRoute({
  requiredRole,
  requiredPermission,
  redirectTo = '/login',
  children
}) {
  const { isAuthenticated, loading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // 1. Loading State - Render full-screen subtle loading spinner
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-bg-app)]">
        <Loader size="xl" text="Initializing LandOS Session..." />
      </div>
    );
  }

  // 2. Unauthenticated - Redirect to login screen with return URL stored in location state
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 3. Role Restriction Check
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Permission Restriction Check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children or nested router Outlet
  return children ? children : <Outlet />;
}
