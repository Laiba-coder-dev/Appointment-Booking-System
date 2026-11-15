import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, ChevronDown, CalendarCheck, LogOut, LayoutDashboard,
  User, Sparkles, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { initials } from '../utilities/format';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Professionals', to: '/professionals' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' }
];

const DASH_BY_ROLE = {
  customer: { to: '/dashboard', label: 'Dashboard' },
  provider: { to: '/provider', label: 'Provider Hub' },
  admin: { to: '/admin', label: 'Admin Console' }
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dash = user ? DASH_BY_ROLE[user.role] : null;
  const onHome = location.pathname === '/';

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-elegant ${
          scrolled || open
            ? 'bg-ivory/90 backdrop-blur-xl border-b border-edge shadow-[0_4px_24px_-16px_rgba(72,20,33,0.35)]'
            : onHome
              ? 'bg-transparent border-b border-transparent'
              : 'bg-ivory/80 backdrop-blur-md border-b border-edge/70'
        }`}
      >
        <div className="container-x flex h-[72px] items-center justify-between gap-4">
          {/* ---- Logo ---- */}
          <Link to="/" className="group flex items-center gap-2.5 shrink-0" aria-label="Appointify home">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-burgundy-gradient shadow-glow transition-transform duration-400 ease-elegant group-hover:rotate-6 group-hover:scale-105">
              <CalendarCheck className="h-5 w-5 text-ivory" strokeWidth={2.2} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold-gradient ring-2 ring-ivory" />
            </span>
            <span className="font-display text-[1.42rem] font-bold tracking-tight text-burgundy-800">
              Appoint<span className="text-rosewood">ify</span>
            </span>
          </Link>

          {/* ---- Desktop nav ---- */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ease-elegant ${
                    isActive
                      ? 'text-burgundy'
                      : scrolled || !onHome
                        ? 'text-muted hover:text-burgundy hover:bg-burgundy-50'
                        : 'text-ivory/85 hover:text-ivory hover:bg-white/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-white shadow-card ring-1 ring-edge"
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* ---- Right actions ---- */}
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className={`btn-ghost ${scrolled || !onHome ? '' : 'text-ivory hover:bg-white/10 hover:text-ivory'}`}
                >
                  Login
                </Link>
                <Link to="/register" className="btn-primary btn-sm !py-2.5">
                  Sign Up
                </Link>
                <Link to="/services" className="btn-gold btn-sm !py-2.5">
                  Book Now
                </Link>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2" ref={menuRef}>
                <Link
                  to={dash?.to || '/'}
                  className={`btn-ghost ${scrolled || !onHome ? '' : 'text-ivory hover:bg-white/10 hover:text-ivory'}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {dash?.label}
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full border border-edge bg-white/80 py-1.5 pl-1.5 pr-3 transition-all duration-300 hover:border-burgundy-300 hover:shadow-card"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-burgundy-gradient text-[11px] font-bold text-ivory">
                      {initials(user.name)}
                    </span>
                    <span className="max-w-[90px] truncate text-xs font-bold text-charcoal">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-2xl border border-edge bg-white shadow-lift"
                        role="menu"
                      >
                        <div className="border-b border-edge bg-ivory px-4 py-3">
                          <p className="truncate text-sm font-bold text-charcoal">{user.name}</p>
                          <p className="truncate text-xs text-muted">{user.email}</p>
                          <span className="badge mt-2 bg-burgundy-50 text-burgundy-700 border border-burgundy-100 capitalize">
                            {user.role}
                          </span>
                        </div>
                        <div className="p-1.5">
                          <Link to={dash?.to || '/'} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-ivory hover:text-burgundy">
                            <LayoutDashboard className="h-4 w-4" /> {dash?.label}
                          </Link>
                          <Link to="/dashboard/notifications" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-ivory hover:text-burgundy">
                            <Bell className="h-4 w-4" /> Notifications
                            {unread > 0 && (
                              <span className="ml-auto rounded-full bg-burgundy px-2 py-0.5 text-[10px] font-bold text-ivory">
                                {unread}
                              </span>
                            )}
                          </Link>
                          <Link to="/dashboard/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-ivory hover:text-burgundy">
                            <User className="h-4 w-4" /> Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-burgundy-600 transition hover:bg-burgundy-50"
                          >
                            <LogOut className="h-4 w-4" /> Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Link to="/book" className="btn-primary btn-sm !py-2.5">
                  Book Now
                </Link>
              </div>
            )}

            {/* ---- Mobile toggle ---- */}
            <button
              onClick={() => setOpen((v) => !v)}
              className={`grid h-10 w-10 place-items-center rounded-xl border transition-all lg:hidden ${
                scrolled || open || !onHome
                  ? 'border-edge bg-white text-burgundy'
                  : 'border-white/25 bg-white/10 text-ivory backdrop-blur'
              }`}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={open ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ---- Mobile panel ---- */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-edge bg-ivory/100 backdrop-blur-xl lg:hidden"
            >
              <div className="container-x flex flex-col gap-1 py-5">
                {NAV.map((item, i) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.045 }}
                  >
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold transition ${
                          isActive ? 'bg-burgundy text-ivory' : 'text-charcoal hover:bg-cream'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </motion.div>
                ))}

                <div className="mt-3 border-t border-edge pt-4">
                  {!isAuthenticated ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link to="/login" className="btn-secondary">Login</Link>
                      <Link to="/register" className="btn-primary">Sign Up</Link>
                      <Link to="/services" className="btn-gold col-span-2">
                        <Sparkles className="h-4 w-4" /> Book an Appointment
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link to={dash?.to || '/'} className="btn-secondary">
                        <LayoutDashboard className="h-4 w-4" /> {dash?.label}
                      </Link>
                      <Link to="/book" className="btn-primary">Book Now</Link>
                      <Link to="/dashboard/profile" className="btn-ghost col-span-1">Profile</Link>
                      <button onClick={handleLogout} className="btn-ghost col-span-1 !text-burgundy-600">
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer only when the header overlays content */}
      <div className="h-0" />
    </>
  );
}
