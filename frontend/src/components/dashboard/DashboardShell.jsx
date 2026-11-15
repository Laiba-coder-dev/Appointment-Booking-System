import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, LayoutDashboard, CalendarDays, CreditCard, Star,
  Bell, User, LogOut, Menu, X, ChevronLeft, Search, Settings,
  Users, Building2, Briefcase, Wallet, BarChart3, MessageSquare,
  Clock, Home, Sparkles, Shield, FolderKanban, CheckCircle2, Layers, Inbox
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import api from '../../services/api';
import { initials } from '../../utilities/format';

/* ------------------------- nav definitions ------------------------- */

const NAVS = {
  customer: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/dashboard/payments', label: 'Payments', icon: CreditCard },
    { to: '/dashboard/reviews', label: 'My Reviews', icon: Star },
    { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { to: '/dashboard/profile', label: 'Profile', icon: User }
  ],
  provider: [
    { to: '/provider', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/provider/requests', label: 'Booking requests', icon: Inbox, badge: 'requests' },
    { to: '/provider/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/provider/services', label: 'My Services', icon: Briefcase },
    { to: '/provider/availability', label: 'Availability', icon: Clock },
    { to: '/provider/customers', label: 'Customers', icon: Users },
    { to: '/provider/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/provider/reviews', label: 'Reviews', icon: MessageSquare },
    { to: '/provider/profile', label: 'Profile', icon: Settings }
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/providers', label: 'Providers', icon: Building2 },
    { to: '/admin/services', label: 'Services', icon: Layers },
    { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/admin/payments', label: 'Payments', icon: Wallet },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 }
  ]
};

const ROLE_META = {
  customer: { title: 'Customer Portal', home: '/dashboard', accent: 'bg-rosewood' },
  provider: { title: 'Provider Hub', home: '/provider', accent: 'bg-gold' },
  admin: { title: 'Admin Console', home: '/admin', accent: 'bg-softrose' }
};

/* ------------------------- notifications popover ------------------------- */

function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${unread} unread)`}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-edge bg-white text-burgundy transition-all duration-300 hover:border-burgundy-300 hover:shadow-card"
      >
        <Bell className="h-4.5 w-4.5 h-5 w-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-burgundy px-1 text-[10px] font-extrabold text-ivory ring-2 ring-white"
          >
            {unread > 99 ? '99+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[340px] overflow-hidden rounded-2xl border border-edge bg-white shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-edge bg-ivory px-4 py-3">
              <p className="text-sm font-bold text-burgundy-800">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-bold uppercase tracking-wider text-rosewood hover:text-burgundy"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[340px] overflow-y-auto">
              {items.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 h-7 w-7 text-burgundy-200" />
                  <p className="text-sm font-semibold text-charcoal">You're all caught up</p>
                  <p className="mt-1 text-xs text-muted">New activity will appear here.</p>
                </div>
              )}

              {items.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markRead(n.id);
                    setOpen(false);
                  }}
                  className={`flex w-full gap-3 border-b border-edge/70 px-4 py-3 text-left transition hover:bg-ivory ${
                    n.is_read ? 'opacity-65' : 'bg-burgundy-50/40'
                  }`}
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      n.type === 'success' ? 'bg-emerald-500'
                      : n.type === 'warning' ? 'bg-amber-500'
                      : n.type === 'payment' ? 'bg-gold'
                      : n.type === 'appointment' ? 'bg-burgundy'
                      : 'bg-rosewood'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-charcoal">{n.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{n.message}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted/70">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------- the shell ------------------------- */

export default function DashboardShell({ role, title, children, breadcrumb }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const nav = NAVS[role] || [];
  const meta = ROLE_META[role] || ROLE_META.customer;

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebarInner = (
    <div className="flex h-full flex-col">
      {/* brand */}
      <div className={`flex items-center gap-2.5 border-b border-white/10 px-5 py-5 ${collapsed ? 'justify-center px-2' : ''}`}>
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ivory">
            <CalendarCheck className="h-4.5 w-4.5 h-5 w-5 text-burgundy" strokeWidth={2.2} />
          </span>
          {!collapsed && (
            <span className="font-display text-lg font-bold text-ivory">
              Appoint<span className="text-softrose">ify</span>
            </span>
          )}
        </Link>
      </div>

      {/* role chip */}
      {!collapsed && (
        <div className="px-5 pt-5">
          <span className="badge border border-white/15 bg-white/10 text-ivory/85">
            <Shield className="h-3 w-3" /> {meta.title}
          </span>
        </div>
      )}

      {/* nav */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label={meta.title}>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-300 ease-elegant ${
                collapsed ? 'justify-center px-2' : ''
              } ${
                isActive
                  ? 'bg-ivory text-burgundy-800 shadow-card'
                  : 'text-ivory/70 hover:bg-white/10 hover:text-ivory'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={`side-pill-${role}`}
                    className="absolute inset-0 -z-10 rounded-xl bg-ivory"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                <item.icon
                  className={`h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-burgundy' : ''
                  }`}
                  strokeWidth={1.9}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.label === 'Notifications' && role === 'customer' && <NotifDot />}
                {!collapsed && item.badge === 'requests' && role === 'provider' && <RequestsDot />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* footer */}
      <div className="border-t border-white/10 p-3">
        <Link
          to="/"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ivory/60 transition hover:bg-white/10 hover:text-ivory ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <Home className="h-4 w-4" />
          {!collapsed && 'Back to website'}
        </Link>
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-softrose transition hover:bg-white/10 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-lightbg">
      {/* ============ Desktop sidebar ============ */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 78 : 264 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 left-0 z-40 hidden overflow-hidden bg-burgundy-800 lg:block"
      >
        <div className="absolute inset-0 noise" />
        <div className="relative h-full">{sidebarInner}</div>

        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-24 z-10 grid h-7 w-7 place-items-center rounded-full border border-edge bg-white text-burgundy shadow-card transition hover:scale-110"
        >
          <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </motion.aside>

      {/* ============ Mobile sidebar ============ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-burgundy-950/55 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[264px] overflow-hidden bg-burgundy-800 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-ivory"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative h-full">{sidebarInner}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ============ Main ============ */}
      <div style={{ marginLeft: undefined }} className="lg:pl-[264px]">
        <motion.div
          initial={false}
          animate={{ paddingLeft: 0 }}
          className="min-h-screen"
        >
          {/* ---- Topbar ---- */}
          <header className="sticky top-0 z-30 border-b border-edge bg-ivory/90 backdrop-blur-xl">
            <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="grid h-10 w-10 place-items-center rounded-xl border border-edge bg-white text-burgundy lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-rosewood">
                  {meta.title}
                </p>
                <h1 className="truncate font-display text-lg leading-tight text-burgundy-800 sm:text-xl">
                  {breadcrumb || title}
                </h1>
              </div>

              {/* quick search (decorative jump-to) */}
              <div className="relative hidden xl:block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  placeholder="Search…"
                  aria-label="Search"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const q = e.currentTarget.value.trim();
                      if (!q) return;
                      const map = {
                        customer: '/dashboard/appointments',
                        provider: '/provider/appointments',
                        admin: '/admin/appointments'
                      };
                      navigate(`${map[role]}?search=${encodeURIComponent(q)}`);
                    }
                  }}
                  className="field !w-64 !py-2.5 !pl-10 !text-[13px]"
                />
              </div>

              <NotificationBell />

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-edge bg-white py-1.5 pl-1.5 pr-2.5 transition-all duration-300 hover:border-burgundy-300 hover:shadow-card"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-burgundy-gradient text-[11px] font-bold text-ivory">
                    {initials(user?.name || '')}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-xs font-bold text-charcoal sm:block">
                    {user?.name}
                  </span>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-2xl border border-edge bg-white shadow-lift"
                      role="menu"
                    >
                      <div className="border-b border-edge bg-ivory px-4 py-3">
                        <p className="truncate text-sm font-bold text-charcoal">{user?.name}</p>
                        <p className="truncate text-xs text-muted">{user?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link to={`${meta.home}/profile`} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal hover:bg-ivory hover:text-burgundy">
                          <User className="h-4 w-4" /> Account settings
                        </Link>
                        <Link to="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal hover:bg-ivory hover:text-burgundy">
                          <Home className="h-4 w-4" /> Website
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-burgundy-600 hover:bg-burgundy-50"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* ---- Page content ---- */}
          <main className="px-4 py-6 sm:px-6 sm:py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </motion.div>
      </div>
    </div>
  );
}

function NotifDot() {
  const { unread } = useNotifications();
  if (!unread) return null;
  return (
    <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-burgundy px-1.5 text-[10px] font-extrabold text-ivory">
      {unread}
    </span>
  );
}

/** Live count of unapproved booking requests (provider sidebar badge). */
function RequestsDot() {
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get('/api/appointments?status=pending&limit=1')
      .then((res) => { if (alive) setCount(res.data?.data?.pagination?.total || 0); })
      .catch(() => { /* badge is decorative */ });
    return () => { alive = false; };
  }, [location.pathname]);

  if (!count) return null;
  return (
    <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-gold px-1.5 text-[10px] font-extrabold text-burgundy-800">
      {count > 99 ? '99+' : count}
    </span>
  );
}
