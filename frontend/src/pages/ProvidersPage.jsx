import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Briefcase, BadgeCheck, ChevronLeft, ChevronRight,
  Users, Star, UserSearch
} from 'lucide-react';
import api from '../services/api';
import { useDocumentTitle, useDebounced } from '../hooks/useUtility';
import { Stars } from '../components/ui/Primitives';
import { initials } from '../utilities/format';

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' }
];

function ProviderCard({ p, index }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-[26px] border border-edge bg-white shadow-card transition-all duration-500 ease-elegant hover:-translate-y-2 hover:border-burgundy-100 hover:shadow-lift"
    >
      {/* cover strip */}
      <div className="relative h-20 overflow-hidden bg-burgundy-gradient">
        <div className="noise absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_20%_0%,rgba(214,166,169,0.5),transparent)]" />
        {p.is_featured === 1 && (
          <span className="badge absolute right-4 top-4 border border-gold/40 bg-gold-gradient text-charcoal">
            Featured
          </span>
        )}
      </div>

      <div className="-mt-9 flex flex-1 flex-col px-6 pb-6">
        <div className="relative">
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt={p.name}
              loading="lazy"
              className="h-[72px] w-[72px] rounded-2xl object-cover ring-4 ring-white shadow-card transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <span
            className={`grid h-[72px] w-[72px] place-items-center rounded-2xl bg-burgundy-gradient font-display text-xl text-ivory ring-4 ring-white shadow-card ${
              p.avatar_url ? 'hidden' : ''
            }`}
          >
            {initials(p.name)}
          </span>
          <span className="absolute -bottom-1.5 left-[60px] grid h-6 w-6 place-items-center rounded-full bg-emerald-500 ring-4 ring-white">
            <BadgeCheck className="h-3.5 w-3.5 text-white" strokeWidth={2.6} />
          </span>
        </div>

        <h3 className="mt-4 font-display text-xl text-burgundy-800">
          <Link to={`/professionals/${p.id}`} className="transition-colors hover:text-burgundy">
            {p.name}
          </Link>
        </h3>
        <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-rosewood">
          {p.specialization || 'Specialist'}
        </p>

        <p className="mt-3 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-muted">
          {p.headline || 'A verified Appointify professional ready to help you look and feel your best.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-rosewood" /> {p.experience_years} yrs
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-rosewood" /> {p.appt_count ?? 0}
          </span>
          {p.location && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-rosewood" />
              <span className="truncate">{p.location}</span>
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-edge pt-4" style={{ marginTop: '1.25rem' }}>
          <span className="flex items-center gap-2">
            <Stars value={p.rating_avg || 0} size={13} />
            <span className="text-xs font-bold text-charcoal">{Number(p.rating_avg || 0).toFixed(1)}</span>
            <span className="text-[11px] text-muted">({p.review_count || 0})</span>
          </span>
          <Link
            to={`/professionals/${p.id}`}
            className="rounded-full bg-burgundy-50 px-4 py-2 text-xs font-bold text-burgundy transition-all duration-300 hover:bg-burgundy hover:text-ivory"
          >
            View profile →
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function ProvidersPage() {
  useDocumentTitle('Professionals');
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get('search') || '');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [featured, setFeatured] = useState(false);

  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debounced = useDebounced(search, 450);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams();
      q.set('limit', '9');
      q.set('page', String(page));
      q.set('sort', sort);
      if (debounced) q.set('search', debounced);
      if (featured) q.set('featured', '1');
      const res = await api.get(`/api/providers?${q.toString()}`);
      setProviders(res.data?.data?.providers || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, sort, debounced, featured]);

  useEffect(() => {
    load();
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    setParams(q, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return (
    <div className="bg-ivory pb-24">
      <header className="relative overflow-hidden bg-burgundy-gradient pb-16 pt-[124px]">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-rosewood/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-x relative">
          <span className="eyebrow !text-softrose">
            <span className="h-px w-8 bg-softrose/70" /> Professionals
          </span>
          <h1 className="mt-3.5 max-w-2xl font-display text-4xl leading-[1.08] text-ivory md:text-5xl">
            Specialists who <span className="italic text-softrose">earn five stars</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ivory/70">
            Every professional is verified, reviewed and rated by real Appointify customers.
          </p>

          <div className="mt-8 flex max-w-2xl flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, specialisation or location…"
                aria-label="Search professionals"
                className="field !rounded-full !border-white/25 !bg-white/95 !py-3.5 !pl-12"
              />
            </div>

            <select
              className="field !w-auto !rounded-full !border-white/25 !bg-white/95 !py-3.5 !text-sm !font-semibold"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              aria-label="Sort professionals"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setFeatured((v) => !v);
                setPage(1);
              }}
              className={`btn !rounded-full px-5 py-3.5 text-sm ${
                featured ? 'bg-ivory text-burgundy-800' : 'border border-white/25 bg-white/10 text-ivory hover:bg-white/20'
              }`}
            >
              <Star className={`h-4 w-4 ${featured ? 'fill-gold text-gold' : ''}`} />
              Featured
            </button>
          </div>
        </div>
      </header>

      <div className="container-x mt-10">
        <p className="mb-6 text-sm text-muted">
          {loading ? (
            'Finding professionals…'
          ) : (
            <>
              <span className="font-bold text-charcoal">{pagination.total}</span> professionals available
            </>
          )}
        </p>

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-[26px] border border-edge bg-white" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-burgundy-100 bg-burgundy-50/60 p-12 text-center">
            <p className="font-display text-xl text-burgundy-800">We couldn't load professionals</p>
            <p className="mt-1.5 text-sm text-muted">{error}</p>
            <button onClick={load} className="btn-primary mt-5">Try again</button>
          </div>
        )}

        {!loading && !error && providers.length === 0 && (
          <div className="rounded-3xl border border-dashed border-edge bg-white/70 p-16 text-center">
            <UserSearch className="mx-auto mb-4 h-10 w-10 text-burgundy-200" />
            <p className="font-display text-2xl text-burgundy-800">No professionals found</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Try another search term, or clear the featured filter.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setFeatured(false);
                setPage(1);
              }}
              className="btn-primary mt-6"
            >
              Reset search
            </button>
          </div>
        )}

        {!loading && !error && providers.length > 0 && (
          <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {providers.map((p, i) => (
                <ProviderCard key={p.id} p={p} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="grid h-10 w-10 place-items-center rounded-full border border-edge bg-white text-burgundy transition hover:border-burgundy disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pagination.totalPages }).map((_, i) => {
              const n = i + 1;
              if (Math.abs(n - page) > 2 && n !== 1 && n !== pagination.totalPages) return null;
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={page === n ? 'page' : undefined}
                  className={`h-10 min-w-[40px] rounded-full px-3 text-sm font-bold transition-all duration-300 ${
                    page === n ? 'bg-burgundy text-ivory shadow-glow' : 'border border-edge bg-white text-burgundy hover:border-burgundy'
                  }`}
                >
                  {n}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="grid h-10 w-10 place-items-center rounded-full border border-edge bg-white text-burgundy transition hover:border-burgundy disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
