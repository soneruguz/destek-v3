import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingScreen from './components/ui/LoadingScreen';

// Normal imports to debug lazy loading issue
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import TicketsPage from './pages/Tickets';
import TicketDetailPage from './pages/TicketDetail';
import NewTicketPage from './pages/NewTicket';
import DepartmentsPage from './pages/Departments';
import UsersPage from './pages/Users';
import ProfilePage from './pages/Profile';
import SystemSettingsPage from './pages/SystemSettings';
import NotFoundPage from './pages/NotFound';
// Wiki sayfaları
import WikiListPage from './pages/WikiList';
import WikiDetailPage from './pages/WikiDetail';
import WikiCreatePage from './pages/WikiCreate';
// Login logs sayfası
import LoginLogsPage from './pages/LoginLogs';
import ReportsPage from './pages/Reports';
import NotificationsPage from './pages/Notifications';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ToastProvider>
      <NotificationProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Authenticated Routes */}
            {user ? (
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/tickets/new" element={<NewTicketPage />} />
                <Route path="/tickets/:id" element={<TicketDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                {/* Wiki routes */}
                <Route path="/wikis" element={<WikiListPage />} />
                <Route path="/wikis/new" element={<WikiCreatePage />} />
                <Route path="/wikis/:id" element={<WikiDetailPage />} />
                {user.is_admin && (
                  <>
                    <Route path="/departments" element={<DepartmentsPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/settings" element={<SystemSettingsPage />} />
                    <Route path="/settings" element={<SystemSettingsPage />} />
                    <Route path="/login-logs" element={<LoginLogsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                  </>
                )}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            ) : (
              /* Unauthenticated Routes */
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Route>
            )}
          </Routes>
        </Suspense>
      </NotificationProvider>
    </ToastProvider>
  );
}

export default App;
