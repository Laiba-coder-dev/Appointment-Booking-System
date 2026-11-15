import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Search, X, Clock, User, Users, Wallet,
  Filter, CreditCard, Mail, Info, CalendarRange
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, Tabs, Pagination,
  StateBlock, StatCard
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { formatMoney, formatDate, formatTime, relativeTime, initials, statusLabel } from '../../utilities/format';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'no_show', label: 'No show' }
];

export default function AdminAppointmentsPage() {
  useDocumentTitle('All appointments');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (q) params.set('search', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get(`/api/admin/appointments?${params.toString()}`);
      setRows(res.data?.data?.appointments || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load appointments');
    } finally {
      setLoading(false);
    }
  }, [status, q, from, to, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, q, from, to]);

  const filtersActive = !!(status || q || from || to);
  const clearAll = () => { setStatus(''); setSearch(''); setFrom(''); setTo(''); };

  const columns = useMemo(() => [
    {
      key: 'service_name',
      header: 'Booking',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-burgundy-gradient text-[11px] font-bold text-ivory">
            {initials(r.customer_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">{r.service_name}</p>
            <p className="truncate text-xs text-muted">{r.reference}</p>
          </div>
        </div>
      )
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-charcoal">{r.customer_name}</p>
          <p className="truncate text-xs text-muted">{r.customer_email}</p>
        </div>
      )
    },
    {
      key: 'provider_name',
      header: 'Provider',
      render: (r) => <span className="text-[13px] font-semibold text-charcoal">{r.provider_name}</span>
    },
    {
      key: 'start_at',
      header: 'When',
      render: (r) => (
        <div>
          <p className="whitespace-nowrap font-semibold text-charcoal">
            {formatDate(r.start_at, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-muted">{formatTime(r.start_at)} � {r.duration_min} min</p>
        </div>
      )
    },
    { key: 'price', header: 'Price', className: 'font-bold text-burgundy-800', render: (r) => formatMoney(r.price) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (r) => r.payment_status
        ? <StatusBadge status={r.payment_status} />
        : <span className="text-xs text-muted">�</span>
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); setDetail(r); }} className="btn-ghost !py-1.5 text-xs">
          Details
        </button>
      )
    }
  ], []);

  return (
    <div>
      <PageIntro
        eyebrow="Admin console"
        title="Appointments"
        description="Every booking on the platform � searchable by reference, customer, service or professional."
      />

      <div className="mb-5 flex flex-col gap-3">
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />

        <div className="flex flex-wrap items-end gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search reference, customer, service or provider�"
            className="min-w-[240px] flex-1"
            label="Search appointments"
          />
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <label htmlFor="appt-from" className="field-label !mb-1">From</label>
              <input id="appt-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="field !w-auto !py-2.5 !text-[13px]" />
            </div>
            <div>
              <label htmlFor="appt-to" className="field-label !mb-1">To</label>
              <input id="appt-to" type="date" value={to} min={from || undefined}
                onChange={(e) => setTo(e.target.value)} className="field !w-auto !py-2.5 !text-[13px]" />
            </div>
          </div>
          {filtersActive && (
            <button onClick={clearAll} className="btn-ghost !py-2.5 text-xs">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatCard icon={CalendarDays} label="Results" value={pagination.total}
              sub={filtersActive ? 'Matching your filters' : 'Total appointments'} />
            <StatCard icon={CalendarRange} label="Date range"
              value={from || to ? `${from || 'Start'} ? ${to || 'Today'}` : 'All time'}
              sub="Filter with the date pickers" tone="rosewood" delay={0.06} />
            <StatCard icon={Wallet} label="Value shown"
              value={formatMoney(rows.reduce((s, r) => s + Number(r.price || 0), 0))}
              sub={`On page ${pagination.page}`} tone="gold" delay={0.12} />
          </div>

          <Panel flush>
            <StateBlock
              loading={false}
              empty={rows.length === 0}
              emptyIcon={CalendarDays}
              emptyTitle={filtersActive ? 'No appointments match' : 'No appointments yet'}
              emptyDescription={filtersActive
                ? 'Adjust or clear the filters to see more bookings.'
                : 'Bookings will appear here as soon as customers start scheduling.'}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-edge bg-ivory/70">
                      {columns.map((c) => (
                        <th key={c.key} scope="col"
                          className={`whitespace-nowrap px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted ${c.className || ''}`}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2) }}
                        onClick={() => setDetail(r)}
                        className="cursor-pointer border-b border-edge/60 transition-colors last:border-0 hover:bg-ivory/60"
                      >
                        {columns.map((c) => (
                          <td key={c.key} className={`px-5 py-4 align-middle text-[13.5px] text-charcoal ${c.className || ''}`}>
                            {c.render ? c.render(r) : r[c.key]}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StateBlock>
          </Panel>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total}
            onChange={setPage} noun="appointments" />
        </>
      </StateBlock>

      {rows.length === 0 && !loading && !error && filtersActive && (
        <div className="mt-6">
          <EmptyState
            icon={Filter}
            title="No matches"
            description="Try widening the date range or clearing the search."
            action={<button onClick={clearAll} className="btn-secondary btn-sm"><X className="h-3.5 w-3.5" /> Reset filters</button>}
          />
        </div>
      )}

      {/* ============================ detail drawer ============================ */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-burgundy-950/45 backdrop-blur-sm"
              onClick={() => setDetail(null)}
            />
            <motion.aside
              initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[440px] flex-col bg-lightbg shadow-lift"
              role="dialog" aria-modal="true" aria-label="Appointment details"
            >
              <header className="flex items-start justify-between gap-4 border-b border-edge bg-ivory px-6 py-5">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-rosewood">{detail.reference}</p>
                  <h3 className="mt-1 font-display text-xl text-burgundy-800">{detail.service_name}</h3>
                </div>
                <button onClick={() => setDetail(null)} aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-edge bg-white text-burgundy transition hover:border-burgundy">
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={detail.status} />
                  {detail.payment_status && <StatusBadge status={detail.payment_status} />}
                  {Number(detail.review_id) > 0 && (
                    <span className="badge border border-gold/40 bg-gold-100 text-gold-700">Reviewed</span>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  <DetailRow icon={User} label="Customer" value={detail.customer_name} sub={detail.customer_email} />
                  <DetailRow icon={Users} label="Provider" value={detail.provider_name} />
                  <DetailRow icon={Clock} label="When"
                    value={formatDate(detail.start_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    sub={`${formatTime(detail.start_at)} � ${detail.duration_min} minutes � ${relativeTime(detail.start_at)}`} />
                  <DetailRow icon={Wallet} label="Price" value={formatMoney(detail.price)}
                    sub={detail.payment_status ? `Payment ${statusLabel(detail.payment_status).toLowerCase()}` : 'No payment record'} />
                  {detail.payment_status && (
                    <DetailRow icon={CreditCard} label="Transaction"
                      value={detail.transaction_ref || '�'}
                      sub={detail.payment_amount ? `${formatMoney(detail.payment_amount)} via ${detail.payment_method || 'card'}` : undefined} />
                  )}
                  {detail.status_reason && <DetailRow icon={Info} label="Status note" value={detail.status_reason} />}
                </div>

                {detail.notes && (
                  <div className="mt-5 rounded-2xl border border-edge bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Customer notes</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-charcoal">{detail.notes}</p>
                  </div>
                )}

                {detail.review_comment && (
                  <div className="mt-4 rounded-2xl border border-gold/40 bg-gold-100/50 p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-gold-700">
                      Customer review � {detail.review_rating}?
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{detail.review_comment}</p>
                  </div>
                )}

                <p className="mt-5 flex items-start gap-2 rounded-xl border border-edge bg-white px-4 py-3 text-[11.5px] leading-relaxed text-muted">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rosewood" />
                  Status changes, reschedules and cancellations are managed by the customer or
                  provider � this view is read-only for administrators.
                </p>
              </div>

              <footer className="border-t border-edge bg-ivory px-6 py-4">
                <button onClick={() => setDetail(null)} className="btn-secondary w-full !py-3">
                  Close details
                </button>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-edge bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-burgundy-50 text-burgundy">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-0.5 truncate font-display text-base text-burgundy-800">{value}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
