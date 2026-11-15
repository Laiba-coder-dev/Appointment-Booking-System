import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Search, X, Clock, MapPin, User, FileText, AlertCircle,
  RefreshCw, Trash2, CheckCircle2, CalendarClock, Star, Filter
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, SelectInput, Tabs, Pagination,
  StateBlock, ConfirmDialog, Chip
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState, Stars } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney, formatDate, formatTime, relativeTime, initials, statusLabel } from '../../utilities/format';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Awaiting approval' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' }
];

const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function CustomerAppointmentsPage() {
  useDocumentTitle('Your appointments');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 400);

  const [selected, setSelected] = useState(null);   // detail drawer
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [rescheduleError, setRescheduleError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) q.set('status', status);
      if (debouncedSearch) q.set('search', debouncedSearch);
      const res = await api.get(`/api/appointments?${q.toString()}`);
      setRows(res.data?.data?.appointments || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load appointments');
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, debouncedSearch]);

  const openDetail = (row) => {
    setSelected(row);
    setRescheduleOpen(false);
    setRescheduleError(null);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      setBusy(true);
      await api.delete(`/api/appointments/${cancelTarget.id}`);
      toast.success('Appointment cancelled');
      setCancelTarget(null);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not cancel this appointment');
    } finally {
      setBusy(false);
    }
  };

  const submitReschedule = async () => {
    if (!selected || !newStart) return;
    try {
      setBusy(true);
      setRescheduleError(null);
      const iso = new Date(newStart).toISOString();
      await api.patch(`/api/appointments/${selected.id}/reschedule`, { start_at: iso });
      toast.success('Appointment rescheduled — a confirmation email is on its way');
      setRescheduleOpen(false);
      setSelected(null);
      load();
    } catch (err) {
      setRescheduleError(err.message || 'Could not reschedule — that slot may be taken');
      if (err.response?.status === 409) setRescheduleOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'service',
      header: 'Service',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-burgundy-gradient text-[11px] font-bold text-ivory">
            {initials(r.provider_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">{r.service_name}</p>
            <p className="truncate text-xs text-muted">{r.provider_name}</p>
          </div>
        </div>
      )
    },
    {
      key: 'start_at',
      header: 'When',
      render: (r) => (
        <div>
          <p className="whitespace-nowrap font-semibold text-charcoal">
            {formatDate(r.start_at, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-muted">{formatTime(r.start_at)} · {r.duration_min} min</p>
        </div>
      )
    },
    { key: 'reference', header: 'Reference', className: 'font-mono text-xs text-muted' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status === 'pending' ? 'Awaiting approval' : undefined} /> },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (r) => r.payment_status
        ? <StatusBadge status={r.payment_status} />
        : <span className="text-xs text-muted">—</span>
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); openDetail(r); }}
          className="btn-ghost !py-1.5 text-xs"
        >
          Details
        </button>
      )
    }
  ], []);

  const canManage = selected && ['pending', 'confirmed'].includes(selected.status);

  return (
    <div>
      <PageIntro
        eyebrow="Your bookings"
        title="Appointments"
        description="Track, reschedule or cancel — changes take effect immediately and we email everyone involved."
        actions={
          <Link to="/services" className="btn-primary !py-2.5 text-sm">
            <CalendarDays className="h-4 w-4" /> Book an appointment
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3">
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by service, professional or reference…"
            className="min-w-[240px] flex-1"
            label="Search appointments"
          />
          <SelectInput
            value=""
            onChange={() => {}}
            label="All"
            ariaLabel="Additional filters"
            className="opacity-60"
            options={[]}
          />
          {(search || status) && (
            <button
              onClick={() => { setSearch(''); setStatus(''); }}
              className="btn-ghost !py-2.5 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <Panel flush>
        <StateBlock
          loading={loading}
          error={error}
          onRetry={load}
          empty={!loading && rows.length === 0}
          emptyIcon={CalendarDays}
          emptyTitle={status || debouncedSearch ? 'No appointments match' : 'No appointments yet'}
          emptyDescription={
            status || debouncedSearch
              ? 'Try clearing the filters to see your full history.'
              : 'Book your first appointment and it will show up here with live status.'
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
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
                    onClick={() => openDetail(r)}
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

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onChange={setPage}
        noun="appointments"
      />

      {/* ============================ detail drawer ============================ */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-burgundy-950/45 backdrop-blur-sm"
              onClick={() => !busy && setSelected(null)}
            />
            <motion.aside
              initial={{ x: 460 }}
              animate={{ x: 0 }}
              exit={{ x: 460 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[440px] flex-col bg-lightbg shadow-lift"
              role="dialog"
              aria-modal="true"
              aria-label="Appointment details"
            >
              <header className="flex items-start justify-between gap-4 border-b border-edge bg-ivory px-6 py-5">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-rosewood">
                    {selected.reference}
                  </p>
                  <h3 className="mt-1 font-display text-xl text-burgundy-800">{selected.service_name}</h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-edge bg-white text-burgundy transition hover:border-burgundy"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status} label={selected.status === 'pending' ? 'Awaiting approval' : undefined} />
                  {selected.payment_status && <StatusBadge status={selected.payment_status} />}
                  {selected.review_id && (
                    <span className="badge border border-gold/40 bg-gold-100 text-gold-700">
                      <Star className="h-3 w-3" /> Reviewed
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  <DetailRow icon={Clock} label="When"
                    value={`${formatDate(selected.start_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
                    sub={`${formatTime(selected.start_at)} – ${formatTime(new Date(new Date(selected.start_at).getTime() + selected.duration_min * 60000))} · ${selected.duration_min} minutes`} />
                  <DetailRow icon={User} label="Professional" value={selected.provider_name} />
                  <DetailRow icon={FileText} label="Booking reference" value={selected.reference} sub="Quote this if you contact us" />
                  <DetailRow icon={MapPin} label="Price"
                    value={formatMoney(selected.price)}
                    sub={selected.payment_status === 'paid' ? 'Paid in full' : selected.payment_status ? `Payment ${statusLabel(selected.payment_status).toLowerCase()}` : 'Settle at the appointment'} />
                  {selected.status_reason && (
                    <DetailRow icon={AlertCircle} label="Reason" value={selected.status_reason} />
                  )}
                </div>

                {selected.notes && (
                  <div className="mt-5 rounded-2xl border border-edge bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Your notes</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-charcoal">{selected.notes}</p>
                  </div>
                )}

                {/* reschedule form */}
                {canManage && rescheduleOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-2xl border border-burgundy-200 bg-burgundy-50/50 p-4"
                  >
                    <p className="text-sm font-bold text-burgundy-800">Pick a new date &amp; time</p>
                    {rescheduleError && (
                      <p className="mt-2 flex items-start gap-2 rounded-lg border border-burgundy-100 bg-white px-3 py-2 text-xs text-burgundy-700">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {rescheduleError}
                      </p>
                    )}
                    <input
                      type="datetime-local"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      min={toLocalInput(new Date(Date.now() + 3600000).toISOString())}
                      aria-label="New date and time"
                      className="field mt-3 bg-white"
                    />
                    <div className="mt-3 flex gap-2">
                      <button onClick={submitReschedule} disabled={busy || !newStart} className="btn-primary btn-sm flex-1">
                        {busy ? <Spinner className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                        Confirm new time
                      </button>
                      <button onClick={() => setRescheduleOpen(false)} disabled={busy} className="btn-secondary btn-sm">
                        Back
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Times are shown in your local timezone. We'll re-check availability before saving.
                    </p>
                  </motion.div>
                )}
              </div>

              {canManage && (
                <footer className="border-t border-edge bg-ivory px-6 py-4">
                  {!rescheduleOpen ? (
                    <div className="flex gap-2.5">
                      <button onClick={() => { setRescheduleOpen(true); setNewStart(''); setRescheduleError(null); }}
                        className="btn-secondary flex-1 !py-3">
                        <RefreshCw className="h-4 w-4" /> Reschedule
                      </button>
                      <button onClick={() => setCancelTarget(selected)} className="btn flex-1 border border-burgundy-100 bg-burgundy-50 px-5 py-3 text-sm text-burgundy-700 hover:bg-burgundy-100">
                        <Trash2 className="h-4 w-4" /> Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRescheduleOpen(false)} className="btn-ghost w-full !py-2.5">
                      <X className="h-4 w-4" /> Stop rescheduling
                    </button>
                  )}
                </footer>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ============================ cancel dialog ============================ */}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this appointment?"
        message={
          cancelTarget
            ? `${cancelTarget.service_name} with ${cancelTarget.provider_name} on ${formatDate(cancelTarget.start_at, { weekday: 'long', month: 'long', day: 'numeric' })} at ${formatTime(cancelTarget.start_at)} will be released. ${cancelTarget.payment_status === 'paid' ? 'A refund will be issued automatically.' : 'No payment has been taken.'}`
            : ''
        }
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep appointment"
        loading={busy}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />

      {rows.length === 0 && !loading && !error && (status || debouncedSearch) && (
        <div className="mt-6">
          <EmptyState
            icon={Search}
            title="No matches"
            description="Adjust or clear your filters to see every appointment."
            action={
              <button onClick={() => { setSearch(''); setStatus(''); }} className="btn-secondary btn-sm">
                <Filter className="h-3.5 w-3.5" /> Reset filters
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-edge bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-burgundy-50 text-burgundy">
        <Icon className="h-4.5 w-4.5 h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-0.5 truncate font-display text-base text-burgundy-800">{value}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
