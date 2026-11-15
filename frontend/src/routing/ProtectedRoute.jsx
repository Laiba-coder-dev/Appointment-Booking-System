import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/ui/LoadingScreen';

/**
 * Guards routes by authentication and role.
 * - Unauthenticated → /login (with a return path)
 * - Wrong role → redirect to that role's home
 */
const ROLE_HOME = {
  admin: '/admin',
  provider: '/provider',
  customer: '/dashboard'
};

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (roles && roles.length && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }

  return children;
}

export { ROLE_HOME };
