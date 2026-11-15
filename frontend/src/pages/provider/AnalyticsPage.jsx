import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip
} from 'recharts';
import {
  BarChart3, Wallet, CalendarCheck, Star, TrendingUp, Layers,
  AlertCircle, Download
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { PageIntro, Panel, StatCard, StateBlock, Tabs } from '../../components/ui/DashboardBits';
import {
  COLORS, SERIES, STATUS_COLORS, CHART_MARGIN, axisProps, yAxisProps,
  monthLabel, moneyTick, ChartTooltip, ChartEmpty, ChartLegend
} from '../../components/charts/ChartTheme';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney, statusLabel, statusClass } from '../../utilities/format';

const VIEWS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'rating', label: 'Rating' }
];

export default function ProviderAnalyticsPage() {
  useDocumentTitle('Analytics');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('revenue');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/provider/analytics');
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revenue = (data?.revenueByMonth || []).map((r) => ({
    ...r,
    label: monthLabel(r.month),
    revenue: Number(r.revenue) || 0
  }));
  const appts = (data?.appointmentsByMonth || []).map((r) => ({
    ...r,
    label: monthLabel(r.month),
    completed: Number(r.completed) || 0,
    upcoming: Number(r.upcoming) || 0,
    cancelled: Number(r.cancelled) || 0
  }));
  const statusSplit = (data?.statusSplit || []).map((s) => ({
    ...s,
    name: statusLabel(s.status),
    value: Number(s.value) || 0,
    color: STATUS_COLORS[s.status] || COLORS.rosewood
  }));
  const topServices = (data?.topServices || []).map((s) => ({
    ...s,
    bookings: Number(s.bookings) || 0,
    revenue: Number(s.revenue) || 0
  }));
  const ratingTrend = (data?.ratingTrend || []).map((r) => ({
    ...r,
    label: monthLabel(r.month),
    rating: Number(r.rating) || 0,
    count: Number(r.count) || 0
  }));

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);
  const totalAppts = appts.reduce((s, r) => s + r.completed + r.upcoming + r.cancelled, 0);
  const avgRating = ratingTrend.length
    ? ratingTrend.reduce((s, r) => s + r.rating * Math.max(r.count, 1), 0) /
      ratingTrend.reduce((s, r) => s + Math.max(r.count, 1), 0)
    : 0;
  const busiest = topServices[0];

  const exportCsv = () => {
    const header = 'month,revenue,payments\n';
    const body = revenue.map((r) => `${r.month},${r.revenue},${r.payments}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointify-revenue.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="Analytics"
        description="How your practice is growing — revenue, bookings, service mix and customer rating."
        actions={
          <button onClick={exportCsv} disabled={!revenue.length} className="btn-secondary !py-2.5 text-sm disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        {data && (
          <>
            {/* ------------------------------ KPIs ------------------------------ */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Wallet} label="Revenue (12 mo)" value={formatMoney(totalRevenue)}
                sub={`${revenue.length} month${revenue.length === 1 ? '' : 's'} with payments`} tone="gold" />
              <StatCard icon={CalendarCheck} label="Appointments" value={totalAppts}
                sub="Booked in the last 12 months" delay={0.06} />
              <StatCard icon={Star} label="Avg. rating"
                value={avgRating ? avgRating.toFixed(2) : '—'}
                sub={`${ratingTrend.reduce((s, r) => s + r.count, 0)} reviews`} tone="rosewood" delay={0.12} />
              <StatCard icon={Layers} label="Top service" value={busiest ? busiest.bookings : 0}
                sub={busiest ? busiest.name : 'No bookings yet'} tone="emerald" delay={0.18} />
            </div>

            {/* ------------------------------ trend ------------------------------ */}
            <Panel
              className="mt-6"
              title={view === 'revenue' ? 'Revenue trend' : view === 'bookings' ? 'Bookings by month' : 'Customer rating'}
              subtitle={view === 'revenue'
                ? 'Captured payments over the last 12 months'
                : view === 'bookings'
                  ? 'Completed, upcoming and cancelled appointments'
                  : 'Average star rating per month'}
              action={<Tabs tabs={VIEWS} value={view} onChange={setView} />}
            >
              <div className="h-[300px] w-full">
                {view === 'revenue' ? (
                  revenue.length === 0 ? <ChartEmpty title="No revenue recorded yet" description="Captured payments will chart here." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenue} margin={CHART_MARGIN}>
                        <defs>
                          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.burgundy} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={COLORS.burgundy} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis {...yAxisProps} tickFormatter={moneyTick} />
                        <RTooltip
                          cursor={{ stroke: COLORS.rosewood, strokeDasharray: '3 3' }}
                          content={<ChartTooltip formatter={(v) => formatMoney(v)} />}
                        />
                        <Area
                          type="monotone" dataKey="revenue" name="Revenue"
                          stroke={COLORS.burgundy} strokeWidth={2.5}
                          fill="url(#revFill)" dot={{ r: 3, fill: COLORS.burgundy, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: COLORS.gold, strokeWidth: 2, stroke: COLORS.white }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                ) : view === 'bookings' ? (
                  appts.length === 0 ? <ChartEmpty title="No bookings yet" description="Your appointment history will chart here." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={appts} margin={CHART_MARGIN} barGap={3}>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis {...yAxisProps} allowDecimals={false} />
                        <RTooltip cursor={{ fill: COLORS.cream, opacity: 0.6 }} content={<ChartTooltip />} />
                        <Bar dataKey="completed" name="Completed" stackId="a" fill={COLORS.burgundy} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="upcoming" name="Upcoming" stackId="a" fill={COLORS.rosewood} />
                        <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={COLORS.softRose} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  ratingTrend.length === 0 ? <ChartEmpty title="No reviews yet" description="Ratings appear after your first review." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ratingTrend} margin={CHART_MARGIN}>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis {...yAxisProps} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                        <RTooltip
                          cursor={{ stroke: COLORS.rosewood, strokeDasharray: '3 3' }}
                          content={<ChartTooltip formatter={(v) => `${Number(v).toFixed(2)} ★`} />}
                        />
                        <Line
                          type="monotone" dataKey="rating" name="Rating"
                          stroke={COLORS.gold} strokeWidth={2.5}
                          dot={{ r: 3.5, fill: COLORS.gold, strokeWidth: 0 }}
                          activeDot={{ r: 5.5, fill: COLORS.burgundy, strokeWidth: 2, stroke: COLORS.white }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                )}
              </div>
              {view === 'bookings' && appts.length > 0 && (
                <ChartLegend items={[
                  { label: 'Completed', color: COLORS.burgundy },
                  { label: 'Upcoming', color: COLORS.rosewood },
                  { label: 'Cancelled', color: COLORS.softRose }
                ]} />
              )}
            </Panel>

            {/* ------------------------------ lower grid ------------------------------ */}
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              {/* status split */}
              <Panel title="Appointment outcomes" subtitle="All-time status breakdown">
                <div className="h-[260px] w-full">
                  {statusSplit.length === 0 ? <ChartEmpty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusSplit} dataKey="value" nameKey="name"
                          innerRadius="62%" outerRadius="88%" paddingAngle={3}
                          stroke={COLORS.white} strokeWidth={2}
                        >
                          {statusSplit.map((s) => <Cell key={s.status} fill={s.color} />)}
                        </Pie>
                        <RTooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <ChartLegend items={statusSplit.map((s) => ({ label: s.name, value: s.value, color: s.color }))} />
              </Panel>

              {/* top services */}
              <Panel title="Most booked services" subtitle="By appointment count">
                <div className="h-[260px] w-full">
                  {topServices.length === 0 ? <ChartEmpty title="No bookings yet" description="Your top services will rank here." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topServices} layout="vertical" margin={{ ...CHART_MARGIN, left: 6, right: 18 }}>
                        <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" {...axisProps} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" {...yAxisProps} width={118}
                          tick={{ ...axisProps.tick, fontSize: 11 }} />
                        <RTooltip cursor={{ fill: COLORS.cream, opacity: 0.6 }}
                          content={<ChartTooltip formatter={(v, p) => (p.dataKey === 'revenue' ? formatMoney(v) : v)} />} />
                        <Bar dataKey="bookings" name="Bookings" fill={COLORS.burgundy} radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {topServices.length > 0 && (
                  <p className="mt-3 text-center text-xs text-muted">
                    <strong className="text-charcoal">{topServices[0].name}</strong> leads with{' '}
                    {topServices[0].bookings} booking{topServices[0].bookings === 1 ? '' : 's'}
                    {Number(topServices[0].revenue) > 0 && <> · {formatMoney(topServices[0].revenue)} earned</>}
                  </p>
                )}
              </Panel>
            </div>

            {/* ------------------------------ raw table ------------------------------ */}
            <Panel className="mt-6" title="Month-by-month detail" subtitle="The numbers behind the charts" flush>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-edge bg-ivory/70">
                      {['Month', 'Bookings', 'Completed', 'Cancelled', 'Revenue', 'Reviews'].map((h) => (
                        <th key={h} scope="col"
                          className="whitespace-nowrap px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appts.map((row, i) => {
                      const rev = revenue.find((r) => r.month === row.month);
                      const rt = ratingTrend.find((r) => r.month === row.month);
                      return (
                        <tr key={row.month} className="border-b border-edge/60 last:border-0 hover:bg-ivory/50">
                          <td className="px-5 py-3.5 font-semibold text-charcoal">{monthLabel(row.month)}</td>
                          <td className="px-5 py-3.5 text-charcoal">{Number(row.total)}</td>
                          <td className="px-5 py-3.5 text-emerald-700">{Number(row.completed)}</td>
                          <td className="px-5 py-3.5 text-rosewood">{Number(row.cancelled)}</td>
                          <td className="px-5 py-3.5 font-bold text-burgundy-800">{formatMoney(rev?.revenue || 0)}</td>
                          <td className="px-5 py-3.5 text-charcoal">
                            {rt ? `${Number(rt.rating).toFixed(1)} ★ (${rt.count})` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <p className="mt-5 flex items-center justify-center gap-2 text-[11.5px] text-muted">
              <TrendingUp className="h-3.5 w-3.5 text-rosewood" />
              Analytics refresh each time you open this page · data spans the last 12 months
            </p>
          </>
        )}
      </StateBlock>

      {!loading && !error && !data && (
        <div className="flex flex-col items-center rounded-3xl border border-burgundy-100 bg-burgundy-50/50 px-6 py-16 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-burgundy" />
          <p className="font-display text-lg text-burgundy-800">Analytics unavailable</p>
          <p className="mt-1.5 text-sm text-muted">We couldn't load your stats.</p>
          <button onClick={load} className="btn-primary mt-5">
            {loading ? <Spinner className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />} Try again
          </button>
        </div>
      )}
    </div>
  );
}
