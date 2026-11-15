/** Formatting helpers shared across the application. */

const LOCALE = 'en-US';

export const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(Number(amount) || 0);

export const formatDate = (d, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d.replace(' ', 'T')) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE, opts).format(date);
};

export const formatTime = (d) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d.replace(' ', 'T')) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' }).format(date);
};

export const formatDateTime = (d) =>
  `${formatDate(d, { month: 'short', day: 'numeric', year: 'numeric' })} · ${formatTime(d)}`;

/** "in 3 days" / "2 hours ago" */
export function relativeTime(d) {
  const date = typeof d === 'string' ? new Date(d.replace(' ', 'T')) : d;
  if (!date || Number.isNaN(date.getTime())) return '';
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  let unit;
  if (mins < 60) unit = `${mins} minute${mins === 1 ? '' : 's'}`;
  else if (hours < 24) unit = `${hours} hour${hours === 1 ? '' : 's'}`;
  else unit = `${days} day${days === 1 ? '' : 's'}`;

  return diff > 0 ? `in ${unit}` : `${unit} ago`;
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const truncate = (str = '', n = 100) =>
  str.length > n ? `${str.slice(0, n).trimEnd()}…` : str;

export const statusMeta = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmed', className: 'bg-burgundy-50 text-burgundy-700 border-burgundy-200' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-rosewood/10 text-rosewood border-rosewood/25' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600 border-red-200' },
  no_show: { label: 'No show', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-600 border-red-200' },
  refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  partially_refunded: { label: 'Partially refunded', className: 'bg-amber-50 text-amber-700 border-amber-200' }
};

export const statusLabel = (s) => statusMeta[s]?.label || s;
export const statusClass = (s) => statusMeta[s]?.className || 'bg-slate-100 text-slate-600 border-slate-200';

export const SLOT_OPTIONS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
