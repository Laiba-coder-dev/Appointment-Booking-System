import { Outlet } from 'react-router-dom';
import DashboardShell from '../components/dashboard/DashboardShell';
import { useAuth } from '../context/AuthContext';

const TITLES = {
  '/dashboard': 'Welcome back',
  '/dashboard/appointments': 'Your appointments',
  '/dashboard/payments': 'Payment history',
  '/dashboard/reviews': 'Your reviews',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/profile': 'Profile settings'
};

export default function DashboardLayout() {
  const { user } = useAuth();
  return (
    <DashboardShell role="customer" title={TITLES[window.location.pathname] || 'Dashboard'}>
      <Outlet />
    </DashboardShell>
  );
}
