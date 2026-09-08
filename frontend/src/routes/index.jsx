import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../auth/ProtectedRoute';
import ContentLayout from '../layouts/ContentLayout';
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import Dashboard from '../pages/Dashboard';
import ProjectList from '../pages/Projects/ProjectList';
import CreateProject from '../pages/Projects/CreateProject';
import ProjectWorkspace from '../pages/Projects/ProjectWorkspace';
import Customers from '../pages/Customers';
import Brokers from '../pages/Brokers';
import Payments from '../pages/Payments';
import Documents from '../pages/Documents';
import Analytics from '../pages/Analytics';
import Settings from '../pages/Settings';
import ComponentsShowcase from '../pages/ComponentsShowcase';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Unprotected Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/components" element={<ComponentsShowcase />} />

      {/* Protected App Shell Layout Routes */}
      <Route element={<ProtectedRoute><ContentLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<CreateProject />} />
        {/* Wildcard: /projects/:id and /projects/:id/layout etc all go to workspace */}
        <Route path="/projects/:projectId/*" element={<ProjectWorkspace />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/brokers" element={<Brokers />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Catch-all route redirecting back to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
