import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarCheck, ArrowLeft } from 'lucide-react';

export default function AuthLayout() {
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';

  return (
    <div className="relative min-h-screen overflow-hidden bg-ivory lg:grid lg:grid-cols-2">
      {/* ---------- Left: brand panel ---------- */}
      <div className="relative hidden overflow-hidden bg-burgundy-gradient lg:block">
        <div className="noise absolute inset-0" />
        <div className="absolute -left-24 top-1/4 h-[26rem] w-[26rem] rounded-full bg-rosewood/35 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-[22rem] w-[22rem] rounded-full bg-gold/10 blur-3xl" />

        {/* floating glass cards */}
        <motion.div
          animate={{ y: [0, -16, 0], rotate: [-3, 1, -3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-16 top-32 w-60 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ivory/95 text-burgundy">✓</span>
            <div>
              <p className="text-xs font-bold text-ivory">Appointment confirmed</p>
              <p className="text-[11px] text-ivory/60">Today · 10:30 AM</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 14, 0], rotate: [2, -2, 2] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-36 right-14 w-56 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-softrose">This week</p>
          <p className="mt-1 font-display text-2xl text-ivory">12 bookings</p>
          <div className="mt-3 flex gap-1.5">
            {[42, 65, 38, 80, 55, 92, 70].map((h, i) => (
              <span key={i} className="w-full rounded-full bg-ivory/45" style={{ height: h / 2.6 }} />
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2.5 text-ivory">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ivory">
              <CalendarCheck className="h-5 w-5 text-burgundy" strokeWidth={2.2} />
            </span>
            <span className="font-display text-xl font-bold">Appointify</span>
          </Link>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-5xl leading-[1.1] text-ivory"
            >
              Your Time.<br />
              Your Schedule.<br />
              <span className="italic text-softrose">Your Way.</span>
            </motion.h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/65">
              Join thousands who plan their days with Appointify — seamless booking,
              beautiful calendars and professionals who value your time.
            </p>

            <div className="mt-8 flex items-center gap-8 border-t border-white/10 pt-6">
              {[
                ['12k+', 'Bookings'],
                ['340+', 'Professionals'],
                ['4.9', 'Avg. rating']
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-display text-2xl text-ivory">{v}</p>
                  <p className="text-[11px] uppercase tracking-wider text-ivory/50">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ivory/60 transition hover:text-ivory"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </div>

      {/* ---------- Right: form ---------- */}
      <div className="relative flex min-h-screen items-center justify-center px-5 py-14 sm:px-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-burgundy-100/60 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[440px]"
        >
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-burgundy-gradient">
              <CalendarCheck className="h-5 w-5 text-ivory" strokeWidth={2.2} />
            </span>
            <span className="font-display text-xl font-bold text-burgundy-800">Appointify</span>
          </Link>

          <p className="eyebrow">{isLogin ? 'Welcome back' : 'Create your account'}</p>
          <h2 className="mt-2.5 font-display text-4xl text-burgundy-800">
            {isLogin ? 'Sign in to Appointify' : 'Join Appointify'}
          </h2>
          <p className="mt-2.5 text-sm text-muted">
            {isLogin
              ? 'Enter your details to access your bookings and schedule.'
              : 'Create an account in seconds — book your first appointment today.'}
          </p>

          <div className="mt-8">
            <Outlet />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
