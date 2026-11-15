import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Timer, Wallet, ShieldCheck, MapPin, BadgeCheck,
  CalendarPlus, Users, Star, PackageOpen
} from 'lucide-react';
import api from '../services/api';
import { useDocumentTitle } from '../hooks/useUtility';
import { Stars, LoadingRows, ErrorState } from '../components/ui/Primitives';
import { formatMoney, initials } from '../utilities/format';
import { useAuth } from '../context/AuthContext';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/services/${id}`);
      setData(res.data?.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useDocumentTitle(data?.service?.name || 'Service');

  const startBooking = (providerId) => {
    const q = new URLSearchParams({ service_id: String(id) });
    if (providerId) q.set('provider_id', String(providerId));
    const target = `/book?${q.toString()}`;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: target } });
      return;
    }
    navigate(target);
  };

  if (loading) {
    return (
      <div className="bg-ivory pb-24 pt-[124px]">
        <div className="container-x">
          <div className="h-6 w-40 animate-pulse rounded bg-cream" />
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="h-12 w-3/4 animate-pulse rounded bg-cream" />
              <div className="h-4 w-full animate-pulse rounded bg-cream" />
              <div className="h-72 w-full animate-pulse rounded-3xl bg-cream" />
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
            <Link to="/services" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back to services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { service, providers, reviews } = data;
  const avgRating = reviews.length
    ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
    : Number(service.rating_avg) || 0;

  return (
    <div className="bg-ivory pb-24">
      {/* ---------- Hero ---------- */}
      <header className="relative overflow-hidden bg-burgundy-gradient pt-[116px]">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-rosewood/35 blur-3xl" />

        <div className="container-x relative pb-14 pt-6">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ivory/65 transition hover:text-ivory"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All services
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
            <div>
              <span className="badge border border-white/20 bg-white/10 text-ivory">
                {service.category_name}
              </span>
              <h1 className="mt-4 font-display text-4xl leading-[1.08] text-ivory md:text-5xl">
                {service.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-ivory/75">
                <span className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-softrose" /> {service.duration_min} minutes
                </span>
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-softrose" /> {formatMoney(service.price)}
                </span>
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-gold text-gold" /> {avgRating.toFixed(1)} ({reviews.length} reviews)
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-softrose" /> {providers.length} professionals
                </span>
              </div>
            </div>

            <div className="glass-dark rounded-3xl p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-softrose">
                  Starting at
                </span>
                <span className="font-display text-4xl text-ivory">{formatMoney(service.price)}</span>
              </div>
              <p className="mt-2 text-xs text-ivory/60">
                {service.duration_min}-minute session · free cancellation up to 24h before
              </p>
              <button onClick={() => startBooking()} className="btn-gold mt-5 w-full !py-3.5">
                <CalendarPlus className="h-4 w-4" /> Book this service
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ivory/55">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Secure checkout · approval required
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="container-x -mt-2 mt-10">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          {/* main column */}
          <div>
            {/* image */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[28px] border border-edge shadow-card"
            >
              <img
                src={service.image_url || 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1200&q=80'}
                alt={service.name}
                className="aspect-[16/9] w-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/45 to-transparent" />
            </motion.div>

            {/* tabs */}
            <div className="mt-8 flex gap-2 border-b border-edge">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'professionals', label: `Professionals (${providers.length})` },
                { id: 'reviews', label: `Reviews (${reviews.length})` }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-4 py-3 text-sm font-bold transition-colors ${
                    tab === t.id ? 'text-burgundy' : 'text-muted hover:text-burgundy'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <motion.span
                      layoutId="service-tab"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-burgundy"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-7">
              {tab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <h2 className="font-display text-2xl text-burgundy-800">About this service</h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-muted">
                    {service.description ||
                      'This signature Appointify service is delivered by verified professionals in a calm, carefully designed setting.'}
                  </p>

                  <div className="mt-7 grid gap-4 sm:grid-cols-3">
                    {[
                      { icon: Timer, label: 'Duration', value: `${service.duration_min} min` },
                      { icon: Wallet, label: 'Price', value: formatMoney(service.price) },
                      { icon: ShieldCheck, label: 'Cancellation', value: 'Free up to 24h' }
                    ].map((f) => (
                      <div key={f.label} className="rounded-2xl border border-edge bg-white p-5 shadow-card">
                        <f.icon className="h-5 w-5 text-rosewood" />
                        <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-muted">{f.label}</p>
                        <p className="mt-1 font-display text-lg text-burgundy-800">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  <h3 className="mt-9 font-display text-xl text-burgundy-800">What to expect</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      'A short consultation to understand your goals and preferences.',
                      'A personalised session tailored to your comfort and schedule.',
                      'Aftercare guidance so the benefits last well beyond your visit.',
                      'Approval-based booking with reminders so you never miss a slot.'
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-3 text-sm text-muted">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-burgundy-50 text-burgundy">
                          ✓
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {tab === 'professionals' && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  {providers.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-edge bg-white/70 p-12 text-center">
                      <Users className="mx-auto mb-3 h-8 w-8 text-burgundy-200" />
                      <p className="font-display text-lg text-burgundy-800">No professionals linked yet</p>
                      <p className="mt-1.5 text-sm text-muted">This service is available platform-wide.</p>
                      <button onClick={() => startBooking()} className="btn-primary mt-5">
                        Book anyway
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {providers.map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.5 }}
                          className="flex flex-wrap items-center gap-4 rounded-2xl border border-edge bg-white p-5 shadow-card transition-all duration-400 hover:-translate-y-1 hover:shadow-lift"
                        >
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-burgundy-gradient font-display text-lg text-ivory">
                            {initials(p.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link to={`/professionals/${p.id}`} className="font-display text-lg text-burgundy-800 hover:text-burgundy">
                              {p.name}
                            </Link>
                            <p className="truncate text-xs font-bold uppercase tracking-wider text-rosewood">
                              {p.specialization}
                            </p>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                              <span className="flex items-center gap-1">
                                <Stars value={p.rating_avg} size={12} /> {Number(p.rating_avg).toFixed(1)}
                              </span>
                              <span>{p.experience_years} yrs experience</span>
                              {p.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {p.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link to={`/professionals/${p.id}`} className="btn-secondary btn-sm">
                              Profile
                            </Link>
                            <button onClick={() => startBooking(p.id)} className="btn-primary btn-sm">
                              Book
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'reviews' && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  {reviews.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-edge bg-white/70 p-12 text-center">
                      <Star className="mx-auto mb-3 h-8 w-8 text-gold" />
                      <p className="font-display text-lg text-burgundy-800">No reviews yet</p>
                      <p className="mt-1.5 text-sm text-muted">Be the first to book and review this service.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((r, i) => (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.45 }}
                          className="rounded-2xl border border-edge bg-white p-5 shadow-card"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-xs font-bold text-burgundy">
                              {initials(r.customer_name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-charcoal">{r.customer_name}</p>
                              <p className="truncate text-xs text-muted">{r.service_name}</p>
                            </div>
                            <div className="text-right">
                              <Stars value={r.rating} size={13} />
                              <p className="mt-0.5 text-[11px] text-muted">
                                {new Date(r.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3.5 text-sm leading-relaxed text-muted">“{r.comment}”</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[26px] border border-edge bg-white p-6 shadow-card">
              <h3 className="font-display text-xl text-burgundy-800">Ready to book?</h3>
              <p className="mt-2 text-sm text-muted">
                Choose a professional and grab a live slot — availability updates in real time.
              </p>
              <button onClick={() => startBooking()} className="btn-primary mt-5 w-full !py-3.5">
                <CalendarPlus className="h-4 w-4" /> Check availability
              </button>

              <div className="mt-5 space-y-3 border-t border-edge pt-5">
                {[
                  { icon: ShieldCheck, text: 'Double-booking protection' },
                  { icon: Wallet, text: `Pay securely from ${formatMoney(service.price)}` },
                  { icon: Timer, text: `${service.duration_min} min session` }
                ].map((f) => (
                  <p key={f.text} className="flex items-center gap-2.5 text-[13px] text-muted">
                    <f.icon className="h-4 w-4 shrink-0 text-rosewood" /> {f.text}
                  </p>
                ))}
              </div>
            </div>

            {/* related providers mini */}
            {providers.length > 0 && (
              <div className="mt-5 rounded-[26px] border border-edge bg-cream p-6">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
                  Also available from
                </p>
                <div className="mt-4 space-y-3">
                  {providers.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      to={`/professionals/${p.id}`}
                      className="flex items-center gap-3 rounded-xl border border-edge bg-white p-3 transition hover:border-burgundy-200 hover:shadow-card"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-burgundy-gradient text-[11px] font-bold text-ivory">
                        {initials(p.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-charcoal">{p.name}</span>
                        <span className="block truncate text-[11px] text-muted">{p.specialization}</span>
                      </span>
                      <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
