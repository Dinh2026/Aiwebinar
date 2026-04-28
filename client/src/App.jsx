import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
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

function ThemedToaster() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Toaster position="top-right" toastOptions={{
      style: {
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#0f172a',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        borderRadius: '12px',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.08)',
      },
      success: { iconTheme: { primary: '#10b981', secondary: isDark ? '#f1f5f9' : '#fff' } },
      error: { iconTheme: { primary: '#ef4444', secondary: isDark ? '#f1f5f9' : '#fff' } },
    }} />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ThemedToaster />
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
    </ThemeProvider>
  );
}
