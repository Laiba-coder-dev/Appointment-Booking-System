import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Search, Mail, Phone, CalendarCheck, Clock, X, UserSearch,
  ArrowRight, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, Pagination, StateBlock, StatCard
} from '../../components/ui/DashboardBits';
import { EmptyState } from '../../components/ui/Primitives';
import { formatDate, initials, truncate } from '../../utilities/format';

export default function ProviderCustomersPage() {
  useDocumentTitle('Your customers');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (q) params.set('search', q);
      const res = await api.get(`/api/provider/customers?${params.toString()}`);
      setRows(res.data?.data?.customers || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load customers');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q]);

  const repeatCustomers = rows.filter((r) => Number(r.total_appointments) > 1).length;
  const totalCompleted = rows.reduce((s, r) => s + Number(r.completed || 0), 0);

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="Your customers"
        description="Everyone who has booked with you — with visit history at a glance."
        actions={
          <Link to="/provider/appointments" className="btn-secondary !py-2.5 text-sm">
            <CalendarCheck className="h-4 w-4" /> Appointments <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={6}>
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Users} label="Customers shown" value={pagination.total}
              sub={q ? `matching “${truncate(q, 24)}”` : 'Total unique customers'} />
            <StatCard icon={CheckCircle2} label="Completed visits" value={totalCompleted}
              sub="On this page" tone="emerald" delay={0.06} />
            <StatCard icon={CalendarCheck} label="Repeat clients" value={repeatCustomers}
              sub="Booked more than once" tone="rosewood" delay={0.12} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or email…"
              className="min-w-[240px] flex-1"
              label="Search customers"
            />
            {search && (
              <button onClick={() => setSearch('')} className="btn-ghost !py-2.5 text-xs">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          <Panel flush className="mt-5">
            <StateBlock
              loading={false}
              empty={rows.length === 0}
              emptyIcon={UserSearch}
              emptyTitle={q ? 'No customers match' : 'No customers yet'}
              emptyDescription={q
                ? 'Try a different name or email address.'
                : 'Customers appear here the moment they book their first appointment with you.'}
            >
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                {rows.map((c, i) => (
                  <motion.article
                    key={c.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-3xl border border-edge bg-white p-5 transition-all duration-400 ease-elegant hover:-translate-y-1 hover:border-burgundy-200 hover:shadow-lift"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-burgundy-gradient font-display text-base text-ivory">
                        {c.avatar_url
                          ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                          : initials(c.name)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base text-burgundy-800">{c.name}</h3>
                        <p className="truncate text-xs text-muted">{c.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-ivory/70 py-2.5">
                        <p className="font-display text-lg text-burgundy-800">{Number(c.total_appointments)}</p>
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-muted">Bookings</p>
                      </div>
                      <div className="rounded-xl bg-ivory/70 py-2.5">
                        <p className="font-display text-lg text-emerald-700">{Number(c.completed)}</p>
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-muted">Done</p>
                      </div>
                      <div className="rounded-xl bg-ivory/70 py-2.5">
                        <p className="font-display text-lg text-rosewood">
                          {Number(c.total_appointments) - Number(c.completed)}
                        </p>
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-muted">Other</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-edge pt-3.5 text-xs text-muted">
                      <p className="flex items-center gap-2 truncate">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-rosewood" />
                        Last visit {c.last_visit ? formatDate(c.last_visit, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                      {c.phone && (
                        <p className="flex items-center gap-2 truncate">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-rosewood" />
                          <a href={`tel:${c.phone}`} className="hover:text-burgundy">{c.phone}</a>
                        </p>
                      )}
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-rosewood" />
                        <a href={`mailto:${c.email}`} className="hover:text-burgundy">{c.email}</a>
                      </p>
                    </div>

                    <Link
                      to={`/provider/appointments?search=${encodeURIComponent(c.email)}`}
                      className="btn-secondary mt-4 w-full !py-2.5 text-xs"
                    >
                      View appointments <ArrowRight className="h-3 w-3" />
                    </Link>
                  </motion.article>
                ))}
              </div>
            </StateBlock>
          </Panel>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onChange={setPage}
            noun="customers"
          />
        </>
      </StateBlock>

      {!loading && !error && rows.length === 0 && !q && (
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="Your first customer is one booking away"
            description="Share your profile link — bookings land here automatically."
            action={<Link to="/provider/availability" className="btn-primary btn-sm">Set your availability</Link>}
          />
        </div>
      )}
    </div>
  );
}
