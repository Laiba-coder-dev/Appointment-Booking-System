import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, X, Timer, ArrowUpRight, LayoutGrid,
  ChevronLeft, ChevronRight, Sparkles, PackageOpen
} from 'lucide-react';
import api from '../services/api';
import { useDocumentTitle, useDebounced } from '../hooks/useUtility';
import { Stars, SectionHeading } from '../components/ui/Primitives';
import { formatMoney } from '../utilities/format';

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'duration_asc', label: 'Shortest duration' },
  { value: 'name', label: 'Name A–Z' }
];

function ServiceCard({ s, index }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-edge bg-white shadow-card transition-all duration-500 ease-elegant hover:-translate-y-2 hover:border-burgundy-100 hover:shadow-lift"
    >
      <Link to={`/services/${s.id}`} className="relative block aspect-[16/10] overflow-hidden bg-cream">
        <img
          src={s.image_url || 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80'}
          alt={s.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-elegant group-hover:scale-110"
          onError={(e) => (e.currentTarget.style.opacity = '0')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/70 via-transparent to-transparent" />
        <span className="badge absolute left-3.5 top-3.5 border border-white/30 bg-white/90 text-burgundy backdrop-blur">
          {s.category_name}
        </span>
        <span className="absolute bottom-3 right-3.5 font-display text-xl font-bold text-ivory drop-shadow">
          {formatMoney(s.price)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link to={`/services/${s.id}`}>
          <h3 className="font-display text-lg leading-snug text-burgundy-800 transition-colors group-hover:text-burgundy">
            {s.name}
          </h3>
        </Link>

        <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">
          {s.description || 'A signature treatment delivered by verified Appointify professionals.'}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-edge pt-3.5">
          <div className="flex items-center gap-3 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1">
              <Timer className="h-3.5 w-3.5 text-rosewood" /> {s.duration_min} min
            </span>
            {Number(s.rating_avg) > 0 && (
              <span className="flex items-center gap-1">
                <Stars value={s.rating_avg} size={11} />
              </span>
            )}
          </div>
          <Link
            to={`/services/${s.id}`}
            className="grid h-8 w-8 place-items-center rounded-full bg-burgundy text-ivory transition-all duration-300 group-hover:scale-110 group-hover:bg-burgundy-800"
            aria-label={`Open ${s.name}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function ServicesPage() {
  useDocumentTitle('Services');
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [sort, setSort] = useState(params.get('sort') || 'popular');
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounced(search, 450);

  useEffect(() => {
    api
      .get('/api/services/categories')
      .then((r) => setCategories(r.data?.data?.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    q.set('limit', '9');
    q.set('page', String(page));
    q.set('sort', sort);
    if (debouncedSearch) q.set('search', debouncedSearch);
    if (category) q.set('category', category);
    if (minPrice) q.set('min_price', minPrice);
    if (maxPrice) q.set('max_price', maxPrice);
    if (maxDuration) q.set('max_duration', maxDuration);
    return q.toString();
  }, [page, sort, debouncedSearch, category, minPrice, maxPrice, maxDuration]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/services?${buildQuery()}`);
      setServices(res.data?.data?.services || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    load();
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    if (sort !== 'popular') q.set('sort', sort);
    if (page > 1) q.set('page', String(page));
    setParams(q, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuery]);

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setSort('popular');
    setMinPrice('');
    setMaxPrice('');
    setMaxDuration('');
    setPage(1);
  };

  const activeFilterCount =
    (category ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (maxDuration ? 1 : 0);

  return (
    <div className="bg-ivory pb-24">
      {/* ---------- Page header ---------- */}
      <header className="relative overflow-hidden bg-burgundy-gradient pb-16 pt-[124px]">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-rosewood/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-x relative">
          <span className="eyebrow !text-softrose">
            <span className="h-px w-8 bg-softrose/70" /> Services
          </span>
          <h1 className="mt-3.5 max-w-2xl font-display text-4xl leading-[1.08] text-ivory md:text-5xl">
            Find the treatment that <span className="italic text-softrose">fits your day</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ivory/70">
            Browse {pagination.total || '…'} services across wellness, beauty, health,
            fitness and consulting — every one bookable in real time.
          </p>

          {/* search bar */}
          <div className="mt-8 flex max-w-2xl flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search services, categories, treatments…"
                aria-label="Search services"
                className="field !rounded-full !border-white/25 !bg-white/95 !py-3.5 !pl-12 !pr-4"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`btn !rounded-full px-5 py-3.5 text-sm ${
                showFilters || activeFilterCount
                  ? 'bg-ivory text-burgundy-800'
                  : 'border border-white/25 bg-white/10 text-ivory hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-burgundy text-[10px] font-extrabold text-ivory">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* category chips */}
          <div className="hide-scroll mt-6 flex gap-2.5 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setCategory('');
                setPage(1);
              }}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-300 ${
                !category
                  ? 'border-ivory bg-ivory text-burgundy-800'
                  : 'border-white/25 bg-white/10 text-ivory/85 hover:border-white/50'
              }`}
            >
              All services
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCategory(category === c.slug ? '' : c.slug);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-300 ${
                  category === c.slug
                    ? 'border-ivory bg-ivory text-burgundy-800'
                    : 'border-white/25 bg-white/10 text-ivory/85 hover:border-white/50'
                }`}
              >
                {c.name}
                <span className="ml-1.5 opacity-60">{c.service_count}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- Filter drawer ---------- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-edge bg-cream"
          >
            <div className="container-x grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="field-label">Sort by</label>
                <select
                  className="field"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Min price</label>
                <input
                  type="number" min="0" className="field" placeholder="$0"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="field-label">Max price</label>
                <input
                  type="number" min="0" className="field" placeholder="$500"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="field-label">Max duration</label>
                <select
                  className="field"
                  value={maxDuration}
                  onChange={(e) => { setMaxDuration(e.target.value); setPage(1); }}
                >
                  <option value="">Any length</option>
                  <option value="30">Up to 30 min</option>
                  <option value="60">Up to 1 hour</option>
                  <option value="90">Up to 1.5 hours</option>
                  <option value="120">Up to 2 hours</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <button onClick={resetFilters} className="btn-ghost btn-sm !text-burgundy">
                  <X className="h-3.5 w-3.5" /> Clear all filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Results ---------- */}
      <div className="container-x mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {loading ? (
              'Loading services…'
            ) : (
              <>
                Showing{' '}
                <span className="font-bold text-charcoal">{services.length}</span> of{' '}
                <span className="font-bold text-charcoal">{pagination.total}</span> services
                {category && (
                  <span className="ml-2 rounded-full bg-burgundy-50 px-2.5 py-1 text-[11px] font-bold text-burgundy">
                    {categories.find((c) => c.slug === category)?.name || category}
                  </span>
                )}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted" htmlFor="sort-top">
              Sort
            </label>
            <select
              id="sort-top"
              className="field !w-auto !py-2 !text-xs"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="overflow-hidden rounded-[26px] border border-edge bg-white">
                <div className="aspect-[16/10] animate-pulse bg-cream" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-cream" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-cream" />
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-cream" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-burgundy-100 bg-burgundy-50/60 p-12 text-center">
            <PackageOpen className="mx-auto mb-3 h-9 w-9 text-rosewood" />
            <p className="font-display text-xl text-burgundy-800">We couldn't load services</p>
            <p className="mt-1.5 text-sm text-muted">{error}</p>
            <button onClick={load} className="btn-primary mt-5">Try again</button>
          </div>
        )}

        {!loading && !error && services.length === 0 && (
          <div className="rounded-3xl border border-dashed border-edge bg-white/70 p-16 text-center">
            <LayoutGrid className="mx-auto mb-4 h-10 w-10 text-burgundy-200" />
            <p className="font-display text-2xl text-burgundy-800">No services found</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Try a different search term or clear your filters to see everything on offer.
            </p>
            <button onClick={resetFilters} className="btn-primary mt-6">
              <Sparkles className="h-4 w-4" /> Clear filters
            </button>
          </div>
        )}

        {!loading && !error && services.length > 0 && (
          <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {services.map((s, i) => (
                <ServiceCard key={s.id} s={s} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ---------- Pagination ---------- */}
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
              const near = Math.abs(n - page) <= 2;
              const edge = n === 1 || n === pagination.totalPages;
              if (!near && !edge) {
                if (n === 3 || n === pagination.totalPages - 2) {
                  return <span key={n} className="px-1 text-muted">…</span>;
                }
                return null;
              }
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={page === n ? 'page' : undefined}
                  className={`h-10 min-w-[40px] rounded-full px-3 text-sm font-bold transition-all duration-300 ${
                    page === n
                      ? 'bg-burgundy text-ivory shadow-glow'
                      : 'border border-edge bg-white text-burgundy hover:border-burgundy'
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
