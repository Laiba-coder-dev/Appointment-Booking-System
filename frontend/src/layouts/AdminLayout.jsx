import { Outlet, useLocation } from 'react-router-dom';
import DashboardShell from '../components/dashboard/DashboardShell';

const TITLES = {
  '/admin': 'Platform overview',
  '/admin/users': 'User management',
  '/admin/providers': 'Provider management',
  '/admin/services': 'Service management',
  '/admin/appointments': 'All appointments',
  '/admin/payments': 'Transactions',
  '/admin/reports': 'Reports & analytics'
};

export default function AdminLayout() {
  const { pathname } = useLocation();
  return (
    <DashboardShell role="admin" title={TITLES[pathname] || 'Admin Console'}>
      <Outlet />
    </DashboardShell>
  );
}
