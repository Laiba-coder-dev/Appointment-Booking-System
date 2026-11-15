import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Search, X, CheckCircle2, XCircle, Ban, ClipboardCheck,
  AlertTriangle, User, Clock, FileText, Phone, Filter, Info, Inbox
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, Tabs, Pagination, StateBlock
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatDate, formatTime, relativeTime, initials, statusLabel } from '../../utilities/format';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'no_show', label: 'No show' }
];

/** Allowed transitions per appointment.controller.js */
const ACTIONS = {
  pending: [
    { status: 'confirmed', label: 'Confirm', icon: CheckCircle2, tone: 'success' },
    { status: 'rejected', label: 'Decline', icon: XCircle, tone: 'muted' }
  ],
  confirmed: [
    { status: 'completed', label: 'Mark completed', icon: ClipboardCheck, tone: 'success' },
    { status: 'no_show', label: 'No show', icon: AlertTriangle, tone: 'muted' },
    { status: 'cancelled', label: 'Cancel', icon: Ban, tone: 'danger' }
  ]
};

export default function ProviderAppointmentsPage() {
  useDocumentTitle('Appointments');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(null);      // { row, action }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      // Unapproved bookings live in the "Booking requests" approval queue —
      // they never appear directly in this list.
      else params.set('exclude', 'pending');
      if (q) params.set('search', q);
      const res = await api.get(`/api/appointments?${params.toString()}`);
      setRows(res.data?.data?.appointments || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load appointments');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  /* tab counts (one lightweight unfiltered query) */
  const loadCounts = useCallback(async () => {
    try {
      const [all, pending] = await Promise.all([
        api.get('/api/appointments?limit=1&exclude=pending'),
        api.get('/api/appointments?limit=1&status=pending').catch(() => null)
      ]);
      setCounts({
        '': all.data?.data?.pagination?.total || 0,
        requests: pending?.data?.data?.pagination?.total || 0
      });
    } catch { /* optional */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, q]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  const confirmAction = async () => {
    if (!dialog) return;
    try {
      setBusy(true);
      await api.patch(`/api/appointments/${dialog.row.id}/status`, {
        status: dialog.action.status,
        status_reason: reason.trim() || undefined
      });
      toast.success(
        dialog.action.status === 'confirmed' ? 'Appointment confirmed — customer notified'
        : dialog.action.status === 'completed' ? 'Marked as completed'
        : `Appointment ${statusLabel(dialog.action.status).toLowerCase()}`
      );
      setDialog(null);
      setReason('');
      setDetail(null);
      load();
      loadCounts();
    } catch (err) {
      toast.error(err.message || 'Could not update this appointment');
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'customer_name',
      header: 'Customer',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-burgundy-50 font-display text-sm text-burgundy">
            {initials(r.customer_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">{r.customer_name}</p>
            <p className="truncate text-xs text-muted">{r.customer_email}</p>
          </div>
        </div>
      )
    },
    { key: 'service_name', header: 'Service', render: (r) => <span className="font-semibold">{r.service_name}</span> },
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
    { key: 'reference', header: 'Ref', className: 'font-mono text-xs text-muted' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); setDetail(r); }} className="btn-ghost !py-1.5 text-xs">
          Manage
        </button>
      )
    }
  ], []);

  const detailActions = detail ? ACTIONS[detail.status] || [] : [];

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="Appointments"
        description="Approved bookings live here — confirm new visits, mark them complete and keep your day running smoothly."
        actions={
          <Link to="/provider/availability" className="btn-secondary !py-2.5 text-sm">
            <Clock className="h-4 w-4" /> Availability
          </Link>
        }
      />

      {counts.requests > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/50 bg-gold-100/70 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold text-burgundy-800">
              <Inbox className="h-4.5 w-4.5 h-5 w-5" />
            </span>
            <p className="text-sm text-charcoal">
              <strong>{counts.requests}</strong> booking request{counts.requests === 1 ? '' : 's'} waiting for your approval.
            </p>
          </div>
          <Link to="/provider/requests" className="btn btn-sm bg-burgundy px-4 py-2 text-xs text-ivory hover:bg-burgundy-800">
            Review requests
          </Link>
        </motion.div>
      )}

      <div className="mb-5 flex flex-col gap-3">
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by customer, service or reference…"
            className="min-w-[240px] flex-1"
            label="Search appointments"
          />
          {(search || status) && (
            <button onClick={() => { setSearch(''); setStatus(''); }} className="btn-ghost !py-2.5 text-xs">
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
          emptyTitle={status || q ? 'No appointments match' : 'No appointments yet'}
          emptyDescription={status || q
            ? 'Clear the filters to see your full schedule.'
            : 'Approved bookings will appear here. New requests wait in your approval queue.'}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
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

      {counts[''] !== undefined && (
        <p className="mt-4 text-center text-[11.5px] text-muted">{counts['']} appointments total</p>
      )}

      {/* ============================ detail drawer ============================ */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-burgundy-950/45 backdrop-blur-sm"
              onClick={() => !busy && setDetail(null)}
            />
            <motion.aside
              initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[440px] flex-col bg-lightbg shadow-lift"
              role="dialog" aria-modal="true" aria-label="Appointment management"
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
                </div>

                <div className="mt-5 space-y-3">
                  <Row icon={User} label="Customer" value={detail.customer_name} sub={detail.customer_email} />
                  <Row icon={Phone} label="Phone" value={detail.customer_phone || 'Not provided'} />
                  <Row icon={Clock} label="When"
                    value={formatDate(detail.start_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    sub={`${formatTime(detail.start_at)} · ${detail.duration_min} minutes · ${relativeTime(detail.start_at)}`} />
                  <Row icon={FileText} label="Reference" value={detail.reference} />
                  {detail.status_reason && <Row icon={Info} label="Status note" value={detail.status_reason} />}
                </div>

                {detail.notes && (
                  <div className="mt-5 rounded-2xl border border-edge bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Customer notes</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-charcoal">{detail.notes}</p>
                  </div>
                )}

                {detail.status_reason && detail.status === 'cancelled' && (
                  <div className="mt-4 rounded-2xl border border-rosewood/25 bg-rosewood/10 p-4">
                    <p className="text-xs font-bold text-rosewood">Cancellation reason</p>
                    <p className="mt-1 text-sm text-charcoal">{detail.status_reason}</p>
                  </div>
                )}
              </div>

              {detailActions.length > 0 && (
                <footer className="border-t border-edge bg-ivory px-6 py-4">
                  <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted">Update status</p>
                  <div className="flex flex-wrap gap-2">
                    {detailActions.map((a) => (
                      <button
                        key={a.status}
                        onClick={() => { setDialog({ row: detail, action: a }); setReason(''); }}
                        disabled={busy}
                        className={`btn btn-sm !py-2.5 text-xs ${
                          a.tone === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : a.tone === 'danger'
                              ? 'border border-burgundy-100 bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100'
                              : 'border border-edge bg-white text-muted hover:border-burgundy-200 hover:text-burgundy'
                        }`}
                      >
                        <a.icon className="h-3.5 w-3.5" /> {a.label}
                      </button>
                    ))}
                  </div>
                </footer>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ============================ action dialog ============================ */}
      <AnimatePresence>
        {dialog && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[82] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setDialog(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="appt-action-title"
            >
              <div className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start gap-4">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    dialog.action.tone === 'danger' ? 'bg-white/15 text-softrose' : 'bg-white/15 text-ivory'
                  }`}>
                    <dialog.action.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">
                      {statusLabel(dialog.action.status)}
                    </p>
                    <h3 id="appt-action-title" className="mt-1 font-display text-xl">
                      {dialog.action.label} this appointment?
                    </h3>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <p className="text-sm leading-relaxed text-muted">
                  <strong className="text-charcoal">{dialog.row.customer_name}</strong> · {dialog.row.service_name} ·{' '}
                  {formatDate(dialog.row.start_at, { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                  {formatTime(dialog.row.start_at)}.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {dialog.action.status === 'confirmed'
                    ? 'The customer receives a confirmation email immediately.'
                    : dialog.action.status === 'completed'
                      ? 'This closes the appointment and unlocks the review flow for the customer.'
                      : 'The customer will be notified of this change by email.'}
                </p>

                <label htmlFor="appt-reason" className="field-label mt-4">
                  Reason <span className="font-normal text-muted">(optional, sent to the customer)</span>
                </label>
                <input
                  id="appt-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={250}
                  placeholder="e.g. Scheduling conflict, running late…"
                  className="field"
                />

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button onClick={() => setDialog(null)} disabled={busy} className="btn-secondary">
                    Go back
                  </button>
                  <button
                    onClick={confirmAction}
                    disabled={busy}
                    className={`px-6 py-3 text-sm ${
                      dialog.action.tone === 'danger'
                        ? 'btn bg-burgundy text-ivory hover:bg-burgundy-800'
                        : 'btn-primary'
                    }`}
                  >
                    {busy && <Spinner className="h-4 w-4" />}
                    {dialog.action.label}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {rows.length === 0 && !loading && !error && (status || q) && (
        <div className="mt-6">
          <EmptyState
            icon={Filter}
            title="No matches"
            description="Try another status or clear your search."
            action={<button onClick={() => { setSearch(''); setStatus(''); }} className="btn-secondary btn-sm">Reset filters</button>}
          />
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value, sub }) {
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
