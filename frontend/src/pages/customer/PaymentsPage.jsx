import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, X, Receipt, Printer, CreditCard,
  ArrowRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, Tabs, Pagination, StateBlock, StatCard
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney, formatDate, formatTime, statusLabel } from '../../utilities/format';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' }
];

export default function CustomerPaymentsPage() {
  useDocumentTitle('Payment history');

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ gross: 0, refunded: 0, pending_amount: 0, count: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const [receiptFor, setReceiptFor] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (q) params.set('search', q);
      const res = await api.get(`/api/payments?${params.toString()}`);
      setRows(res.data?.data?.payments || []);
      setSummary(res.data?.data?.summary || { gross: 0, refunded: 0, pending_amount: 0, count: 0 });
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load payments');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, q]);

  const openReceipt = async (row) => {
    setReceiptFor(row);
    setReceipt(null);
    setReceiptError(null);
    setReceiptLoading(true);
    try {
      const res = await api.get(`/api/payments/${row.id}/receipt`);
      setReceipt(res.data?.data?.receipt || null);
    } catch (err) {
      setReceiptError(err.message || 'Receipt unavailable');
    } finally {
      setReceiptLoading(false);
    }
  };

  const printReceipt = () => {
    const w = window.open('', '_blank', 'width=520,height=720');
    if (!w || !receipt) return;
    w.document.write(`<!doctype html><html><head><title>Receipt ${receipt.transaction_ref}</title>
      <style>
        body{font-family:Georgia,serif;color:#2A2A2A;padding:36px;max-width:520px;margin:auto}
        h1{color:#641E32;font-size:22px;letter-spacing:.5px}
        .ref{font-family:ui-monospace,monospace;background:#F8EFE6;padding:8px 12px;border-radius:8px;display:inline-block;margin:12px 0}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        td{padding:8px 0;border-bottom:1px solid #E9DDD7;font-size:14px}
        td:last-child{text-align:right;font-weight:700}
        .total{font-size:18px;color:#641E32;font-weight:700}
        .muted{color:#756B68;font-size:12px}
      </style></head><body>
      <h1>Appointify — Payment receipt</h1>
      <p class="muted">Thank you. Keep this for your records.</p>
      <div class="ref">${receipt.transaction_ref}</div>
      <table>
        <tr><td>Service</td><td>${receipt.service_name || '—'}</td></tr>
        <tr><td>Professional</td><td>${receipt.provider_name || '—'}</td></tr>
        <tr><td>Appointment</td><td>${receipt.appointment_reference || '—'}</td></tr>
        <tr><td>Date</td><td>${receipt.start_at ? new Date(receipt.start_at).toLocaleString() : '—'}</td></tr>
        <tr><td>Customer</td><td>${receipt.customer_name || ''}</td></tr>
        <tr><td>Status</td><td>${statusLabel(receipt.status)}</td></tr>
        <tr><td class="total">Amount</td><td class="total">${formatMoney(receipt.amount)}</td></tr>
      </table>
      <p class="muted" style="margin-top:24px">Appointify · 18 Rosewood Lane, Suite 400 · Boston, MA 02110</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  const columns = useMemo(() => [
    {
      key: 'service_name',
      header: 'Service',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-charcoal">{r.service_name}</p>
          <p className="truncate text-xs text-muted">with {r.provider_name}</p>
        </div>
      )
    },
    { key: 'appointment_reference', header: 'Appointment', className: 'font-mono text-xs text-muted' },
    { key: 'transaction_ref', header: 'Transaction', className: 'font-mono text-xs text-muted' },
    {
      key: 'created_at',
      header: 'Date',
      render: (r) => (
        <div>
          <p className="whitespace-nowrap font-semibold text-charcoal">{formatDate(r.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          <p className="text-xs text-muted">{formatTime(r.created_at)}</p>
        </div>
      )
    },
    { key: 'amount', header: 'Amount', className: 'font-bold text-charcoal', render: (r) => formatMoney(r.amount) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); openReceipt(r); }} className="btn-ghost !py-1.5 text-xs"
          disabled={r.status !== 'paid'}>
          <Receipt className="h-3.5 w-3.5" /> Receipt
        </button>
      )
    }
  ], []);

  const anyPaid = rows.some((r) => r.status === 'paid');

  return (
    <div>
      <PageIntro
        eyebrow="Billing"
        title="Payment history"
        description="Every transaction on your account, with printable receipts for anything you've settled."
        actions={
          <Link to="/dashboard/appointments" className="btn-secondary !py-2.5 text-sm">
            <ArrowRight className="h-4 w-4" /> My appointments
          </Link>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Wallet} label="Total paid" value={formatMoney(summary.gross)}
              sub={`${summary.count || 0} transaction${Number(summary.count) === 1 ? '' : 's'}`} tone="gold" />
            <StatCard icon={CheckCircle2} label="Outstanding" value={formatMoney(summary.pending_amount)}
              sub="Payments not yet settled" tone="amber" delay={0.06} />
            <StatCard icon={Receipt} label="Refunded" value={formatMoney(summary.refunded)}
              sub="Returned to your card" tone="rosewood" delay={0.12} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by reference or transaction…"
              className="sm:ml-auto sm:w-72"
              label="Search payments"
            />
          </div>

          <Panel flush className="mt-5">
            <StateBlock
              loading={false}
              empty={rows.length === 0}
              emptyIcon={CreditCard}
              emptyTitle={status || q ? 'No matching payments' : 'No payments yet'}
              emptyDescription={status || q
                ? 'Clear the filters to see every transaction.'
                : 'Once you pay for an appointment it will appear here with a receipt.'}
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

          {!loading && rows.length === 0 && !status && !q && (
            <div className="mt-6">
              <EmptyState
                icon={Wallet}
                title="Nothing to bill yet"
                description="Pay at checkout for instant confirmation, or settle at the appointment."
                action={<Link to="/services" className="btn-primary btn-sm">Browse services</Link>}
              />
            </div>
          )}
          {loading && <p className="mt-4 text-center text-xs text-muted">Loading…</p>}
          {!loading && anyPaid && (
            <p className="mt-4 text-center text-[11.5px] text-muted">
              Receipts open in a new window and can be printed or saved as PDF.
            </p>
          )}
        </>
      </StateBlock>

      {/* ============================ receipt modal ============================ */}
      <AnimatePresence>
        {receiptFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setReceiptFor(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog"
              aria-modal="true"
              aria-label="Payment receipt"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">Receipt</p>
                    <p className="mt-1 font-display text-xl">{formatMoney(receiptFor.amount)}</p>
                  </div>
                  <button onClick={() => setReceiptFor(null)} aria-label="Close receipt"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="px-6 py-5">
                {receiptLoading ? (
                  <div className="flex flex-col items-center py-10">
                    <Spinner className="h-6 w-6 text-burgundy" />
                    <p className="mt-3 text-sm text-muted">Fetching receipt…</p>
                  </div>
                ) : receiptError ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <AlertCircle className="mb-3 h-8 w-8 text-burgundy" />
                    <p className="text-sm font-bold text-charcoal">Receipt unavailable</p>
                    <p className="mt-1 text-xs text-muted">{receiptError}</p>
                  </div>
                ) : receipt ? (
                  <>
                    <div className="rounded-2xl border border-edge bg-ivory/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Transaction</span>
                        <span className="font-mono text-sm font-bold text-burgundy-800">{receipt.transaction_ref}</span>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-2.5 text-sm">
                      <Line label="Service" value={receipt.service_name} />
                      <Line label="Professional" value={receipt.provider_name} />
                      <Line label="Appointment" value={receipt.appointment_reference} />
                      <Line label="Date" value={receipt.start_at ? formatDate(receipt.start_at, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
                      <Line label="Customer" value={receipt.customer_name} />
                      <Line label="Status" value={statusLabel(receipt.status)} />
                      <div className="flex items-baseline justify-between border-t border-edge pt-3">
                        <dt className="font-display text-base text-burgundy-800">Total</dt>
                        <dd className="font-display text-xl text-burgundy-800">{formatMoney(receipt.amount)}</dd>
                      </div>
                    </dl>

                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      <button onClick={printReceipt} className="btn-primary !py-3">
                        <Printer className="h-4 w-4" /> Print / Save PDF
                      </button>
                      <button onClick={() => setReceiptFor(null)} className="btn-secondary !py-3">
                        Close
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="truncate text-right text-sm font-semibold text-charcoal">{value || '—'}</dd>
    </div>
  );
}
