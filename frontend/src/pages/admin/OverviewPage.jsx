import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip
} from 'recharts';
import {
  Users, Building2, CalendarDays, Wallet, ArrowRight, AlertTriangle,
  CheckCircle2, Layers, Clock, Sparkles, TrendingUp, ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { useAuth } from '../../context/AuthContext';
import { PageIntro, StatCard, Panel, StateBlock, RowAction, ConfirmDialog } from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import {
  COLORS, CHART_MARGIN, axisProps, yAxisProps, monthLabel,
  moneyTick, ChartTooltip, ChartEmpty
} from '../../components/charts/ChartTheme';
import { formatMoney, formatDate } from '../../utilities/format';
import toast from 'react-hot-toast';

export default function AdminOverviewPage() {
  useDocumentTitle('Admin console');
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [st, rp, pr] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/admin/reports').catch(() => null),
        api.get('/api/admin/providers?approval=pending&limit=5').catch(() => null)
      ]);
      setStats(st.data?.data?.stats || null);
      setReports(rp?.data?.data || null);
      setPending(pr?.data?.data?.providers || []);
    } catch (err) {
      setError(err.message || 'Could not load the admin dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async () => {
    if (!dialog) return;
    try {
      setBusy(true);
      await api.patch(`/api/admin/providers/${dialog.id}/approval`, { approval_status: dialog.decision });
      toast.success(`Provider ${dialog.decision}`);
      setDialog(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update this provider');
    } finally {
      setBusy(false);
    }
  };

  const chart = (reports?.monthlyBookings || []).map((m) => ({
    ...m,
    label: monthLabel(m.month),
    total: Number(m.total) || 0,
    completed: Number(m.completed) || 0
  }));

  const firstName = (user?.name || 'admin').split(' ')[0];

  return (
    <div>
      <PageIntro
        eyebrow="Admin console"
        title={`Welcome, ${firstName}`}
        description="Platform health at a glance — users, bookings, revenue and anything waiting on you."
        actions={
          <>
            <Link to="/admin/providers" className="btn-secondary !py-2.5 text-sm">
              <Building2 className="h-4 w-4" /> Provider approvals
              {Number(stats?.pending_providers) > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {stats.pending_providers}
                </span>
              )}
            </Link>
            <Link to="/admin/reports" className="btn-primary !py-2.5 text-sm">
              <TrendingUp className="h-4 w-4" /> Full reports
            </Link>
          </>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        {stats && (
          <>
            {/* ------------------------------ KPI grid ------------------------------ */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Users} label="Total users" value={Number(stats.total_users).toLocaleString()}
                sub={`${Number(stats.total_customers)} customers · ${Number(stats.total_providers)} providers`} />
              <StatCard icon={CalendarDays} label="Appointments" value={Number(stats.total_appointments).toLocaleString()}
                sub={`${Number(stats.pending_appointments)} pending · ${Number(stats.confirmed_appointments)} confirmed`}
                tone="rosewood" delay={0.06} />
              <StatCard icon={Wallet} label="Gross revenue" value={formatMoney(stats.total_revenue)}
                sub="All captured payments" tone="gold" delay={0.12} />
              <StatCard icon={CheckCircle2} label="Completed" value={Number(stats.completed_appointments).toLocaleString()}
                sub={`${Number(stats.cancelled_appointments)} cancelled / rejected`} tone="emerald" delay={0.18} />
            </div>

            {/* ------------------------------ main grid ------------------------------ */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              {/* booking trend */}
              <Panel
                title="Booking volume"
                subtitle="Last 12 months — completed vs total"
                action={<Link to="/admin/reports" className="btn-ghost !py-2 text-xs">Reports <ArrowRight className="h-3.5 w-3.5" /></Link>}
              >
                <div className="h-[280px] w-full">
                  {chart.length === 0 ? <ChartEmpty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chart} margin={CHART_MARGIN}>
                        <defs>
                          <linearGradient id="admFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.burgundy} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={COLORS.burgundy} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis {...yAxisProps} allowDecimals={false} />
                        <RTooltip cursor={{ stroke: COLORS.rosewood, strokeDasharray: '3 3' }} content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="total" name="Total" stroke={COLORS.rosewood} strokeWidth={2}
                          fill="url(#admFill)" dot={{ r: 3, fill: COLORS.rosewood, strokeWidth: 0 }} />
                        <Area type="monotone" dataKey="completed" name="Completed" stroke={COLORS.burgundy} strokeWidth={2.5}
                          fill="none" dot={{ r: 3, fill: COLORS.burgundy, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>

              {/* needs attention */}
              <Panel
                title="Needs your attention"
                subtitle="Pending provider applications"
                action={<Link to="/admin/providers" className="btn-ghost !py-2 text-xs">Review all</Link>}
                flush
              >
                <StateBlock
                  loading={false}
                  empty={pending.length === 0}
                  emptyIcon={ShieldCheck}
                  emptyTitle="Queue is clear"
                  emptyDescription="No providers are waiting for approval."
                >
                  <ul className="divide-y divide-edge/70">
                    {pending.map((p, i) => (
                      <motion.li
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.05 }}
                        className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-charcoal">{p.name}</p>
                          <p className="truncate text-xs text-muted">
                            {p.specialization || 'Generalist'} · {p.email}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted/80">
                            Applied {formatDate(p.created_at, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDialog({ ...p, decision: 'approved' })}
                            className="btn btn-sm border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11.5px] font-bold text-emerald-700 hover:bg-emerald-100"
                            aria-label={`Approve ${p.name}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setDialog({ ...p, decision: 'rejected' })}
                            className="btn btn-sm border border-edge bg-white px-3 py-1.5 text-[11.5px] font-bold text-muted hover:border-burgundy-200 hover:text-burgundy"
                            aria-label={`Reject ${p.name}`}
                          >
                            Reject
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </StateBlock>
              </Panel>
            </div>

            {/* ------------------------------ status + shortcuts ------------------------------ */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Panel title="Appointment pipeline" subtitle="Where every booking currently sits">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Pending', value: stats.pending_appointments, color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
                    { label: 'Confirmed', value: stats.confirmed_appointments, color: 'bg-burgundy-50 text-burgundy-700 border-burgundy-200', icon: CalendarDays },
                    { label: 'Completed', value: stats.completed_appointments, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
                    { label: 'Cancelled', value: stats.cancelled_appointments, color: 'bg-rosewood/10 text-rosewood border-rosewood/30', icon: AlertTriangle }
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className={`rounded-2xl border p-4 ${s.color}`}
                    >
                      <span className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-wider">
                        <s.icon className="h-3.5 w-3.5" /> {s.label}
                      </span>
                      <p className="mt-2 font-display text-3xl">{Number(s.value).toLocaleString()}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <QuickLink to="/admin/users" icon={Users} label="Manage users" />
                  <QuickLink to="/admin/services" icon={Layers} label="Catalogue" />
                  <QuickLink to="/admin/payments" icon={Wallet} label="Payments & refunds" />
                </div>
              </Panel>

              {/* KPI summary from reports */}
              <Panel title="Platform KPIs" subtitle="Lifetime figures">
                <div className="space-y-3.5">
                  <KpiRow label="Avg. order value" value={formatMoney(reports?.kpis?.avg_order_value)} />
                  <KpiRow label="Total reviews" value={Number(reports?.kpis?.total_reviews ?? 0).toLocaleString()} />
                  <KpiRow label="Avg. rating"
                    value={reports?.kpis?.avg_rating ? `${Number(reports.kpis.avg_rating).toFixed(2)} ★` : '—'} />
                  <KpiRow label="Customers" value={Number(reports?.kpis?.customers ?? stats.total_customers).toLocaleString()} />
                  <KpiRow label="Completion rate"
                    value={
                      Number(stats.total_appointments)
                        ? `${Math.round((Number(stats.completed_appointments) / Number(stats.total_appointments)) * 100)}%`
                        : '—'
                    } />
                </div>
              </Panel>
            </div>

            <div className="mt-6 relative overflow-hidden rounded-[28px] bg-burgundy-gradient p-6 text-ivory sm:p-8">
              <div className="noise absolute inset-0" />
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-rosewood/35 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-5">
                <div>
                  <span className="eyebrow !text-softrose">
                    <span className="h-px w-8 bg-softrose/70" /> Admin tip
                  </span>
                  <p className="mt-3 max-w-lg font-display text-xl leading-snug text-ivory sm:text-2xl">
                    Approve new professionals within 24 hours — they typically publish their first
                    service the same day.
                  </p>
                </div>
                <Link to="/admin/providers" className="btn-gold shrink-0">
                  <Sparkles className="h-4 w-4" /> Open approvals
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </StateBlock>

      {!loading && !error && !stats && (
        <EmptyState
          icon={AlertTriangle}
          title="No platform data"
          description="Stats will appear once the database has activity."
          action={<button onClick={load} className="btn-primary">Refresh</button>}
        />
      )}

      <ConfirmDialog
        open={!!dialog}
        tone={dialog?.decision === 'rejected' ? 'danger' : 'info'}
        title={dialog?.decision === 'approved' ? 'Approve this provider?' : 'Reject this application?'}
        message={dialog
          ? `${dialog.name} (${dialog.email}) will be ${dialog.decision === 'approved'
              ? 'approved — they can immediately publish services and take bookings, and we email them the good news.'
              : 'rejected — they will be notified by email and cannot publish services.'}`
          : ''}
        confirmLabel={dialog?.decision === 'approved' ? 'Approve provider' : 'Reject application'}
        cancelLabel="Decide later"
        loading={busy}
        onConfirm={decide}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 rounded-2xl border border-edge bg-white px-4 py-3 text-[13px] font-bold text-charcoal transition-all duration-300 hover:-translate-y-0.5 hover:border-burgundy-300 hover:text-burgundy hover:shadow-card"
    >
      <Icon className="h-4 w-4 text-rosewood transition-transform group-hover:scale-110" />
      {label}
      <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
    </Link>
  );
}

function KpiRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-edge/70 pb-2.5 last:border-0 last:pb-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-display text-base text-burgundy-800">{value}</span>
    </div>
  );
}
