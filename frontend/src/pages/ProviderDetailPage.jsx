import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Briefcase, BadgeCheck, CalendarPlus, Users,
  Star, Clock, Wallet, ShieldCheck, MessageSquare, Award, Loader2
} from 'lucide-react';
import api from '../services/api';
import { useDocumentTitle } from '../hooks/useUtility';
import { Stars, LoadingRows, ErrorState } from '../components/ui/Primitives';
import { formatMoney, formatDate, initials } from '../utilities/format';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'services', label: 'Services' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'about', label: 'About' }
];

export default function ProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('services');
  const [allReviews, setAllReviews] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/providers/${id}`);
      setData(res.data?.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [load]);

  useEffect(() => {
    if (tab !== 'reviews' || allReviews) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setReviewsLoading(true);
        const res = await api.get(`/api/providers/${id}/reviews`);
        if (!cancelled) setAllReviews(res.data?.data?.reviews || []);
      } catch {
        if (!cancelled) setAllReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, allReviews, id]);

  useDocumentTitle(data?.provider?.name || 'Professional');

  const startBooking = (serviceId) => {
    const q = new URLSearchParams({ provider_id: String(id) });
    if (serviceId) q.set('service_id', String(serviceId));
    const target = `/book?${q.toString()}`;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: target } });
      return;
    }
    navigate(target);
  };

  /* ------------------------------ loading ------------------------------ */
  if (loading) {
    return (
      <div className="bg-ivory pb-24 pt-[124px]">
        <div className="container-x">
          <div className="h-6 w-40 animate-pulse rounded bg-cream" />
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="h-28 w-full animate-pulse rounded-3xl bg-cream" />
              <div className="h-10 w-2/3 animate-pulse rounded bg-cream" />
              <div className="h-64 w-full animate-pulse rounded-3xl bg-cream" />
            </div>
            <div className="h-80 animate-pulse rounded-3xl bg-cream" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ivory pb-24 pt-[140px]">
        <div className="container-x max-w-2xl">
          <ErrorState message={error} onRetry={load} />
          <div className="mt-6 text-center">
            <Link to="/professionals" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back to professionals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { provider, services, reviews, stats } = data;
  const reviewsList = tab === 'reviews' && allReviews ? allReviews : reviews;
  const rating = Number(provider.rating_avg) || 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviewsList.filter((r) => r.rating === star).length;
    return { star, count, pct: reviewsList.length ? (count / reviewsList.length) * 100 : 0 };
  });

  return (
    <div className="bg-ivory pb-24">
      {/* ------------------------------ hero ------------------------------ */}
      <header className="relative overflow-hidden bg-burgundy-gradient pt-[116px]">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 top-6 h-80 w-80 rounded-full bg-rosewood/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-x relative pb-14 pt-6">
          <Link
            to="/professionals"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ivory/65 transition hover:text-ivory"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All professionals
          </Link>

          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={provider.name}
                  className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/25 shadow-lift"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-ivory font-display text-3xl text-burgundy ring-4 ring-white/25 shadow-lift">
                  {initials(provider.name)}
                </span>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="badge border border-white/20 bg-white/10 text-ivory">
                    {provider.specialization || 'Specialist'}
                  </span>
                  {provider.is_featured === 1 && (
                    <span className="badge border border-gold/50 bg-gold-gradient text-charcoal">Featured</span>
                  )}
                  <span className="badge border border-emerald-400/40 bg-emerald-500/20 text-emerald-100">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                </div>
                <h1 className="mt-3 font-display text-4xl leading-[1.08] text-ivory md:text-5xl">
                  {provider.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ivory/75">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-gold text-gold" /> {rating.toFixed(1)}
                    <span className="text-ivory/50">({provider.review_count || reviews.length} reviews)</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-softrose" /> {provider.experience_years} yrs experience
                  </span>
                  {provider.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-softrose" /> {provider.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-dark shrink-0 rounded-3xl p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-softrose">Sessions from</p>
              <p className="mt-1 font-display text-3xl text-ivory">
                {formatMoney(Math.min(...services.map((s) => Number(s.effective_price ?? s.price)), Infinity) || provider.hourly_rate || 0)}
              </p>
              <button onClick={() => startBooking()} className="btn-gold mt-4 w-full !py-3">
                <CalendarPlus className="h-4 w-4" /> Book an appointment
              </button>
            </div>
          </div>

          {/* quick stats */}
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: 'Happy customers', value: stats?.total_customers ?? 0 },
              { icon: CalendarPlus, label: 'Appointments', value: stats?.total_appointments ?? 0 },
              { icon: Award, label: 'Completed', value: stats?.completed ?? 0 },
              { icon: Wallet, label: 'Hourly rate', value: provider.hourly_rate ? formatMoney(provider.hourly_rate) : '—' }
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="glass rounded-2xl px-4 py-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <s.icon className="h-4 w-4 shrink-0 text-burgundy" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg leading-tight text-burgundy-800">{s.value}</p>
                    <p className="truncate text-[10.5px] font-bold uppercase tracking-wider text-muted">{s.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </header>

      {/* ------------------------------ content ------------------------------ */}
      <div className="container-x mt-10">
        <div className="grid gap-10 lg:grid-cols-[1.55fr_1fr]">
          <div>
            {/* tabs */}
            <div className="flex gap-2 border-b border-edge">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`relative px-4 py-3 text-sm font-bold transition-colors ${
                    tab === t.id ? 'text-burgundy' : 'text-muted hover:text-burgundy'
                  }`}
                >
                  {t.label}
                  {t.id === 'services' && ` (${services.length})`}
                  {t.id === 'reviews' && ` (${reviewsList.length})`}
                  {tab === t.id && (
                    <motion.span
                      layoutId="provider-tab"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-burgundy"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-7">
              <AnimatePresence mode="wait">
                {/* ---------------- services ---------------- */}
                {tab === 'services' && (
                  <motion.div
                    key="services"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-4"
                  >
                    {services.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-edge bg-white/70 p-12 text-center">
                        <Clock className="mx-auto mb-3 h-8 w-8 text-burgundy-200" />
                        <p className="font-display text-lg text-burgundy-800">No services published yet</p>
                        <p className="mt-1.5 text-sm text-muted">Check back shortly — this professional is still setting up.</p>
                      </div>
                    ) : (
                      services.map((s, i) => (
                        <motion.article
                          key={s.id}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="group flex flex-col gap-4 rounded-[26px] border border-edge bg-white p-5 shadow-card transition-all duration-500 ease-elegant hover:-translate-y-1.5 hover:border-burgundy-100 hover:shadow-lift sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="badge border border-edge bg-ivory text-rosewood">{s.category_name}</span>
                            </div>
                            <h3 className="mt-2.5 font-display text-xl text-burgundy-800">{s.name}</h3>
                            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{s.description}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-semibold text-muted">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-rosewood" /> {s.effective_duration ?? s.duration_min} min
                              </span>
                              <span className="flex items-center gap-1.5 text-burgundy">
                                <Wallet className="h-3.5 w-3.5" />
                                {formatMoney(s.effective_price ?? s.price)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => startBooking(s.id)}
                            className="btn-primary shrink-0 !rounded-full px-5 py-2.5 text-xs"
                          >
                            Book <span className="hidden sm:inline">this service</span>
                          </button>
                        </motion.article>
                      ))
                    )}
                  </motion.div>
                )}

                {/* ---------------- reviews ---------------- */}
                {tab === 'reviews' && (
                  <motion.div
                    key="reviews"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                  >
                    {reviewsLoading ? (
                      <LoadingRows rows={4} />
                    ) : reviewsList.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-edge bg-white/70 p-12 text-center">
                        <Star className="mx-auto mb-3 h-8 w-8 text-gold" />
                        <p className="font-display text-lg text-burgundy-800">No reviews yet</p>
                        <p className="mt-1.5 text-sm text-muted">Be the first to book and share your experience.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
                        {/* distribution */}
                        <div className="h-fit rounded-3xl border border-edge bg-white p-5 shadow-card">
                          <p className="font-display text-5xl leading-none text-burgundy-800">{rating.toFixed(1)}</p>
                          <div className="mt-2"><Stars value={rating} size={16} /></div>
                          <p className="mt-1.5 text-xs text-muted">Based on {provider.review_count || reviewsList.length} reviews</p>
                          <div className="mt-4 space-y-2">
                            {distribution.map((d) => (
                              <div key={d.star} className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                                <span className="w-3 text-right">{d.star}</span>
                                <Star className="h-3 w-3 fill-gold text-gold" />
                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
                                  <span className="block h-full rounded-full bg-gold" style={{ width: `${d.pct}%` }} />
                                </span>
                                <span className="w-4 text-right">{d.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* list */}
                        <div className="space-y-4">
                          {reviewsList.map((r, i) => (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05, duration: 0.45 }}
                              className="rounded-2xl border border-edge bg-white p-5 shadow-card"
                            >
                              <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-xs font-bold text-burgundy">
                                  {initials(r.customer_name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-charcoal">{r.customer_name}</p>
                                  <p className="truncate text-xs text-muted">{r.service_name}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <Stars value={r.rating} size={13} />
                                  <p className="mt-0.5 text-[11px] text-muted">{formatDate(r.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                              </div>
                              <p className="mt-3.5 text-sm leading-relaxed text-muted">“{r.comment}”</p>
                              {r.response && (
                                <div className="mt-3.5 rounded-xl border border-edge bg-ivory/70 p-3.5">
                                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-rosewood">
                                    <MessageSquare className="h-3 w-3" /> {provider.name} replied
                                  </p>
                                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{r.response}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ---------------- about ---------------- */}
                {tab === 'about' && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                  >
                    <h2 className="font-display text-2xl text-burgundy-800">About {provider.name.split(' ')[0]}</h2>
                    <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted">
                      {provider.bio ||
                        `${provider.name} is a verified Appointify professional with ${provider.experience_years} years of experience. Sessions are tailored, unhurried and designed around your goals.`}
                    </p>

                    <div className="mt-7 grid gap-4 sm:grid-cols-3">
                      {[
                        { icon: Briefcase, label: 'Experience', value: `${provider.experience_years} years` },
                        { icon: MapPin, label: 'Location', value: provider.location || 'Studio-wide' },
                        { icon: ShieldCheck, label: 'Licence', value: provider.license_number || 'Verified on file' }
                      ].map((f) => (
                        <div key={f.label} className="rounded-2xl border border-edge bg-white p-5 shadow-card">
                          <f.icon className="h-5 w-5 text-rosewood" />
                          <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-muted">{f.label}</p>
                          <p className="mt-1 font-display text-lg text-burgundy-800">{f.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-7 rounded-3xl border border-edge bg-gradient-to-br from-ivory to-cream p-6">
                      <p className="eyebrow">Working with {provider.name.split(' ')[0]}</p>
                      <ul className="mt-4 space-y-3">
                        {[
                          'A short consultation first, so every session is planned around you.',
                          'Transparent pricing — you see the exact cost before you confirm.',
                          'Approval-based booking, reminders and easy rescheduling from your dashboard.',
                          'Double-booking protection with real-time availability.'
                        ].map((line) => (
                          <li key={line} className="flex items-start gap-3 text-sm text-muted">
                            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-burgundy-50 text-burgundy">✓</span>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ------------------------------ sidebar ------------------------------ */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[26px] border border-edge bg-white p-6 shadow-card">
              <h3 className="font-display text-xl text-burgundy-800">Book with {provider.name.split(' ')[0]}</h3>
              <p className="mt-2 text-sm text-muted">
                Pick a service and choose a live slot — availability is checked in real time.
              </p>
              <button onClick={() => startBooking()} className="btn-primary mt-5 w-full !py-3.5">
                <CalendarPlus className="h-4 w-4" /> Check availability
              </button>

              <div className="mt-5 space-y-3 border-t border-edge pt-5">
                {[
                  { icon: ShieldCheck, text: 'Double-booking protection' },
                  { icon: Clock, text: 'Free cancellation up to 24h before' },
                  { icon: Star, text: `${rating.toFixed(1)} average from ${provider.review_count || 0} reviews` }
                ].map((f) => (
                  <p key={f.text} className="flex items-center gap-2.5 text-[13px] text-muted">
                    <f.icon className="h-4 w-4 shrink-0 text-rosewood" /> {f.text}
                  </p>
                ))}
              </div>
            </div>

            {/* contact card */}
            <div className="mt-5 rounded-[26px] border border-edge bg-cream p-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">Contact</p>
              <div className="mt-3 space-y-2 text-[13.5px] text-charcoal">
                <p className="truncate">{provider.email}</p>
                {provider.phone && <p>{provider.phone}</p>}
                {provider.location && (
                  <p className="flex items-center gap-2 text-muted"><MapPin className="h-4 w-4 text-rosewood" /> {provider.location}</p>
                )}
              </div>
              <Link to="/contact" className="btn-secondary mt-4 w-full !py-2.5 text-xs">
                Message support
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-ivory/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button onClick={() => startBooking()} className="btn-primary w-full !py-3.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
          Book with {provider.name.split(' ')[0]}
        </button>
      </div>
    </div>
  );
}
