import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip
} from 'recharts';
import {
  TrendingUp, CalendarDays, Wallet, Star, Download, Layers,
  AlertCircle, Users, Building2, CheckCircle2, Activity
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { PageIntro, Panel, StatCard, StateBlock, Tabs } from '../../components/ui/DashboardBits';
import {
  COLORS, STATUS_COLORS, CHART_MARGIN, axisProps, yAxisProps,
  monthLabel, dayLabel, moneyTick, ChartTooltip, ChartEmpty, ChartLegend
} from '../../components/charts/ChartTheme';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney, statusLabel, initials } from '../../utilities/format';

const VIEWS = [
  { value: 'bookings', label: 'Bookings' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'daily', label: 'Daily' }
];

export default function AdminReportsPage() {
  useDocumentTitle('Reports & analytics');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('bookings');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/admin/reports');
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const monthly = useMemo(() => (data?.monthlyBookings || []).map((m) => ({
    ...m,
    label: monthLabel(m.month),
    total: Number(m.total) || 0,
    completed: Number(m.completed) || 0,
    pending: Number(m.pending) || 0,
    confirmed: Number(m.confirmed) || 0,
    cancelled: Number(m.cancelled) || 0
  })), [data]);

  const revenue = useMemo(() => (data?.revenueAnalytics || []).map((r) => ({
    ...r,
    label: monthLabel(r.month),
    revenue: Number(r.revenue) || 0,
    transactions: Number(r.transactions) || 0
  })), [data]);

  const daily = useMemo(() => (data?.dailyBookings || []).map((d) => ({
    ...d,
    label: dayLabel(d.day),
    total: Number(d.total) || 0
  })), [data]);

  const popular = useMemo(() => (data?.popularServices || []).map((s) => ({
    ...s,
    bookings: Number(s.bookings) || 0,
    revenue: Number(s.revenue) || 0
  })), [data]);

  const providers = useMemo(() => (data?.providerPerformance || []).map((p) => ({
    ...p,
    rating_avg: Number(p.rating_avg) || 0,
    review_count: Number(p.review_count) || 0,
    bookings: Number(p.bookings) || 0,
    completed: Number(p.completed) || 0,
    cancelled: Number(p.cancelled) || 0,
    revenue: Number(p.revenue) || 0
  })), [data]);

  const statusSplit = useMemo(() => (data?.statusSplit || []).map((s) => ({
    ...s,
    name: statusLabel(s.status),
    value: Number(s.value) || 0,
    color: STATUS_COLORS[s.status] || COLORS.rosewood
  })), [data]);

  const categorySplit = useMemo(() => (data?.categorySplit || []).map((c, i) => ({
    ...c,
    value: Number(c.value) || 0,
    color: [COLORS.burgundy, COLORS.rosewood, COLORS.softRose, COLORS.gold, COLORS.border, COLORS.muted][i % 6]
  })), [data]);

  const kpis = data?.kpis || {};

  const exportCsv = () => {
    const header = 'month,total,completed,pending,confirmed,cancelled,revenue\n';
    const body = monthly.map((m) => {
      const rev = revenue.find((r) => r.month === m.month);
      return [m.month, m.total, m.completed, m.pending, m.confirmed, m.cancelled, rev?.revenue || 0].join(',');
    }).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointify-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageIntro
        eyebrow="Admin console"
        title="Reports"
        description="Platform-wide performance — bookings, revenue, service demand and provider leaderboards."
        actions={
          <>
            <Link to="/admin/appointments" className="btn-secondary !py-2.5 text-sm">
              <CalendarDays className="h-4 w-4" /> All appointments
            </Link>
            <button onClick={exportCsv} disabled={!monthly.length} className="btn-primary !py-2.5 text-sm disabled:opacity-50">
              {loading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Export CSV
            </button>
          </>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={6}>
        {data && (
          <>
            {/* ------------------------------ KPI row ------------------------------ */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={CalendarDays} label="Total appointments" value={Number(kpis.total_appointments || 0).toLocaleString()}
                sub={`${Number(kpis.completed || 0).toLocaleString()} completed · ${Number(kpis.pending || 0).toLocaleString()} pending`} />
              <StatCard icon={Wallet} label="Lifetime revenue" value={formatMoney(kpis.revenue)}
                sub={`AOV ${formatMoney(kpis.avg_order_value)}`} tone="gold" delay={0.06} />
              <StatCard icon={Star} label="Avg. rating"
                value={kpis.avg_rating ? `${Number(kpis.avg_rating).toFixed(2)} ★` : '—'}
                sub={`${Number(kpis.total_reviews || 0).toLocaleString()} reviews`} tone="rosewood" delay={0.12} />
              <StatCard icon={Users} label="Customers" value={Number(kpis.customers || 0).toLocaleString()}
                sub="Registered bookers" tone="emerald" delay={0.18} />
            </div>

            {/* ------------------------------ main trend ------------------------------ */}
            <Panel
              className="mt-6"
              title={view === 'bookings' ? 'Booking volume' : view === 'revenue' ? 'Revenue analytics' : 'Daily bookings (30 days)'}
              subtitle={
                view === 'bookings' ? 'Monthly totals with status breakdown'
                : view === 'revenue' ? 'Captured payments per month'
                : 'Booking activity over the last 30 days'
              }
              action={<Tabs tabs={VIEWS} value={view} onChange={setView} />}
            >
              <div className="h-[320px] w-full">
                {view === 'bookings' ? (
                  monthly.length === 0 ? <ChartEmpty title="No bookings yet" description="Monthly totals will chart here." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthly} margin={CHART_MARGIN}>
                        <defs>
                          <linearGradient id="repFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.burgundy} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={COLORS.burgundy} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis {...yAxisProps} allowDecimals={false} />
                        <RTooltip cursor={{ stroke: COLORS.rosewood, strokeDasharray: '3 3' }} content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="total" name="Total" stroke={COLORS.rosewood} strokeWidth={2}
                          fill="url(#repFill)" dot={{ r: 3, fill: COLORS.rosewood, strokeWidth: 0 }} />
                        <Area type="monotone" dataKey="completed" name="Completed" stroke={COLORS.burgundy} strokeWidth={2.5}
                          fill="none" dot={{ r: 3, fill: COLORS.burgundy, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                ) : view === 'revenue' ? (
                  revenue.length === 0 ? <ChartEmpty title="No revenue recorded" description="Paid transactions will chart here." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenue} margin={CHART_MARGIN} barGap={3}>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis {...yAxisProps} tickFormatter={moneyTick} />
                        <RTooltip cursor={{ fill: COLORS.cream, opacity: 0.6 }}
                          content={<ChartTooltip formatter={(v, p) => (p.dataKey === 'revenue' ? formatMoney(v) : v)} />} />
                        <Bar dataKey="revenue" name="Revenue" fill={COLORS.burgundy} radius={[6, 6, 0, 0]} barSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  daily.length === 0 ? <ChartEmpty title="No activity in 30 days" description="Daily bookings will chart here." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={daily} margin={CHART_MARGIN}>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
                        <YAxis {...yAxisProps} allowDecimals={false} />
                        <RTooltip cursor={{ stroke: COLORS.rosewood, strokeDasharray: '3 3' }} content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="total" name="Bookings" stroke={COLORS.burgundy} strokeWidth={2.5}
                          dot={{ r: 2.5, fill: COLORS.rosewood, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: COLORS.gold, strokeWidth: 2, stroke: COLORS.white }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                )}
              </div>
            </Panel>

            {/* ------------------------------ splits ------------------------------ */}
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <Panel title="Appointment outcomes" subtitle="All-time status split">
                <div className="h-[260px] w-full">
                  {statusSplit.length === 0 ? <ChartEmpty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusSplit} dataKey="value" nameKey="name"
                          innerRadius="62%" outerRadius="88%" paddingAngle={3}
                          stroke={COLORS.white} strokeWidth={2}>
                          {statusSplit.map((s) => <Cell key={s.status} fill={s.color} />)}
                        </Pie>
                        <RTooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <ChartLegend items={statusSplit.map((s) => ({ label: s.name, value: s.value, color: s.color }))} />
              </Panel>

              <Panel title="Demand by category" subtitle="Bookings attributed to each category">
                <div className="h-[260px] w-full">
                  {categorySplit.length === 0 ? <ChartEmpty title="No categories yet" description="Category demand will chart here." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categorySplit} layout="vertical" margin={{ ...CHART_MARGIN, left: 4, right: 18 }}>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" {...axisProps} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" {...yAxisProps} width={116} />
                        <RTooltip cursor={{ fill: COLORS.cream, opacity: 0.6 }} content={<ChartTooltip />} />
                        <Bar dataKey="value" name="Bookings" radius={[0, 6, 6, 0]} barSize={16}>
                          {categorySplit.map((c) => <Cell key={c.name} fill={c.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>
            </div>

            {/* ------------------------------ popular services ------------------------------ */}
            <Panel className="mt-6" title="Popular services" subtitle="Ranked by lifetime bookings" flush>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-edge bg-ivory/70">
                      {['#', 'Service', 'Category', 'Bookings', 'Revenue', 'Avg. duration'].map((h) => (
                        <th key={h} scope="col"
                          className="whitespace-nowrap px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {popular.map((s, i) => (
                      <tr key={`${s.name}-${i}`} className="border-b border-edge/60 last:border-0 hover:bg-ivory/50">
                        <td className="px-5 py-3.5 font-display text-base text-rosewood">{i + 1}</td>
                        <td className="px-5 py-3.5 font-semibold text-charcoal">{s.name}</td>
                        <td className="px-5 py-3.5 text-muted">{s.category}</td>
                        <td className="px-5 py-3.5 font-bold text-burgundy-800">{s.bookings}</td>
                        <td className="px-5 py-3.5 font-semibold text-charcoal">{formatMoney(s.revenue)}</td>
                        <td className="px-5 py-3.5 text-muted">{s.avg_duration ? `${s.avg_duration} min` : '—'}</td>
                      </tr>
                    ))}
                    {popular.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">No booking data yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* ------------------------------ provider leaderboard ------------------------------ */}
            <Panel className="mt-6" title="Provider leaderboard" subtitle="Top professionals by revenue" flush>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-edge bg-ivory/70">
                      {['Provider', 'Specialization', 'Rating', 'Bookings', 'Completed', 'Cancelled', 'Revenue'].map((h) => (
                        <th key={h} scope="col"
                          className="whitespace-nowrap px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p, i) => (
                      <tr key={`${p.provider}-${i}`} className="border-b border-edge/60 last:border-0 hover:bg-ivory/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-burgundy-gradient text-[11px] font-bold text-ivory">
                              {initials(p.provider)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-charcoal">{p.provider}</p>
                              {i === 0 && (
                                <span className="badge border border-gold/40 bg-gold-100 !text-[10px] text-gold-700">
                                  <Star className="h-2.5 w-2.5" /> Top earner
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted">{p.specialization || 'Generalist'}</td>
                        <td className="px-5 py-3.5">
                          {p.rating_avg
                            ? <span className="font-bold text-gold-700">{p.rating_avg.toFixed(1)} ★ <span className="font-normal text-muted">({p.review_count})</span></span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-charcoal">{p.bookings}</td>
                        <td className="px-5 py-3.5 font-semibold text-emerald-700">{p.completed}</td>
                        <td className="px-5 py-3.5 text-rosewood">{p.cancelled}</td>
                        <td className="px-5 py-3.5 font-bold text-burgundy-800">{formatMoney(p.revenue)}</td>
                      </tr>
                    ))}
                    {providers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted">No provider activity yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="mt-6 relative overflow-hidden rounded-[28px] bg-burgundy-gradient p-6 text-ivory sm:p-8">
              <div className="noise absolute inset-0" />
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-rosewood/35 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-5">
                <div>
                  <span className="eyebrow !text-softrose">
                    <span className="h-px w-8 bg-softrose/70" /> Insights
                  </span>
                  <p className="mt-3 max-w-lg font-display text-xl leading-snug text-ivory sm:text-2xl">
                    {popular[0]
                      ? `${popular[0].name} is your most booked service with ${popular[0].bookings} bookings.`
                      : 'Once bookings accumulate, your strongest services and providers are highlighted here.'}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-ivory/65">
                    <Activity className="h-4 w-4" /> Reports refresh on every page load · CSV export includes the monthly breakdown.
                  </p>
                </div>
                <Link to="/admin/providers" className="btn-gold shrink-0">
                  <Building2 className="h-4 w-4" /> Manage providers
                </Link>
              </div>
            </div>

            <p className="mt-5 flex items-center justify-center gap-2 text-[11.5px] text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              All figures computed live from the database · revenue counts captured payments only
              <TrendingUp className="h-3.5 w-3.5 text-rosewood" />
            </p>
          </>
        )}
      </StateBlock>

      {!loading && !error && !data && (
        <div className="flex flex-col items-center rounded-3xl border border-burgundy-100 bg-burgundy-50/50 px-6 py-16 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-burgundy" />
          <p className="font-display text-lg text-burgundy-800">Reports unavailable</p>
          <p className="mt-1.5 text-sm text-muted">We couldn't load platform analytics.</p>
          <button onClick={load} className="btn-primary mt-5"><Layers className="h-4 w-4" /> Try again</button>
        </div>
      )}
    </div>
  );
}
