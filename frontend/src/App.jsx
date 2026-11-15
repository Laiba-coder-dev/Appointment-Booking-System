import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProviderLayout from './layouts/ProviderLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routing/ProtectedRoute';
import LoadingScreen from './components/ui/LoadingScreen';
import ScrollToTop from './components/ui/ScrollToTop';

/* ---------- Public ---------- */
import LandingPage from './pages/LandingPage';
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));
const ProvidersPage = lazy(() => import('./pages/ProvidersPage'));
const ProviderDetailPage = lazy(() => import('./pages/ProviderDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));

/* ---------- Auth ---------- */
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

/* ---------- Customer dashboard ---------- */
const CustomerOverview = lazy(() => import('./pages/customer/OverviewPage'));
const CustomerAppointments = lazy(() => import('./pages/customer/AppointmentsPage'));
const CustomerPayments = lazy(() => import('./pages/customer/PaymentsPage'));
const CustomerReviews = lazy(() => import('./pages/customer/ReviewsPage'));
const CustomerProfile = lazy(() => import('./pages/customer/ProfilePage'));
const CustomerNotifications = lazy(() => import('./pages/customer/NotificationsPage'));

/* ---------- Provider ---------- */
const ProviderOverview = lazy(() => import('./pages/provider/OverviewPage'));
const ProviderAppointments = lazy(() => import('./pages/provider/AppointmentsPage'));
const ProviderRequests = lazy(() => import('./pages/provider/RequestsPage'));
const ProviderServices = lazy(() => import('./pages/provider/ServicesPage'));
const ProviderAvailability = lazy(() => import('./pages/provider/AvailabilityPage'));
const ProviderCustomers = lazy(() => import('./pages/provider/CustomersPage'));
const ProviderAnalytics = lazy(() => import('./pages/provider/AnalyticsPage'));
const ProviderProfile = lazy(() => import('./pages/provider/ProfilePage'));
const ProviderReviews = lazy(() => import('./pages/provider/ReviewsPage'));

/* ---------- Admin ---------- */
const AdminOverview = lazy(() => import('./pages/admin/OverviewPage'));
const AdminUsers = lazy(() => import('./pages/admin/UsersPage'));
const AdminProviders = lazy(() => import('./pages/admin/ProvidersPage'));
const AdminServices = lazy(() => import('./pages/admin/ServicesPage'));
const AdminAppointments = lazy(() => import('./pages/admin/AppointmentsPage'));
const AdminPayments = lazy(() => import('./pages/admin/PaymentsPage'));
const AdminReports = lazy(() => import('./pages/admin/ReportsPage'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.remove('overflow-hidden');
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingScreen />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* ============ PUBLIC ============ */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
              <Route path="/services" element={<PageTransition><ServicesPage /></PageTransition>} />
              <Route path="/services/:id" element={<PageTransition><ServiceDetailPage /></PageTransition>} />
              <Route path="/professionals" element={<PageTransition><ProvidersPage /></PageTransition>} />
              <Route path="/professionals/:id" element={<PageTransition><ProviderDetailPage /></PageTransition>} />
              <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
              <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
            </Route>

            {/* ============ BOOKING (public, own shell) ============ */}
            <Route
              path="/book"
              element={
                <ProtectedRoute roles={['customer']}>
                  <PageTransition><BookingPage /></PageTransition>
                </ProtectedRoute>
              }
            />

            {/* ============ AUTH ============ */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* ============ CUSTOMER DASHBOARD ============ */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute roles={['customer']}><DashboardLayout /></ProtectedRoute>}
            >
              <Route index element={<CustomerOverview />} />
              <Route path="appointments" element={<CustomerAppointments />} />
              <Route path="payments" element={<CustomerPayments />} />
              <Route path="reviews" element={<CustomerReviews />} />
              <Route path="notifications" element={<CustomerNotifications />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>

            {/* ============ PROVIDER DASHBOARD ============ */}
            <Route
              path="/provider"
              element={<ProtectedRoute roles={['provider', 'admin']}><ProviderLayout /></ProtectedRoute>}
            >
              <Route index element={<ProviderOverview />} />
              <Route path="appointments" element={<ProviderAppointments />} />
              <Route path="requests" element={<ProviderRequests />} />
              <Route path="services" element={<ProviderServices />} />
              <Route path="availability" element={<ProviderAvailability />} />
              <Route path="customers" element={<ProviderCustomers />} />
              <Route path="analytics" element={<ProviderAnalytics />} />
              <Route path="reviews" element={<ProviderReviews />} />
              <Route path="profile" element={<ProviderProfile />} />
            </Route>

            {/* ============ ADMIN DASHBOARD ============ */}
            <Route
              path="/admin"
              element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}
            >
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  );
}
