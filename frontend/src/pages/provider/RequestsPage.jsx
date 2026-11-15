import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, CheckCircle2, XCircle, Clock, User, Phone, FileText,
  CalendarDays, Search, X, Info, CreditCard
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, Pagination, StateBlock
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatDate, formatTime, relativeTime, initials, formatMoney, statusLabel } from '../../utilities/format';
import toast from 'react-hot-toast';

/**
 * Booking requests — the approval queue.
 *
 * Every new booking lands here as `pending`. The professional Accepts
 * (pending → confirmed) or Declines (pending → rejected, auto-refund if paid).
 * Nothing enters the Appointments list before it is approved.
 */
export default function ProviderRequestsPage() {
  useDocumentTitle('Booking requests');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const [detail, setDetail] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10', status: 'pending' });
      if (q) params.set('search', q);
      const res = await api.get(`/api/appointments?${params.toString()}`);
      setRows(res.data?.data?.appointments || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load booking requests');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q]);

  const decide = async (row, status, statusReason) => {
    try {
      setBusy(true);
      await api.patch(`/api/appointments/${row.id}/status`, {
        status,
        status_reason: statusReason || undefined
      });
      toast.success(
        status === 'confirmed'
          ? `Request accepted — ${row.customer_name} has been emailed`
          : 'Request declined' + (row.payment_status === 'paid' ? ' · payment refunded' : '')
      );
      setDeclineTarget(null);
      setReason('');
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update this request');
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
      header: 'Requested for',
      render: (r) => (
        <div>
          <p className="whitespace-nowrap font-semibold text-charcoal">
            {formatDate(r.start_at, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-muted">{formatTime(r.start_at)} · {r.duration_min} min</p>
        </div>
      )
    },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (r) => (r.payment_status
        ? <StatusBadge status={r.payment_status} />
        : <span className="text-xs text-muted">Pay at appointment</span>)
    },
    { key: 'reference', header: 'Ref', className: 'font-mono text-xs text-muted' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => decide(r, 'confirmed')}
            disabled={busy}
            aria-label={`Accept request from ${r.customer_name}`}
            className="btn btn-sm border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Accept
          </button>
          <button
            onClick={() => { setDeclineTarget(r); setReason(''); }}
            disabled={busy}
            aria-label={`Decline request from ${r.customer_name}`}
            className="btn btn-sm border border-edge bg-white px-3 py-1.5 text-xs font-bold text-muted hover:border-burgundy-200 hover:text-burgundy"
          >
            <XCircle className="h-3.5 w-3.5" /> Decline
          </button>
        </div>
      )
    }
  ], [busy]);

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="Booking requests"
        description="Approve or decline new bookings — customers are notified instantly, and declined payments are refunded automatically."
        actions={
          <Link to="/provider/appointments" className="btn-secondary !py-2.5 text-sm">
            <CalendarDays className="h-4 w-4" /> Appointments
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by customer, service or reference…"
            className="min-w-[240px] flex-1"
            label="Search booking requests"
          />
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost !py-2.5 text-xs">
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
          emptyIcon={Inbox}
          emptyTitle={q ? 'No requests match' : 'No booking requests'}
          emptyDescription={q
            ? 'Clear the search to see every pending request.'
            : 'New bookings land here for your approval before they appear in your appointments.'}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
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
        onChange={setPage} noun="requests" />

      {rows.length === 0 && !loading && !error && q && (
        <div className="mt-6">
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try another customer, service or reference."
            action={<button onClick={() => setSearch('')} className="btn-secondary btn-sm">Reset search</button>}
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
              onClick={() => !busy && setDetail(null)}
            />
            <motion.aside
              initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[440px] flex-col bg-lightbg shadow-lift"
              role="dialog" aria-modal="true" aria-label="Booking request details"
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
                  <StatusBadge status={detail.status} label="Awaiting your approval" />
                  {detail.payment_status && <StatusBadge status={detail.payment_status} />}
                </div>

                <div className="mt-5 space-y-3">
                  <Row icon={User} label="Customer" value={detail.customer_name} sub={detail.customer_email} />
                  <Row icon={Phone} label="Phone" value={detail.customer_phone || 'Not provided'} />
                  <Row icon={Clock} label="Requested for"
                    value={formatDate(detail.start_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    sub={`${formatTime(detail.start_at)} · ${detail.duration_min} minutes · ${relativeTime(detail.start_at)}`} />
                  <Row icon={CreditCard} label="Payment"
                    value={detail.payment_status ? `${statusLabel(detail.payment_status)} · ${formatMoney(detail.payment_amount)}` : 'Pay at the appointment'}
                    sub={detail.payment_status === 'paid' ? 'Declining refunds this payment automatically' : undefined} />
                  <Row icon={FileText} label="Reference" value={detail.reference} />
                </div>

                {detail.notes && (
                  <div className="mt-5 rounded-2xl border border-edge bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Customer notes</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-charcoal">{detail.notes}</p>
                  </div>
                )}

                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-[12.5px] leading-relaxed text-charcoal">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                  <span>Accepting moves this booking into your <strong>Appointments</strong> list and emails the customer.
                    Declining removes it and refunds any captured payment.</span>
                </div>
              </div>

              <footer className="border-t border-edge bg-ivory px-6 py-4">
                <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted">Your decision</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => decide(detail, 'confirmed')}
                    disabled={busy}
                    className="btn btn-sm border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    {busy ? <Spinner className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Accept request
                  </button>
                  <button
                    onClick={() => { setDeclineTarget(detail); setReason(''); }}
                    disabled={busy}
                    className="btn btn-sm border border-edge bg-white px-4 py-2.5 text-xs font-bold text-muted hover:border-burgundy-200 hover:text-burgundy"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ============================ decline dialog ============================ */}
      <AnimatePresence>
        {declineTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[82] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) { setDeclineTarget(null); setReason(''); } }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="decline-title"
            >
              <div className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-softrose">
                    <XCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">Decline request</p>
                    <h3 id="decline-title" className="mt-1 font-display text-xl">
                      Decline {declineTarget.customer_name}&rsquo;s booking?
                    </h3>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <p className="text-sm leading-relaxed text-muted">
                  <strong className="text-charcoal">{declineTarget.service_name}</strong> ·{' '}
                  {formatDate(declineTarget.start_at, { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                  {formatTime(declineTarget.start_at)}.
                  {' '}The customer is notified by email
                  {declineTarget.payment_status === 'paid' ? ' and the payment is refunded automatically' : ''}.
                </p>

                <label htmlFor="decline-reason" className="field-label mt-4">
                  Reason <span className="font-normal text-muted">(optional, sent to the customer)</span>
                </label>
                <textarea
                  id="decline-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={250}
                  rows={3}
                  placeholder="e.g. Fully booked that day…"
                  className="field resize-none"
                />

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => { setDeclineTarget(null); setReason(''); }}
                    disabled={busy}
                    className="btn-secondary"
                  >
                    Keep request
                  </button>
                  <button
                    onClick={() => decide(declineTarget, 'rejected', reason.trim() || undefined)}
                    disabled={busy}
                    className="btn bg-burgundy px-6 py-3 text-sm text-ivory hover:bg-burgundy-800"
                  >
                    {busy && <Spinner className="h-4 w-4" />}
                    Decline request
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
