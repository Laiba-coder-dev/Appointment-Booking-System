import { Tooltip } from 'recharts';

/* ============================================================
   Shared Recharts styling — every chart in Appointify uses the
   brand palette only (burgundy / rosewood / soft rose / gold /
   ivory / cream). No unrelated colours, ever.
   ============================================================ */

export const COLORS = {
  burgundy: '#641E32',
  dark: '#481421',
  rosewood: '#A65D6B',
  softRose: '#D6A6A9',
  gold: '#C9A96A',
  ivory: '#FFF9F0',
  cream: '#F8EFE6',
  border: '#E9DDD7',
  muted: '#756B68',
  charcoal: '#2A2A2A',
  white: '#FFFFFF'
};

/** Ordered series palette (categorical charts). */
export const SERIES = ['#641E32', '#A65D6B', '#D6A6A9', '#C9A96A', '#E9DDD7'];

/** Status → colour (appointments / payments). */
export const STATUS_COLORS = {
  pending: '#C9A96A',
  confirmed: '#A65D6B',
  completed: '#641E32',
  cancelled: '#D6A6A9',
  rejected: '#E9DDD7',
  no_show: '#756B68',
  paid: '#641E32',
  failed: '#A65D6B',
  refunded: '#E9DDD7',
  partially_refunded: '#C9A96A'
};

export const CHART_MARGIN = { top: 8, right: 14, left: -8, bottom: 0 };

const AXIS_TICK = {
  fill: COLORS.muted,
  fontSize: 11,
  fontFamily: 'Inter, Manrope, sans-serif'
};

export const axisProps = {
  tickLine: false,
  axisLine: { stroke: COLORS.border, strokeWidth: 1 },
  tick: AXIS_TICK,
  tickMargin: 8
};

export const yAxisProps = {
  ...axisProps,
  axisLine: false,
  tickLine: false,
  width: 44
};

/** "2025-11" → "Nov 25" */
export const monthLabel = (m) => {
  if (!m) return '';
  const [y, mo] = String(m).split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(mo) - 1;
  return `${names[idx] ?? mo} ${String(y).slice(2)}`;
};

/** "2025-11-13" → "Nov 13" */
export const dayLabel = (d) => {
  if (!d) return '';
  const dt = new Date(`${String(d).slice(0, 10)}T12:00:00Z`);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Compact currency tick: 1200 → "1.2k" */
export const moneyTick = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
};

/** Branded tooltip used by every chart. */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-edge bg-white/95 px-3.5 py-2.5 shadow-lift backdrop-blur-sm">
      {label !== undefined && label !== '' && (
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color || p.fill || COLORS.burgundy }} />
            <span className="font-semibold text-charcoal">{p.name}</span>
            <span className="ml-auto font-bold text-burgundy-800">
              {formatter ? formatter(p.value, p) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Empty-chart placeholder matching dashboard states. */
export function ChartEmpty({ title = 'No data yet', description = 'Numbers appear once you have activity.' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge bg-ivory/50 px-6 py-12 text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A65D6B" strokeWidth="1.6" aria-hidden="true">
        <path d="M3 3v18h18" strokeLinecap="round" />
        <path d="M7 15l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="mt-3 font-display text-base text-burgundy-800">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted">{description}</p>
    </div>
  );
}

/** Re-usable styled legend for horizontal bar / pie charts. */
export function ChartLegend({ items = [] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2 text-[12px] font-semibold text-charcoal">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
          {it.value !== undefined && <span className="text-muted">· {it.value}</span>}
        </span>
      ))}
    </div>
  );
}

export default { COLORS, SERIES, STATUS_COLORS, ChartTooltip, ChartEmpty, ChartLegend };
