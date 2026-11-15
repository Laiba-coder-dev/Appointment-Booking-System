import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, CheckCircle2, Clock, Users, Wallet, ArrowRight,
  Plus, Hourglass, X, UserCheck, Briefcase, Star, AlertCircle, CalendarClock
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { useAuth } from '../../context/AuthContext';
import { PageIntro, StatCard, Panel, StateBlock, ConfirmDialog } from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney, formatDate, formatTime, relativeTime, initials, truncate } from '../../utilities/format';
import toast from 'react-hot-toast';

const TRANSITIONS = {
  pending: { confirm: 'confirmed', reject: 'rejected' }
};

export default function ProviderOverviewPage() {
  useDocumentTitle('Provider overview');
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busyId, setBusyId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [stats, ov] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/provider/overview').catch(() => null)
      ]);
      setData(stats.data?.data || null);
      setOverview(ov?.data?.data || null);
    } catch (err) {
      setError(err.message || 'Could not load your dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (row, status) => {
    try {
      setBusyId(row.id);
      await api.patch(`/api/appointments/${row.id}/status`, { status });
      toast.success(
        status === 'confirmed'
          ? `Appointment confirmed — ${row.customer_name} has been emailed`
          : 'Appointment declined'
      );
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update this appointment');
    } finally {
      setBusyId(null);
    }
  };

  const stats = data?.stats || {};
  const revenue = data?.revenue || {};
  const customers = data?.customers || {};
  const today = data?.today || [];
  const upcoming = data?.upcoming || [];
  const pending = data?.pending || [];
  const firstName = (user?.name || 'there').split(' ')[0];

  const profile = overview?.profile;
  const profileComplete = profile
    ? [profile.headline, profile.bio, profile.specialization, profile.location, profile.experience_years]
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length
    : 0;

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title={`Good day, ${firstName}`}
        description="Your schedule, requests and earnings — all in one place."
        actions={
          <>
            <Link to="/provider/availability" className="btn-secondary !py-2.5 text-sm">
              <Clock className="h-4 w-4" /> Set hours
            </Link>
            <Link to="/provider/services" className="btn-primary !py-2.5 text-sm">
              <Plus className="h-4 w-4" /> Add service
            </Link>
          </>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        {data && (
          <>
            {/* ------------------------------ KPIs ------------------------------ */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={CalendarClock} label="Today" value={Number(stats.today) || 0}
                sub={`${formatDate(new Date(), { weekday: 'long', month: 'short', day: 'numeric' })}`} delay={0} />
              <StatCard icon={Users} label="Customers" value={Number(customers.total) || 0}
                sub={`${Number(stats.total) || 0} bookings all-time`} tone="rosewood" delay={0.06} />
              <StatCard icon={Wallet} label="Revenue" value={formatMoney(revenue.total)}
                sub={`${formatMoney(revenue.today)} today`} tone="gold" delay={0.12} />
              <StatCard icon={CheckCircle2} label="Completed" value={Number(stats.completed) || 0}
                sub={`${Number(stats.pending) || 0} awaiting your response`} tone="emerald" delay={0.18} />
            </div>

            {/* ------------------------------ main grid ------------------------------ */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <div className="space-y-6">
                {/* pending requests */}
                <Panel
                  title="Booking requests"
                  subtitle="Confirm or decline — customers are notified instantly"
                  action={<Link to="/provider/requests" className="btn-ghost !py-2 text-xs">Open queue <ArrowRight className="h-3.5 w-3.5" /></Link>}
                  flush
                >
                  <StateBlock
                    loading={false}
                    empty={pending.length === 0}
                    emptyIcon={CheckCircle2}
                    emptyTitle="No pending requests"
                    emptyDescription="New booking requests will appear here for approval."
                  >
                    <ul className="divide-y divide-edge/70">
                      {pending.map((r, i) => (
                        <motion.li
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.25) }}
                          className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-ivory/50 sm:px-6"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-burgundy-50 font-display text-sm text-burgundy">
                            {initials(r.customer_name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-charcoal">{r.customer_name}</p>
                              <StatusBadge status={r.status} />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {r.service_name} · {r.duration_min} min · {r.customer_email}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-charcoal">
                              {formatDate(r.start_at, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-muted">{formatTime(r.start_at)} · {relativeTime(r.start_at)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => act(r, TRANSITIONS.pending.confirm)}
                              disabled={busyId === r.id}
                              className="btn btn-sm border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                              aria-label={`Confirm appointment for ${r.customer_name}`}
                            >
                              {busyId === r.id ? <Spinner className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmTarget(r)}
                              disabled={busyId === r.id}
                              className="btn btn-sm border border-edge bg-white px-3.5 py-2 text-xs font-bold text-muted hover:border-burgundy-200 hover:text-burgundy"
                              aria-label={`Decline appointment for ${r.customer_name}`}
                            >
                              <X className="h-3.5 w-3.5" /> Decline
                            </button>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </StateBlock>
                </Panel>

                {/* today */}
                <Panel
                  title="Today's schedule"
                  subtitle={`${today.length} appointment${today.length === 1 ? '' : 's'} on the books`}
                  action={<Link to="/provider/appointments" className="btn-ghost !py-2 text-xs">Open day view</Link>}
                  flush
                >
                  <StateBlock
                    loading={false}
                    empty={today.length === 0}
                    emptyIcon={Hourglass}
                    emptyTitle="Nothing scheduled today"
                    emptyDescription="Enjoy the breather — or block extra time off in Availability."
                  >
                    <ul className="divide-y divide-edge/70">
                      {today.map((a) => (
                        <li key={a.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                          <div className="w-16 shrink-0 text-center">
                            <p className="font-display text-base text-burgundy-800">{formatTime(a.start_at)}</p>
                            <p className="text-[10.5px] text-muted">{a.duration_min} min</p>
                          </div>
                          <span className="h-9 w-px bg-edge" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-charcoal">{a.customer_name}</p>
                            <p className="truncate text-xs text-muted">{a.service_name}</p>
                          </div>
                          <StatusBadge status={a.status} />
                          {a.customer_phone && (
                            <a href={`tel:${a.customer_phone}`}
                              className="btn-ghost !hidden !py-1.5 text-xs sm:!inline-flex">
                              Call
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </StateBlock>
                </Panel>
              </div>

              {/* right column */}
              <div className="space-y-6">
                {/* profile completeness */}
                <Panel title="Profile strength">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0">
                      <svg viewBox="0 0 40 40" className="h-20 w-20 -rotate-90">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#E9DDD7" strokeWidth="5" />
                        <motion.circle
                          cx="20" cy="20" r="16" fill="none" stroke="#641E32" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 16}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - profileComplete / 5) }}
                          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </svg>
                      <span className="absolute inset-0 grid place-items-center font-display text-lg text-burgundy-800">
                        {Math.round((profileComplete / 5) * 100)}%
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-charcoal">
                        {profileComplete >= 5 ? 'Looking sharp!' : `${5 - profileComplete} field${5 - profileComplete === 1 ? '' : 's'} to go`}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        Complete profiles get up to 3× more bookings.
                      </p>
                      <Link to="/provider/profile" className="btn-secondary mt-2.5 !py-2 text-xs">
                        Edit profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </Panel>

                {/* quick stats */}
                <Panel title="At a glance">
                  <div className="space-y-3.5">
                    <MiniRow icon={Briefcase} label="Active services" value={overview?.services ?? '—'} />
                    <MiniRow icon={Clock} label="Working days" value={overview?.working_days ?? '—'} />
                    <MiniRow icon={Star} label="Rating"
                      value={profile?.rating_avg ? `${Number(profile.rating_avg).toFixed(1)} (${profile.review_count})` : 'No reviews yet'} />
                    <MiniRow icon={CalendarDays} label="Upcoming" value={Number(stats.upcoming) || 0} />
                    <MiniRow icon={X} label="Cancelled" value={Number(stats.cancelled) || 0} />
                  </div>
                </Panel>

                {/* upcoming */}
                <Panel
                  title="Coming up"
                  action={<Link to="/provider/appointments" className="btn-ghost !py-1.5 text-xs">All</Link>}
                  flush
                >
                  {upcoming.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <CalendarDays className="mx-auto mb-2 h-6 w-6 text-rosewood" />
                      <p className="text-sm font-bold text-charcoal">No upcoming visits</p>
                      <p className="mt-1 text-xs text-muted">Keep your availability current to attract more.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-edge/70">
                      {upcoming.map((a) => (
                        <li key={a.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-charcoal">{a.customer_name}</p>
                            <p className="truncate text-[11.5px] text-muted">{a.service_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-charcoal">
                              {formatDate(a.start_at, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-[11px] text-muted">{formatTime(a.start_at)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>
          </>
        )}
      </StateBlock>

      {!loading && !error && !data && (
        <EmptyState
          icon={AlertCircle}
          title="No dashboard data"
          description="We couldn't find provider activity for this account."
          action={<button onClick={load} className="btn-primary">Refresh</button>}
        />
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        tone="info"
        title="Decline this request?"
        message={confirmTarget
          ? `${confirmTarget.customer_name}'s request for ${confirmTarget.service_name} on ${formatDate(confirmTarget.start_at, { weekday: 'long', month: 'long', day: 'numeric' })} at ${formatTime(confirmTarget.start_at)} will be declined and they'll be notified by email.`
          : ''}
        confirmLabel="Decline request"
        cancelLabel="Keep pending"
        loading={!!busyId}
        onConfirm={() => act(confirmTarget, TRANSITIONS.pending.reject)}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

function MiniRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-burgundy-50 text-burgundy">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-charcoal">{label}</span>
      <span className="shrink-0 font-display text-base text-burgundy-800">{value}</span>
    </div>
  );
}
