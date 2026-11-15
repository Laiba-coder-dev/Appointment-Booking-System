import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, CheckCircle2, Clock, Hourglass, Wallet, ArrowRight,
  Plus, CalendarCheck, Star, Sparkles, AlertCircle, Receipt
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { useAuth } from '../../context/AuthContext';
import { PageIntro, StatCard, Panel, StateBlock } from '../../components/ui/DashboardBits';
import { StatusBadge, Stars, EmptyState } from '../../components/ui/Primitives';
import { formatMoney, formatDate, formatTime, relativeTime, initials } from '../../utilities/format';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Awaiting approval' },
  { key: 'cancelled', label: 'Cancelled' }
];

export default function CustomerOverviewPage() {
  useDocumentTitle('Welcome back');
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/dashboard/stats');
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Could not load your dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};
  const spend = data?.spend || {};
  const upcoming = data?.upcoming || [];
  const recent = data?.recent || [];

  const firstName = (user?.name || 'there').split(' ')[0];

  return (
    <div>
      <PageIntro
        eyebrow={`Signed in as ${user?.role === 'customer' ? 'customer' : user?.role}`}
        title={`Welcome back, ${firstName}`}
        description="Here's everything coming up — plus a quick look at your booking history."
        actions={
          <>
            <Link to="/dashboard/appointments" className="btn-secondary !py-2.5 text-sm">
              <CalendarDays className="h-4 w-4" /> All appointments
            </Link>
            <Link to="/services" className="btn-primary !py-2.5 text-sm">
              <Plus className="h-4 w-4" /> Book new
            </Link>
          </>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        {data && (
          <>
            {/* ------------------------------ KPI row ------------------------------ */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={CalendarDays} label="Total bookings" value={Number(stats.total) || 0}
                sub="All-time appointments" delay={0} />
              <StatCard icon={Clock} label="Upcoming" value={Number(stats.upcoming) || 0}
                sub={`${Number(stats.pending) || 0} awaiting professional approval`} tone="rosewood" delay={0.06} />
              <StatCard icon={CheckCircle2} label="Completed" value={Number(stats.completed) || 0}
                sub="Visits you've made" tone="emerald" delay={0.12} />
              <StatCard icon={Wallet} label="Total spent" value={formatMoney(spend.total_spent)}
                sub={`${Number(spend.payments) || 0} payment${Number(spend.payments) === 1 ? '' : 's'} settled`} tone="gold" delay={0.18} />
            </div>

            {/* ------------------------------ main grid ------------------------------ */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              {/* upcoming */}
              <Panel
                title="Your next appointments"
                subtitle="Sorted by soonest first"
                action={
                  <Link to="/dashboard/appointments" className="btn-ghost !py-2 text-xs">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
                flush
              >
                <StateBlock
                  loading={false}
                  empty={upcoming.length === 0}
                  emptyIcon={CalendarCheck}
                  emptyTitle="No upcoming appointments"
                  emptyDescription="When you book something it will appear here with live status."
                >
                  <ul className="divide-y divide-edge/70">
                    {upcoming.map((a, i) => (
                      <motion.li
                        key={a.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-ivory/50 sm:px-6"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-burgundy-gradient font-display text-sm text-ivory">
                          {initials(a.provider_name)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-display text-[15px] text-burgundy-800">{a.service_name}</p>
                            <StatusBadge status={a.status} label={a.status === 'pending' ? 'Awaiting approval' : undefined} />
                            {a.payment_status === 'paid' && <StatusBadge status="paid" label="Paid" />}
                          </div>
                          <p className="mt-1 truncate text-xs text-muted">
                            with {a.provider_name} · {a.duration_min} min
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-charcoal">
                            {formatDate(a.start_at, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted">
                            {formatTime(a.start_at)} · {relativeTime(a.start_at)}
                          </p>
                        </div>

                        <Link
                          to={`/services/${a.service_id}`}
                          className="grid h-9 w-9 place-items-center rounded-full border border-edge bg-white text-burgundy transition hover:border-burgundy"
                          aria-label={`View ${a.service_name}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </StateBlock>
              </Panel>

              {/* right column */}
              <div className="space-y-6">
                {/* quick actions */}
                <Panel title="Quick actions">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { to: '/services', icon: Sparkles, label: 'Browse services', primary: true },
                      { to: '/professionals', icon: Star, label: 'Find a professional' },
                      { to: '/dashboard/payments', icon: Receipt, label: 'Payment history' },
                      { to: '/dashboard/reviews', icon: CheckCircle2, label: 'Write a review' }
                    ].map((a) => (
                      <Link
                        key={a.label}
                        to={a.to}
                        className={`group rounded-2xl border p-4 text-left transition-all duration-400 ease-elegant hover:-translate-y-1 hover:shadow-lift ${
                          a.primary ? 'border-burgundy bg-burgundy text-ivory' : 'border-edge bg-white hover:border-burgundy-200'
                        }`}
                      >
                        <span className={`grid h-9 w-9 place-items-center rounded-xl ${a.primary ? 'bg-white/15' : 'bg-burgundy-50 text-burgundy'}`}>
                          <a.icon className={`h-4 w-4 ${a.primary ? 'text-ivory' : ''}`} />
                        </span>
                        <p className={`mt-3 text-[13px] font-bold ${a.primary ? 'text-ivory' : 'text-charcoal'}`}>
                          {a.label}
                        </p>
                      </Link>
                    ))}
                  </div>
                </Panel>

                {/* recent activity */}
                <Panel
                  title="Recent activity"
                  action={
                    <Link to="/dashboard/appointments" className="btn-ghost !py-1.5 text-xs">History</Link>
                  }
                  flush
                >
                  {recent.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <Hourglass className="mx-auto mb-2 h-6 w-6 text-rosewood" />
                      <p className="text-sm font-bold text-charcoal">Nothing yet</p>
                      <p className="mt-1 text-xs text-muted">Your booking history will show up here.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-edge/70">
                      {recent.map((a) => (
                        <li key={a.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${
                            a.status === 'completed' ? 'bg-emerald-500'
                            : a.status === 'pending' ? 'bg-amber-500'
                            : a.status === 'confirmed' ? 'bg-burgundy'
                            : 'bg-rosewood'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-charcoal">{a.service_name}</p>
                            <p className="truncate text-[11.5px] text-muted">{a.provider_name}</p>
                          </div>
                          <StatusBadge status={a.status} label={a.status === 'pending' ? 'Awaiting approval' : undefined} className="!text-[10px]" />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>

            {/* ------------------------------ membership banner ------------------------------ */}
            <div className="relative mt-6 overflow-hidden rounded-[28px] bg-burgundy-gradient p-6 text-ivory sm:p-8">
              <div className="noise absolute inset-0" />
              <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-rosewood/35 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-5">
                <div>
                  <span className="eyebrow !text-softrose">
                    <span className="h-px w-8 bg-softrose/70" /> Appointify
                  </span>
                  <p className="mt-3 max-w-lg font-display text-xl leading-snug text-ivory sm:text-2xl">
                    Free cancellation up to 24 hours before every appointment.
                  </p>
                  <p className="mt-2 text-sm text-ivory/65">
                    Reschedule or move a booking from your appointments page — no phone calls needed.
                  </p>
                </div>
                <Link to="/services" className="btn-gold shrink-0">
                  <Sparkles className="h-4 w-4" /> Book something new
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </StateBlock>

      {!loading && !error && !data && (
        <EmptyState
          icon={AlertCircle}
          title="No dashboard data"
          description="We couldn't find any activity for this account yet."
          action={<button onClick={load} className="btn-primary">Refresh</button>}
        />
      )}
    </div>
  );
}
