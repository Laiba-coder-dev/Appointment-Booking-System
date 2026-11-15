import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Search, X, Receipt, Undo2, TrendingUp, AlertTriangle,
  CreditCard, CheckCircle2, Hourglass, Filter, AlertCircle, Info
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, Tabs, Pagination, StateBlock,
  StatCard, BusyOverlay
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney, formatDate, formatTime, initials, statusLabel } from '../../utilities/format';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partial' },
  { value: 'failed', label: 'Failed' }
];

export default function AdminPaymentsPage() {
  useDocumentTitle('Payments & refunds');

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ gross: 0, refunded: 0, pending_amount: 0, count: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundError, setRefundError] = useState(null);
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (q) params.set('search', q);
      const res = await api.get(`/api/admin/payments?${params.toString()}`);
      setRows(res.data?.data?.payments || []);
      setTotals(res.data?.data?.totals || { gross: 0, refunded: 0, pending_amount: 0, count: 0 });
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load payments');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, q]);

  const openRefund = (row) => {
    setRefundTarget(row);
    setRefundAmount(String(Number(row.amount) || 0));
    setRefundError(null);
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) {
      setRefundError('Enter an amount greater than zero');
      return;
    }
    if (amt > Number(refundTarget.amount)) {
      setRefundError(`Cannot exceed ${formatMoney(refundTarget.amount)}`);
      return;
    }
    try {
      setRefunding(true);
      setRefundError(null);
      const res = await api.post(`/api/admin/payments/${refundTarget.id}/refund`, { amount: amt });
      toast.success(res.data?.message || 'Refund processed');
      setRefundTarget(null);
      load();
    } catch (err) {
      setRefundError(err.message || 'Could not process this refund');
    } finally {
      setRefunding(false);
    }
  };

  const refundable = refundTarget && ['paid', 'partially_refunded'].includes(refundTarget.status);
  const maxRefund = refundTarget
    ? Math.max(0, Number(refundTarget.amount) - Number(refundTarget.refunded_amount || 0))
    : 0;

  const columns = useMemo(() => [
    {
      key: 'customer_name',
      header: 'Customer',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-burgundy-gradient text-[11px] font-bold text-ivory">
            {initials(r.customer_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">{r.customer_name}</p>
            <p className="truncate text-xs text-muted">{r.customer_email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'service_name',
      header: 'Service',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-charcoal">{r.service_name}</p>
          <p className="truncate text-xs text-muted">with {r.provider_name}</p>
        </div>
      )
    },
    { key: 'transaction_ref', header: 'Transaction', className: 'font-mono text-xs text-muted' },
    { key: 'appointment_reference', header: 'Appointment', className: 'font-mono text-xs text-muted' },
    {
      key: 'created_at',
      header: 'Date',
      render: (r) => (
        <div>
          <p className="whitespace-nowrap font-semibold text-charcoal">
            {formatDate(r.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-xs text-muted">{formatTime(r.created_at)}</p>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'font-bold text-burgundy-800',
      render: (r) => (
        <div>
          <p>{formatMoney(r.amount)}</p>
          {Number(r.refunded_amount) > 0 && (
            <p className="text-[11px] font-semibold text-rosewood">−{formatMoney(r.refunded_amount)} refunded</p>
          )}
        </div>
      )
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); openRefund(r); }}
          disabled={!['paid', 'partially_refunded'].includes(r.status)}
          className="btn-ghost !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          title={['paid', 'partially_refunded'].includes(r.status) ? 'Issue a refund' : 'Not refundable'}
        >
          <Undo2 className="h-3.5 w-3.5" /> Refund
        </button>
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div>
      <PageIntro
        eyebrow="Admin console"
        title="Payments"
        description="Every transaction across the platform — with full and partial refunds when needed."
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={TrendingUp} label="Gross collected" value={formatMoney(totals.gross)}
              sub={`${Number(totals.count) || 0} transaction${Number(totals.count) === 1 ? '' : 's'}`} tone="gold" />
            <StatCard icon={Hourglass} label="Pending" value={formatMoney(totals.pending_amount)}
              sub="Not yet settled" delay={0.06} />
            <StatCard icon={Undo2} label="Refunded" value={formatMoney(totals.refunded)}
              sub="Returned to customers" tone="rosewood" delay={0.12} />
            <StatCard icon={Wallet} label="Net"
              value={formatMoney(Number(totals.gross) - Number(totals.refunded))}
              sub="Gross minus refunds" tone="emerald" delay={0.18} />
          </div>

          <div className="mt-6 mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search transaction, reference or customer…"
              className="sm:ml-auto sm:w-80"
              label="Search payments"
            />
            {(status || q) && (
              <button onClick={() => { setStatus(''); setSearch(''); }} className="btn-ghost !py-2.5 text-xs">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          <Panel flush>
            <StateBlock
              loading={false}
              empty={rows.length === 0}
              emptyIcon={CreditCard}
              emptyTitle={status || q ? 'No payments match' : 'No payments yet'}
              emptyDescription={status || q
                ? 'Clear the filters to see every transaction.'
                : 'Transactions appear here as customers pay for appointments.'}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-left">
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
                        className="border-b border-edge/60 transition-colors last:border-0 hover:bg-ivory/60"
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
            onChange={setPage} noun="payments" />

          <p className="mt-4 text-center text-[11.5px] text-muted">
            Refunds are recorded against the original transaction and the customer is emailed automatically.
          </p>
        </>
      </StateBlock>

      {rows.length === 0 && !loading && !error && (status || q) && (
        <div className="mt-6">
          <EmptyState
            icon={Filter}
            title="No matches"
            description="Try a different status or clear your search."
            action={<button onClick={() => { setStatus(''); setSearch(''); }} className="btn-secondary btn-sm">Reset filters</button>}
          />
        </div>
      )}

      {/* ============================ refund modal ============================ */}
      <AnimatePresence>
        {refundTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !refunding) setRefundTarget(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="refund-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">
                      {refundable ? 'Issue refund' : 'Transaction detail'}
                    </p>
                    <h3 id="refund-title" className="mt-1 font-display text-xl">
                      {formatMoney(refundTarget.amount)} · {statusLabel(refundTarget.status)}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-ivory/70">{refundTarget.transaction_ref}</p>
                  </div>
                  <button onClick={() => !refunding && setRefundTarget(null)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="relative px-6 py-5">
                <BusyOverlay show={refunding} label="Processing refund…" />

                <div className="rounded-2xl border border-edge bg-ivory/60 p-4 text-sm">
                  <Row label="Customer" value={refundTarget.customer_name} />
                  <Row label="Service" value={refundTarget.service_name} />
                  <Row label="Provider" value={refundTarget.provider_name} />
                  <Row label="Appointment" value={refundTarget.appointment_reference} />
                  <Row label="Paid on" value={formatDate(refundTarget.created_at, { month: 'short', day: 'numeric', year: 'numeric' })} />
                </div>

                {refundable ? (
                  <>
                    {refundError && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-burgundy-100 bg-burgundy-50 px-4 py-3 text-[13px] text-burgundy-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {refundError}
                      </div>
                    )}

                    <label htmlFor="refund-amt" className="field-label mt-4">
                      Refund amount <span className="font-normal text-muted">(max {formatMoney(maxRefund)})</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">$</span>
                      <input
                        id="refund-amt"
                        type="number" min="0.01" step="0.01" max={maxRefund}
                        value={refundAmount}
                        onChange={(e) => { setRefundAmount(e.target.value); setRefundError(null); }}
                        className="field !pl-8"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setRefundAmount(String(maxRefund))}
                        className="btn-ghost !py-1.5 text-xs"
                      >
                        Full {formatMoney(maxRefund)}
                      </button>
                      <button
                        onClick={() => setRefundAmount(String((maxRefund / 2).toFixed(2)))}
                        className="btn-ghost !py-1.5 text-xs"
                      >
                        Half
                      </button>
                    </div>

                    <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-xs leading-relaxed text-charcoal">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
                      The appointment keeps its current status — only the payment record changes.
                      The customer receives a refund confirmation email.
                    </p>

                    <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                      <button onClick={() => setRefundTarget(null)} disabled={refunding} className="btn-secondary">
                        Cancel
                      </button>
                      <button onClick={submitRefund} disabled={refunding} className="btn-primary px-6 py-3 text-sm">
                        {refunding ? <Spinner className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                        Refund {formatMoney(refundAmount || 0)}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <div className="flex items-start gap-2.5 rounded-xl border border-edge bg-cream px-4 py-3 text-[13px] text-muted">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rosewood" />
                      This payment is <strong className="text-charcoal">{statusLabel(refundTarget.status).toLowerCase()}</strong> —
                      only paid or partially refunded transactions can be refunded.
                    </div>
                    <button onClick={() => setRefundTarget(null)} className="btn-secondary mt-5 w-full !py-3">
                      Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !error && rows.length > 0 && (
        <p className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-muted">
          <Receipt className="h-3.5 w-3.5 text-rosewood" />
          Showing page {pagination.page} of {pagination.totalPages} · {pagination.total} transactions total
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        </p>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-edge/70 py-1.5 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-charcoal">{value || '—'}</span>
    </div>
  );
}
