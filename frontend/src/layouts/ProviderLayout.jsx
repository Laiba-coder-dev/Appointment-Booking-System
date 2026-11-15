import { Outlet, useLocation } from 'react-router-dom';
import DashboardShell from '../components/dashboard/DashboardShell';

const TITLES = {
  '/provider': 'Provider overview',
  '/provider/appointments': 'Manage appointments',
  '/provider/services': 'My services',
  '/provider/availability': 'Working hours & availability',
  '/provider/customers': 'My customers',
  '/provider/analytics': 'Analytics',
  '/provider/reviews': 'Reviews',
  '/provider/profile': 'Profile settings'
};

export default function ProviderLayout() {
  const { pathname } = useLocation();
  return (
    <DashboardShell role="provider" title={TITLES[pathname] || 'Provider Hub'}>
      <Outlet />
    </DashboardShell>
  );
}
