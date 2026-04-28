import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import WebinarsPage from './pages/WebinarsPage';
import WebinarWizard from './pages/WebinarWizard';
import AttendeesPage from './pages/AttendeesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import WebinarRoom from './pages/WebinarRoom';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: '12px' },
        success: { iconTheme: { primary: '#10b981', secondary: '#f9fafb' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
      }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/room/:roomCode" element={<WebinarRoom />} />
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="webinars" element={<WebinarsPage />} />
          <Route path="webinars/new" element={<WebinarWizard />} />
          <Route path="webinars/:id/edit" element={<WebinarWizard />} />
          <Route path="attendees" element={<AttendeesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
