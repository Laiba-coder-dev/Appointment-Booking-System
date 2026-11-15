import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Search, CheckCircle2, XCircle, Star, CalendarDays,
  Briefcase, Eye, X, AlertCircle, ShieldCheck, Clock, Users
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, Tabs, Pagination, StateBlock, ConfirmDialog, StatCard
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState, Stars } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatDate, initials, truncate } from '../../utilities/format';
import toast from 'react-hot-toast';

export default function AdminProvidersPage() {
  useDocumentTitle('Provider approvals');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [approval, setApproval] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(null);   // { provider, decision }
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadCounts = useCallback(async () => {
    try {
      const [p, a, r] = await Promise.all([
        api.get('/api/admin/providers?approval=pending&limit=1'),
        api.get('/api/admin/providers?approval=approved&limit=1'),
        api.get('/api/admin/providers?approval=rejected&limit=1')
      ]);
      setCounts({
        pending: p.data?.data?.pagination?.total || 0,
        approved: a.data?.data?.pagination?.total || 0,
        rejected: r.data?.data?.pagination?.total || 0
      });
    } catch { /* optional */ }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (approval) params.set('approval', approval);
      if (q) params.set('search', q);
      const res = await api.get(`/api/admin/providers?${params.toString()}`);
      setRows(res.data?.data?.providers || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load providers');
    } finally {
      setLoading(false);
    }
  }, [approval, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { setPage(1); }, [approval, q]);

  const decide = async () => {
    if (!dialog) return;
    try {
      setBusy(true);
      await api.patch(`/api/admin/providers/${dialog.provider.id}/approval`, {
        approval_status: dialog.decision
      });
      toast.success(`${dialog.provider.name} ${dialog.decision}`);
      setDialog(null);
      setDetail(null);
      load();
      loadCounts();
    } catch (err) {
      toast.error(err.message || 'Could not update this provider');
    } finally {
      setBusy(false);
    }
  };

  const meta = detail
    ? [
        { icon: Briefcase, label: 'Specialization', value: detail.specialization || 'Generalist' },
        { icon: Clock, label: 'Experience', value: `${detail.experience_years ?? 0} years` },
        { icon: CalendarDays, label: 'Bookings', value: detail.appointment_count },
        { icon: Users, label: 'Services', value: detail.service_count },
        { icon: Star, label: 'Rating', value: detail.rating_avg ? `${Number(detail.rating_avg).toFixed(1)} (${detail.review_count})` : 'No reviews yet' },
        { icon: ShieldCheck, label: 'Licence', value: detail.license_number || 'Not provided' }
      ]
    : [];

  return (
    <div>
      <PageIntro
        eyebrow="Admin console"
        title="Providers"
        description="Review professional applications, approve listings and manage who's visible on the platform."
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Clock} label="Pending review" value={counts.pending}
              sub={counts.pending ? 'Waiting on your decision' : 'Queue is clear'}
              tone={counts.pending ? 'amber' : 'emerald'} />
            <StatCard icon={CheckCircle2} label="Approved" value={counts.approved}
              sub="Live on the platform" delay={0.06} />
            <StatCard icon={XCircle} label="Rejected" value={counts.rejected}
              sub="Application declined" tone="rosewood" delay={0.12} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs
              tabs={[
                { value: 'pending', label: 'Pending', count: counts.pending },
                { value: 'approved', label: 'Approved', count: counts.approved },
                { value: 'rejected', label: 'Rejected', count: counts.rejected },
                { value: '', label: 'All' }
              ]}
              value={approval}
              onChange={setApproval}
            />
            <SearchInput value={search} onChange={setSearch}
              placeholder="Search name, email, specialization…" className="sm:ml-auto sm:w-72"
              label="Search providers" />
          </div>

          <Panel flush className="mt-5">
            <StateBlock
              loading={false}
              empty={rows.length === 0}
              emptyIcon={Building2}
              emptyTitle={approval === 'pending' ? 'No pending applications' : 'No providers match'}
              emptyDescription={approval === 'pending'
                ? 'New professional applications will appear here for review.'
                : 'Try a different tab or clear your search.'}
            >
              <ul className="divide-y divide-edge/70">
                {rows.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.25) }}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-ivory/50 sm:px-6"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-burgundy-gradient font-display text-sm text-ivory">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(p.name)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-charcoal">{p.name}</p>
                        <StatusBadge status={p.approval_status === 'approved' ? 'approved' : p.approval_status === 'pending' ? 'pending' : 'rejected_provider'}
                          label={p.approval_status} />
                        {!Number(p.is_active) && (
                          <span className="badge border border-edge bg-cream text-muted">Account disabled</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {p.email} · {p.specialization || 'Generalist'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] font-semibold text-muted">
                        <span>{p.service_count} service{Number(p.service_count) === 1 ? '' : 's'}</span>
                        <span>{p.appointment_count} booking{Number(p.appointment_count) === 1 ? '' : 's'}</span>
                        {Number(p.rating_avg) > 0 && (
                          <span className="flex items-center gap-1 text-gold-700">
                            <Star className="h-3 w-3 fill-current" /> {Number(p.rating_avg).toFixed(1)}
                          </span>
                        )}
                        <span>Joined {formatDate(p.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setDetail(p)} className="btn-ghost !py-2 text-xs">
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      {p.approval_status !== 'approved' && (
                        <button
                          onClick={() => setDialog({ provider: p, decision: 'approved' })}
                          disabled={busyId === p.id}
                          className="btn btn-sm border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          {busyId === p.id ? <Spinner className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Approve
                        </button>
                      )}
                      {p.approval_status !== 'rejected' && (
                        <button
                          onClick={() => setDialog({ provider: p, decision: 'rejected' })}
                          disabled={busyId === p.id}
                          className="btn btn-sm border border-edge bg-white px-3.5 py-2 text-xs font-bold text-muted hover:border-burgundy-200 hover:text-burgundy"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </StateBlock>
          </Panel>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total}
            onChange={setPage} noun="providers" />
        </>
      </StateBlock>

      {rows.length === 0 && !loading && !error && !approval && (
        <div className="mt-6">
          <EmptyState icon={Building2} title="No providers yet" description="Professionals appear here once they register." />
        </div>
      )}

      {/* ============================ detail drawer ============================ */}
      {detail && (
        <div className="fixed inset-0 z-[75] flex" role="dialog" aria-modal="true" aria-label="Provider details">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 bg-burgundy-950/45 backdrop-blur-sm"
            onClick={() => setDetail(null)}
          />
          <motion.aside
            initial={{ x: 460 }} animate={{ x: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full max-w-[440px] flex-col bg-lightbg shadow-lift"
          >
            <header className="flex items-start justify-between gap-4 border-b border-edge bg-ivory px-6 py-5">
              <div className="flex items-center gap-3.5">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-burgundy-gradient font-display text-lg text-ivory">
                  {detail.avatar_url ? <img src={detail.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(detail.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg text-burgundy-800">{detail.name}</h3>
                  <p className="truncate text-xs text-muted">{detail.email}</p>
                </div>
              </div>
              <button onClick={() => setDetail(null)} aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-edge bg-white text-burgundy transition hover:border-burgundy">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={detail.approval_status === 'approved' ? 'approved' : detail.approval_status === 'pending' ? 'pending' : 'rejected_provider'}
                  label={detail.approval_status} />
                {detail.phone && <span className="badge border border-edge bg-white text-muted">{detail.phone}</span>}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {meta.map((m) => (
                  <div key={m.label} className="rounded-2xl border border-edge bg-white p-4">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-muted">
                      <m.icon className="h-3.5 w-3.5 text-rosewood" /> {m.label}
                    </span>
                    <p className="mt-1.5 truncate font-display text-base text-burgundy-800">{m.value}</p>
                  </div>
                ))}
              </div>

              {detail.headline && (
                <div className="mt-5 rounded-2xl border border-edge bg-white p-4">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">Headline</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{detail.headline}</p>
                </div>
              )}

              {detail.bio && (
                <div className="mt-4 rounded-2xl border border-edge bg-white p-4">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">Bio</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-charcoal">{detail.bio}</p>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-edge bg-white p-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">Contact</p>
                <p className="mt-1.5 break-all text-sm text-charcoal">{detail.email}</p>
                {detail.phone && <p className="mt-1 text-sm text-charcoal">{detail.phone}</p>}
                <p className="mt-2 text-xs text-muted">
                  Location: {detail.location || 'Not provided'} · Applied{' '}
                  {formatDate(detail.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <p className="mt-4 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-xs leading-relaxed text-charcoal">
                <strong>Approval effect:</strong> approved providers appear in search, can publish
                services and take bookings immediately. Rejected applicants are notified by email.
              </p>
            </div>

            <footer className="flex gap-2.5 border-t border-edge bg-ivory px-6 py-4">
              {detail.approval_status !== 'approved' && (
                <button
                  onClick={() => setDialog({ provider: detail, decision: 'approved' })}
                  className="btn-primary flex-1 !py-3"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
              )}
              {detail.approval_status !== 'rejected' && (
                <button
                  onClick={() => setDialog({ provider: detail, decision: 'rejected' })}
                  className="btn flex-1 border border-burgundy-100 bg-burgundy-50 px-5 py-3 text-sm text-burgundy-700 hover:bg-burgundy-100"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              )}
              {detail.approval_status === 'approved' && (
                <p className="flex-1 text-center text-sm font-semibold text-emerald-700">
                  <ShieldCheck className="mr-1.5 inline h-4 w-4" /> Already approved
                </p>
              )}
            </footer>
          </motion.aside>
        </div>
      )}

      <ConfirmDialog
        open={!!dialog}
        tone={dialog?.decision === 'rejected' ? 'danger' : 'info'}
        title={dialog?.decision === 'approved' ? 'Approve this provider?' : 'Reject this application?'}
        message={dialog
          ? `${dialog.provider.name} (${dialog.provider.email}) will be ${dialog.decision === 'approved'
              ? 'approved — their profile goes live, they can publish services, and we email them the good news.'
              : 'rejected — they are notified by email and cannot publish services until re-reviewed.'}`
          : ''}
        confirmLabel={dialog?.decision === 'approved' ? 'Approve provider' : 'Reject application'}
        cancelLabel="Decide later"
        loading={busy}
        onConfirm={decide}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
