import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, CalendarCheck, CalendarDays, Clock, Wallet,
  User, Search, AlertCircle, Loader2, CheckCircle2, ShieldCheck,
  MapPin, Mail, Phone, FileText, CreditCard, Sparkles, Download,
  LayoutDashboard, Star, Info
} from 'lucide-react';
import api from '../services/api';
import { useDocumentTitle } from '../hooks/useUtility';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/LoadingScreen';
import { Stars, EmptyState } from '../components/ui/Primitives';
import SuccessCheck from '../three/SuccessCheck';
import { formatMoney, initials } from '../utilities/format';

/* ------------------------------------------------------------------
   8-step booking wizard
   1 Service · 2 Professional · 3 Date & time · 4 Your details
   5 Review · 6 Payment · 7 Confirmed · 8 Next steps
------------------------------------------------------------------ */

const STEP_LABELS = ['Service', 'Professional', 'Date & time', 'Details', 'Review', 'Payment', 'Confirmed', 'Done'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* The API works in UTC slot times — display them exactly as offered. */
const fmtDateUTC = (iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(new Date(iso));
const fmtTimeUTC = (iso) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(iso));

const toDayKey = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ------------------------------------------------------------------ stepper */
function Stepper({ step }) {
  return (
    <div className="mt-7">
      {/* desktop */}
      <ol className="hidden items-center gap-1 md:flex" aria-label="Booking progress">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <li key={label} className="flex flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold transition-all duration-400 ${
                    state === 'done'
                      ? 'bg-ivory text-burgundy'
                      : state === 'current'
                        ? 'bg-gold-gradient text-charcoal ring-4 ring-white/25'
                        : 'bg-white/10 text-ivory/55'
                  }`}
                >
                  {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
                </span>
                <span
                  className={`truncate text-[10.5px] font-bold uppercase tracking-wider ${
                    state === 'current' ? 'text-ivory' : state === 'done' ? 'text-ivory/75' : 'text-ivory/45'
                  }`}
                >
                  {label}
                </span>
              </div>
              {n < STEP_LABELS.length && (
                <span className={`mb-5 h-px flex-1 ${n < step ? 'bg-ivory/70' : 'bg-white/20'}`} />
              )}
            </li>
          );
        })}
      </ol>

      {/* mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ivory/70">
          <span>Step {step} of 8</span>
          <span className="text-ivory">{STEP_LABELS[step - 1]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full bg-gold-gradient"
            initial={false}
            animate={{ width: `${(step / 8) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default function BookingPage() {
  useDocumentTitle('Book an appointment');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  /* selections */
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null); // { time, end }

  /* step 1 data */
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceError, setServiceError] = useState(null);

  /* step 2 data */
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  /* step 3 data */
  const [days, setDays] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const n = new Date();
    return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1);
  });

  /* step 4 */
  const [details, setDetails] = useState({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '', notes: ''
  });
  const [detailErrors, setDetailErrors] = useState({});

  /* step 5/6 results */
  const [quote, setQuote] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [payment, setPayment] = useState(null);

  const duration = service?.duration_min ?? service?.effective_duration ?? 30;
  const price = Number(service?.effective_price ?? service?.price ?? 0);

  /* ============================ data loading ============================ */

  const loadServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      setServiceError(null);
      const q = new URLSearchParams({ limit: '48', sort: 'name' });
      if (serviceSearch) q.set('search', serviceSearch);
      if (category) q.set('category', category);
      const [svcRes, catRes] = await Promise.all([
        api.get(`/api/services?${q.toString()}`),
        categories.length ? Promise.resolve(null) : api.get('/api/services/categories')
      ]);
      setServices(svcRes.data?.data?.services || []);
      if (catRes) setCategories(catRes.data?.data?.categories || []);
    } catch (err) {
      setServiceError(err.message || 'Could not load services');
    } finally {
      setLoadingServices(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceSearch, category]);

  useEffect(() => { loadServices(); }, [loadServices]);

  /* preselect from URL */
  useEffect(() => {
    let cancelled = false;
    const sid = params.get('service_id');
    const pid = params.get('provider_id');
    (async () => {
      try {
        if (sid) {
          const res = await api.get(`/api/services/${sid}`);
          if (!cancelled && res.data?.data?.service) {
            setService(res.data.data.service);
            setProviders(res.data.data.providers || []);
            setStep((s) => (pid ? 3 : 2));
          }
        }
        if (pid) {
          const res = await api.get(`/api/providers/${pid}`);
          if (!cancelled && res.data?.data?.provider) {
            setProvider(res.data.data.provider);
            if (sid) setStep(3);
          }
        }
      } catch { /* ignore — user can pick manually */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* providers for chosen service */
  useEffect(() => {
    if (step !== 2 || !service || providers.length) return undefined;
    let cancelled = false;
    setLoadingProviders(true);
    api
      .get(`/api/services/${service.id}`)
      .then((res) => { if (!cancelled) setProviders(res.data?.data?.providers || []); })
      .catch(() => { if (!cancelled) setProviders([]); })
      .finally(() => { if (!cancelled) setLoadingProviders(false); });
    return () => { cancelled = true; };
  }, [step, service, providers.length]);

  /* availability range for chosen provider */
  useEffect(() => {
    if (step !== 3 || !provider) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(
          `/api/providers/${provider.id}/availability?days=45&duration=${duration}`
        );
        if (!cancelled) setDays(res.data?.data?.days || []);
      } catch {
        if (!cancelled) setDays([]);
      }
    })();
    return () => { cancelled = true; };
  }, [step, provider, duration]);

  /* slots for chosen date */
  useEffect(() => {
    if (step !== 3 || !provider || !date) { setSlots([]); return undefined; }
    let cancelled = false;
    setLoadingSlots(true);
    api
      .get(`/api/providers/${provider.id}/availability?date=${date}&duration=${duration}`)
      .then((res) => { if (!cancelled) setSlots(res.data?.data?.slots || []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [step, provider, date, duration]);

  /* quote */
  const startAt = useMemo(() => {
    if (!date || !slot) return null;
    return new Date(`${date}T${slot.time}:00.000Z`).toISOString();
  }, [date, slot]);

  useEffect(() => {
    if (step !== 5 || !startAt || !service || !provider) return undefined;
    let cancelled = false;
    api
      .get(`/api/appointments/quote?service_id=${service.id}&provider_id=${provider.id}&start_at=${encodeURIComponent(startAt)}`)
      .then((res) => { if (!cancelled) setQuote(res.data?.data || null); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [step, startAt, service, provider]);

  /* ============================ calendar ============================ */

  const calendar = useMemo(() => {
    const anchor = new Date(monthAnchor);
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth();
    const first = new Date(Date.UTC(year, month, 1));
    const startPad = first.getUTCDay();
    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    const todayKey = toDayKey(new Date());

    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = byDate[key];
      const past = key < todayKey;
      cells.push({
        day: d,
        key,
        info,
        disabled: past || !info || info.blocked || info.availableCount === 0
      });
    }
    return { cells, label: `${MONTHS[month]} ${year}`, year, month };
  }, [monthAnchor, days]);

  const shiftMonth = (delta) => {
    setMonthAnchor((prev) => {
      const d = new Date(prev);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1);
    });
    setDate(null);
    setSlot(null);
  };

  /* ============================ step actions ============================ */

  const go = (n) => {
    setError(null);
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateDetails = () => {
    const next = {};
    if (details.name.trim().length < 2) next.name = 'Please enter your full name';
    if (!isEmail(details.email)) next.email = 'Enter a valid email address';
    if (details.phone && !/^[+\d\s().-]{7,20}$/.test(details.phone)) next.phone = 'Enter a valid phone number';
    setDetailErrors(next);
    return Object.keys(next).length === 0;
  };

  const createAppointment = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await api.post('/api/appointments', {
        service_id: service.id,
        provider_id: provider.id,
        start_at: startAt,
        name: details.name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim() || undefined,
        notes: details.notes.trim() || undefined
      });
      setAppointment(res.data?.data?.appointment || null);
      go(6);
    } catch (err) {
      setError(err.message || 'We could not create your appointment');
      if (err.response?.status === 409) {
        setSlot(null);
        setTimeout(() => go(3), 1400);
      }
    } finally {
      setBusy(false);
    }
  };

  const payNow = async () => {
    try {
      setBusy(true);
      setError(null);
      const created = await api.post('/api/payments', {
        appointment_id: appointment.id,
        method: 'card'
      });
      const { payment: pay, intent } = created.data?.data || {};
      await api.post('/api/payments/confirm', {
        payment_id: pay.id,
        transaction_ref: intent?.transactionRef || pay.transaction_ref,
        mode: intent?.mode || 'mock'
      });
      setPayment({ ...pay, status: 'paid' });
      go(7);
    } catch (err) {
      setError(err.message || 'Payment failed — please try again');
    } finally {
      setBusy(false);
    }
  };

  const payLater = () => {
    setPayment(null);
    go(7);
  };

  const downloadIcs = () => {
    if (!appointment) return;
    const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Appointify//Booking//EN',
      'BEGIN:VEVENT',
      `UID:appointify-${appointment.reference}`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(appointment.start_at)}`,
      `DTEND:${stamp(appointment.end_at)}`,
      `SUMMARY:${appointment.service_name} with ${appointment.provider_name}`,
      `DESCRIPTION:Appointment ${appointment.reference} via Appointify`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointify-${appointment.reference}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep(1);
    setService(null);
    setProvider(null);
    setDate(null);
    setSlot(null);
    setAppointment(null);
    setPayment(null);
    setQuote(null);
    setError(null);
    setServiceSearch('');
    setCategory('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canContinue =
    (step === 1 && !!service) ||
    (step === 2 && !!provider) ||
    (step === 3 && !!date && !!slot) ||
    step === 4 ||
    step === 5;

  const next = () => {
    if (step === 4 && !validateDetails()) return;
    if (step === 5) { createAppointment(); return; }
    if (step < 6) go(step + 1);
  };

  /* ============================ render ============================ */

  return (
    <div className="min-h-screen bg-lightbg pb-28">
      {/* ------------------------------ header ------------------------------ */}
      <header className="relative overflow-hidden bg-burgundy-gradient">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-rosewood/30 blur-3xl" />

        <div className="container-x relative pb-8 pt-[104px]">
          <button
            onClick={() => (step > 1 && step < 7 ? go(step - 1) : navigate(-1))}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ivory/65 transition hover:text-ivory"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {step > 1 && step < 7 ? 'Back' : 'Leave'}
          </button>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow !text-softrose">
                <span className="h-px w-8 bg-softrose/70" /> Booking
              </span>
              <h1 className="mt-3 font-display text-3xl leading-tight text-ivory md:text-4xl">
                Reserve your appointment
              </h1>
            </div>
            {service && (
              <div className="glass-dark rounded-2xl px-4 py-3 text-right">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-softrose">Selected</p>
                <p className="mt-0.5 max-w-[240px] truncate text-sm font-bold text-ivory">{service.name}</p>
              </div>
            )}
          </div>

          <Stepper step={step} />
        </div>
      </header>

      {/* ------------------------------ body ------------------------------ */}
      <div className="container-x -mt-3 mt-8">
        <div className="grid gap-7 lg:grid-cols-[1.6fr_1fr]">
          {/* main panel */}
          <div className="rounded-[28px] border border-edge bg-white shadow-card">
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  {error && (
                    <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-burgundy-100 bg-burgundy-50 px-4 py-3 text-[13px] font-medium text-burgundy-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                    </div>
                  )}

                  {/* ================= 1 · SERVICE ================= */}
                  {step === 1 && (
                    <div>
                      <StepHeading icon={Sparkles} title="Choose your service" subtitle="Live pricing and durations straight from each professional's catalogue." />

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                          <input
                            type="search"
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            placeholder="Search services…"
                            aria-label="Search services"
                            className="field !pl-10"
                          />
                        </div>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          aria-label="Filter by category"
                          className="field !w-auto !py-3 !text-[13px] !font-semibold"
                        >
                          <option value="">All categories</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.slug}>{c.name} ({c.service_count})</option>
                          ))}
                        </select>
                      </div>

                      {loadingServices ? (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-cream" />)}
                        </div>
                      ) : serviceError ? (
                        <div className="mt-6">
                          <EmptyState icon={AlertCircle} title="Couldn't load services" description={serviceError}
                            action={<button onClick={loadServices} className="btn-primary btn-sm">Try again</button>} />
                        </div>
                      ) : services.length === 0 ? (
                        <div className="mt-6">
                          <EmptyState icon={Search} title="No services match" description="Try a different search or clear the category filter."
                            action={<button onClick={() => { setServiceSearch(''); setCategory(''); }} className="btn-secondary btn-sm">Reset filters</button>} />
                        </div>
                      ) : (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          {services.map((s) => {
                            const active = service?.id === s.id;
                            return (
                              <button
                                key={s.id}
                                onClick={() => { setService(s); setSlot(null); setDate(null); setError(null); }}
                                aria-pressed={active}
                                className={`group rounded-2xl border p-5 text-left transition-all duration-400 ease-elegant ${
                                  active
                                    ? 'border-burgundy bg-burgundy-50/60 shadow-glow'
                                    : 'border-edge bg-white hover:-translate-y-1 hover:border-burgundy-200 hover:shadow-card'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-rosewood">{s.category_name}</p>
                                    <h3 className="mt-1.5 truncate font-display text-lg text-burgundy-800">{s.name}</h3>
                                  </div>
                                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-burgundy bg-burgundy text-ivory' : 'border-edge'}`}>
                                    {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                                  </span>
                                </div>
                                <div className="mt-3 flex items-center gap-4 text-[13px] font-semibold text-muted">
                                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-rosewood" /> {s.duration_min} min</span>
                                  <span className="flex items-center gap-1.5 text-burgundy"><Wallet className="h-3.5 w-3.5" /> {formatMoney(s.price)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ================= 2 · PROFESSIONAL ================= */}
                  {step === 2 && (
                    <div>
                      <StepHeading icon={User} title="Pick your professional" subtitle={`Available specialists for ${service?.name}.`} />

                      {loadingProviders ? (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          {[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-cream" />)}
                        </div>
                      ) : providers.length === 0 ? (
                        <div className="mt-6">
                          <EmptyState icon={User} title="No professionals linked yet"
                            description="This service is available platform-wide — we'll match you with the next available specialist."
                            action={<button onClick={() => go(3)} className="btn-primary btn-sm">Use next available</button>} />
                          <input type="hidden" />
                        </div>
                      ) : (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          {providers.map((p) => {
                            const active = provider?.id === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => { setProvider(p); setSlot(null); setDate(null); setError(null); }}
                                aria-pressed={active}
                                className={`group rounded-2xl border p-5 text-left transition-all duration-400 ease-elegant ${
                                  active
                                    ? 'border-burgundy bg-burgundy-50/60 shadow-glow'
                                    : 'border-edge bg-white hover:-translate-y-1 hover:border-burgundy-200 hover:shadow-card'
                                }`}
                              >
                                <div className="flex items-center gap-3.5">
                                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-burgundy-gradient font-display text-base text-ivory">
                                    {initials(p.name)}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-display text-lg text-burgundy-800">{p.name}</h3>
                                    <p className="truncate text-[11px] font-extrabold uppercase tracking-wider text-rosewood">{p.specialization}</p>
                                  </div>
                                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-burgundy bg-burgundy text-ivory' : 'border-edge'}`}>
                                    {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-muted">
                                  <span className="flex items-center gap-1.5">
                                    <Stars value={p.rating_avg || 0} size={12} />
                                    {Number(p.rating_avg || 0).toFixed(1)}
                                    <span className="text-muted/70">({p.review_count || 0})</span>
                                  </span>
                                  <span>{p.experience_years} yrs</span>
                                  {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ================= 3 · DATE & TIME ================= */}
                  {step === 3 && (
                    <div>
                      <StepHeading icon={CalendarDays} title="Choose a date & time"
                        subtitle={`Availability for ${duration}-minute sessions with ${provider?.name || 'your professional'}.`} />

                      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
                        {/* calendar */}
                        <div className="rounded-2xl border border-edge bg-ivory/60 p-4">
                          <div className="flex items-center justify-between">
                            <button onClick={() => shiftMonth(-1)} aria-label="Previous month"
                              className="grid h-9 w-9 place-items-center rounded-full border border-edge bg-white text-burgundy transition hover:border-burgundy disabled:opacity-40">
                              <ArrowLeft className="h-4 w-4" />
                            </button>
                            <p className="font-display text-lg text-burgundy-800">{calendar.label}</p>
                            <button onClick={() => shiftMonth(1)} aria-label="Next month"
                              className="grid h-9 w-9 place-items-center rounded-full border border-edge bg-white text-burgundy transition hover:border-burgundy disabled:opacity-40">
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-7 gap-1.5">
                            {DOW.map((d) => (
                              <span key={d} className="text-center text-[10px] font-extrabold uppercase tracking-wider text-muted">{d}</span>
                            ))}
                            {calendar.cells.map((cell, i) => {
                              if (!cell) return <span key={`pad-${i}`} />;
                              const active = date === cell.key;
                              return (
                                <button
                                  key={cell.key}
                                  disabled={cell.disabled}
                                  onClick={() => { setDate(cell.key); setSlot(null); }}
                                  aria-pressed={active}
                                  aria-label={`${cell.key}${cell.info && !cell.info.blocked && cell.info.availableCount > 0 ? `, ${cell.info.availableCount} slots` : ', unavailable'}`}
                                  className={`relative aspect-square rounded-xl text-[13px] font-bold transition-all duration-300 ${
                                    active
                                      ? 'bg-burgundy text-ivory shadow-glow'
                                      : cell.disabled
                                        ? 'cursor-not-allowed text-muted/40 line-through'
                                        : 'bg-white text-charcoal hover:border-burgundy-200 border border-edge hover:-translate-y-0.5'
                                  }`}
                                >
                                  {cell.day}
                                  {!cell.disabled && cell.info?.availableCount > 0 && !active && (
                                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-semibold text-muted">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Open slots</span>
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-edge" /> Unavailable</span>
                          </div>
                        </div>

                        {/* slots */}
                        <div className="rounded-2xl border border-edge bg-white p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-display text-base text-burgundy-800">
                              {date ? fmtDateUTC(`${date}T12:00:00Z`, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                            </p>
                            <span className="badge border border-edge bg-ivory text-muted">UTC</span>
                          </div>

                          {!date ? (
                            <p className="mt-6 pb-6 text-center text-sm text-muted">Pick a day to see open times.</p>
                          ) : loadingSlots ? (
                            <div className="mt-5 grid grid-cols-3 gap-2.5">
                              {[...Array(9)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-cream" />)}
                            </div>
                          ) : slots.length === 0 ? (
                            <p className="mt-6 pb-6 text-center text-sm text-muted">No working hours on this day — try another date.</p>
                          ) : (
                            <div className="mt-4 grid max-h-[320px] grid-cols-3 gap-2.5 overflow-y-auto pr-1">
                              {slots.map((s) => {
                                const active = slot?.time === s.time;
                                return (
                                  <button
                                    key={s.time}
                                    disabled={!s.available}
                                    onClick={() => setSlot(s)}
                                    aria-pressed={active}
                                    className={`rounded-xl border px-2 py-2.5 text-[13px] font-bold transition-all duration-300 ${
                                      active
                                        ? 'border-burgundy bg-burgundy text-ivory shadow-glow'
                                        : s.available
                                          ? 'border-edge bg-white text-charcoal hover:-translate-y-0.5 hover:border-burgundy-300'
                                          : 'cursor-not-allowed border-edge bg-cream text-muted/50 line-through'
                                    }`}
                                  >
                                    {fmtTimeUTC(`${date}T${s.time}:00Z`)}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= 4 · DETAILS ================= */}
                  {step === 4 && (
                    <div>
                      <StepHeading icon={FileText} title="Your details" subtitle="We'll use these for confirmation and reminders." />

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="bk-name" className="field-label">Full name *</label>
                          <input id="bk-name" value={details.name} onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
                            className="field" placeholder="Sofia Bennett" aria-invalid={!!detailErrors.name} />
                          {detailErrors.name && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {detailErrors.name}</p>}
                        </div>
                        <div>
                          <label htmlFor="bk-email" className="field-label">Email *</label>
                          <input id="bk-email" type="email" value={details.email} onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
                            className="field" placeholder="sofia@example.com" aria-invalid={!!detailErrors.email} />
                          {detailErrors.email && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {detailErrors.email}</p>}
                        </div>
                        <div>
                          <label htmlFor="bk-phone" className="field-label">Phone (optional)</label>
                          <input id="bk-phone" type="tel" value={details.phone} onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                            className="field" placeholder="+1 (555) 010-2030" aria-invalid={!!detailErrors.phone} />
                          {detailErrors.phone && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {detailErrors.phone}</p>}
                        </div>
                        <div>
                          <label htmlFor="bk-notes" className="field-label">Notes for the professional (optional)</label>
                          <textarea id="bk-notes" rows={3} value={details.notes} onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
                            className="field resize-y" placeholder="Allergies, preferences, parking…"
                            maxLength={2000} />
                          <p className="mt-1 text-right text-[11px] text-muted">{details.notes.length}/2000</p>
                        </div>
                      </div>

                      {!user && (
                        <p className="mt-5 rounded-xl border border-edge bg-ivory px-4 py-3 text-[13px] text-muted">
                          Booking as a guest? <Link to="/login" className="font-bold text-burgundy underline-offset-2 hover:underline">Sign in</Link> to track this appointment in your dashboard.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ================= 5 · REVIEW ================= */}
                  {step === 5 && (
                    <div>
                      <StepHeading icon={CheckCircle2} title="Review your booking" subtitle="Check the details before we reserve your slot." />

                      <div className="mt-6 space-y-3">
                        {[
                          { icon: Sparkles, label: 'Service', value: service?.name, sub: `${duration} minutes` },
                          { icon: User, label: 'Professional', value: provider?.name, sub: provider?.specialization },
                          { icon: CalendarDays, label: 'Date & time', value: startAt ? `${fmtDateUTC(startAt, { weekday: 'long', month: 'long', day: 'numeric' })}` : '—', sub: startAt ? `${fmtTimeUTC(startAt)} – ${fmtTimeUTC(new Date(new Date(startAt).getTime() + duration * 60000).toISOString())} (UTC)` : '' },
                          { icon: Mail, label: 'Confirmation to', value: details.email, sub: details.name }
                        ].map((row) => (
                          <div key={row.label} className="flex items-start gap-3.5 rounded-2xl border border-edge bg-ivory/50 p-4">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-burgundy shadow-card">
                              <row.icon className="h-4.5 w-4.5 h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">{row.label}</p>
                              <p className="mt-0.5 truncate font-display text-base text-burgundy-800">{row.value}</p>
                              {row.sub && <p className="truncate text-xs text-muted">{row.sub}</p>}
                            </div>
                            <button
                              onClick={() => go(row.label === 'Service' ? 1 : row.label === 'Professional' ? 2 : row.label === 'Date & time' ? 3 : 4)}
                              className="ml-auto shrink-0 rounded-full border border-edge bg-white px-3 py-1.5 text-[11px] font-bold text-burgundy transition hover:border-burgundy"
                            >
                              Change
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* quote */}
                      <div className="mt-5 rounded-2xl border border-edge bg-white p-5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Summary</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted">{service?.name}</span><span className="font-semibold text-charcoal">{formatMoney(price)}</span></div>
                          <div className="flex justify-between"><span className="text-muted">Booking fee</span><span className="font-semibold text-charcoal">{formatMoney(quote ? quote.fee : 0)}</span></div>
                          <div className="flex justify-between border-t border-edge pt-2.5 text-base">
                            <span className="font-display text-burgundy-800">Total</span>
                            <span className="font-display text-burgundy-800">{formatMoney(quote ? quote.total : price)}</span>
                          </div>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Free cancellation up to 24 hours before your appointment.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ================= 6 · PAYMENT ================= */}
                  {step === 6 && (
                    <div>
                      <StepHeading icon={CreditCard} title="Payment" subtitle="Secure, tokenised checkout — no card details are stored by Appointify." />

                      <div className="mt-6 rounded-2xl border border-edge bg-gradient-to-br from-ivory to-cream p-5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">Amount due</span>
                          <span className="font-display text-3xl text-burgundy-800">{formatMoney(quote ? quote.total : price)}</span>
                        </div>
                        <p className="mt-1.5 text-xs text-muted">
                          {service?.name} · {fmtDateUTC(startAt || new Date().toISOString(), { weekday: 'short', month: 'short', day: 'numeric' })} at {startAt ? fmtTimeUTC(startAt) : '—'} UTC
                        </p>
                      </div>

                      {/* test card visual */}
                      <div className="mt-5 overflow-hidden rounded-2xl bg-burgundy-gradient p-5 text-ivory shadow-lift">
                        <div className="noise absolute" />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">Appointify Pay</p>
                            <p className="mt-4 font-display text-xl tracking-[0.18em]">•••• •••• •••• 4242</p>
                          </div>
                          <span className="badge border border-white/25 bg-white/10 text-ivory">Test mode</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-wider text-ivory/60">
                          <span>{details.name || 'Card holder'}</span>
                          <span>12 / 29</span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-[12.5px] leading-relaxed text-charcoal">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                        <span>
                          <strong>Demo checkout:</strong> payments run through the mock gateway, so no real charge is made and no card data
                          is transmitted. Press <strong>Pay now</strong> to simulate a successful card payment.
                        </span>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button onClick={payNow} disabled={busy} className="btn-primary !py-4">
                          {busy ? <Spinner className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                          {busy ? 'Processing…' : `Pay ${formatMoney(quote ? quote.total : price)}`}
                        </button>
                        <button onClick={payLater} disabled={busy} className="btn-secondary !py-4">
                          Pay at the appointment
                        </button>
                      </div>
                      <p className="mt-3 text-center text-[11.5px] text-muted">
                        Your request stays <strong>pending</strong> until the professional approves it — you can pay now or at the appointment.
                      </p>
                    </div>
                  )}

                  {/* ================= 7 · CONFIRMED ================= */}
                  {step === 7 && (
                    <div className="text-center">
                      <SuccessCheck size={230} className="mx-auto -mt-4" />
                      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}>
                        <span className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold-100 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-burgundy-800">
                          <Clock className="h-3.5 w-3.5" />
                          {payment?.status === 'paid' ? 'Payment received · Awaiting approval' : 'Awaiting approval'}
                        </span>
                        <h2 className="mt-4 font-display text-3xl text-burgundy-800">
                          Request received
                        </h2>
                        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted">
                          {payment?.status === 'paid'
                            ? `Your payment is secure. We've notified ${provider?.name} — they'll approve or decline your request shortly.`
                            : `We've notified ${provider?.name} — you'll get an email as soon as they approve your request.`}
                        </p>

                        <div className="mx-auto mt-7 max-w-md rounded-2xl border border-edge bg-ivory/70 p-5 text-left">
                          <div className="flex items-center justify-between border-b border-edge pb-3">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Reference</span>
                            <span className="font-display text-lg text-burgundy-800">{appointment?.reference}</span>
                          </div>
                          <dl className="mt-3 space-y-2.5 text-sm">
                            <Row label="Service" value={appointment?.service_name || service?.name} />
                            <Row label="Professional" value={appointment?.provider_name || provider?.name} />
                            <Row label="When" value={startAt ? `${fmtDateUTC(startAt, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTimeUTC(startAt)} UTC` : '—'} />
                            <Row label="Total" value={formatMoney(quote ? quote.total : price)} />
                            <Row label="Status" value={payment?.status === 'paid' ? 'Paid · Awaiting approval' : 'Awaiting approval'} />
                          </dl>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* ================= 8 · NEXT STEPS ================= */}
                  {step === 8 && (
                    <div>
                      <StepHeading icon={LayoutDashboard} title="What happens next" subtitle="Everything about this appointment lives in your dashboard." />

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {[
                          { icon: LayoutDashboard, title: 'Open my dashboard', text: 'Track status, reschedule or cancel anytime.', to: '/dashboard/appointments', primary: true },
                          { icon: Download, title: 'Add to calendar', text: 'Download an .ics file for Apple / Google / Outlook.', action: downloadIcs },
                          { icon: CalendarCheck, title: 'Book another', text: 'Start a fresh booking in a few clicks.', action: reset },
                          { icon: Star, title: 'Leave a review', text: 'After your visit, share how it went.', to: '/dashboard/reviews' }
                        ].map((c) => (
                          <button
                            key={c.title}
                            onClick={() => (c.action ? c.action() : navigate(c.to))}
                            className={`group rounded-2xl border p-5 text-left transition-all duration-400 ease-elegant hover:-translate-y-1 hover:shadow-lift ${
                              c.primary ? 'border-burgundy bg-burgundy text-ivory' : 'border-edge bg-white hover:border-burgundy-200'
                            }`}
                          >
                            <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.primary ? 'bg-white/15 text-ivory' : 'bg-burgundy-50 text-burgundy'}`}>
                              <c.icon className="h-5 w-5" />
                            </span>
                            <h3 className={`mt-4 font-display text-lg ${c.primary ? 'text-ivory' : 'text-burgundy-800'}`}>{c.title}</h3>
                            <p className={`mt-1.5 text-[13px] leading-relaxed ${c.primary ? 'text-ivory/70' : 'text-muted'}`}>{c.text}</p>
                          </button>
                        ))}
                      </div>

                      <div className="mt-6 rounded-2xl border border-edge bg-ivory/70 p-5 text-center">
                        <p className="text-sm text-muted">
                          Need help? <Link to="/contact" className="font-bold text-burgundy underline-offset-2 hover:underline">Contact our team</Link> and
                          quote reference <span className="font-bold text-charcoal">{appointment?.reference}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* footer nav */}
            {step < 7 && (
              <div className="flex items-center justify-between gap-3 border-t border-edge bg-ivory/60 px-6 py-4 sm:px-8">
                <button
                  onClick={() => (step === 1 ? navigate('/services') : go(step - 1))}
                  className="btn-ghost"
                >
                  <ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Cancel' : 'Back'}
                </button>

                {step < 6 && (
                  <button onClick={next} disabled={!canContinue || busy} className="btn-primary">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 5 && (
                  <span className="hidden text-[11.5px] text-muted sm:block">We'll reserve your slot in the next step</span>
                )}
              </div>
            )}

            {step === 7 && (
              <div className="flex flex-col gap-3 border-t border-edge bg-ivory/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <button onClick={downloadIcs} className="btn-secondary">
                  <Download className="h-4 w-4" /> Add to calendar
                </button>
                <button onClick={() => go(8)} className="btn-primary">
                  Finish <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ------------------------------ summary sidebar ------------------------------ */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[26px] border border-edge bg-white p-6 shadow-card">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">Your booking</p>

              <div className="mt-4 space-y-4">
                <SummaryRow icon={Sparkles} label="Service" value={service?.name} placeholder="Not selected yet" />
                <SummaryRow icon={User} label="Professional" value={provider?.name} placeholder={service ? 'Choose a professional' : '—'} />
                <SummaryRow
                  icon={CalendarDays}
                  label="Date & time"
                  placeholder={provider ? 'Pick a slot' : '—'}
                  value={startAt ? `${fmtDateUTC(startAt, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTimeUTC(startAt)} UTC` : null}
                />
              </div>

              <div className="mt-5 border-t border-edge pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Total</span>
                  <span className="font-display text-2xl text-burgundy-800">{formatMoney(price)}</span>
                </div>
                {duration > 0 && service && (
                  <p className="mt-1 text-right text-[11.5px] text-muted">{duration}-minute session</p>
                )}
              </div>

              <div className="mt-5 space-y-2.5 border-t border-edge pt-5">
                {[
                  { icon: ShieldCheck, text: 'Double-booking protection' },
                  { icon: Clock, text: 'Email updates at every step' },
                  { icon: Wallet, text: 'Free cancellation up to 24h before' }
                ].map((f) => (
                  <p key={f.text} className="flex items-center gap-2.5 text-[13px] text-muted">
                    <f.icon className="h-4 w-4 shrink-0 text-rosewood" /> {f.text}
                  </p>
                ))}
              </div>
            </div>

            <p className="mt-4 px-1 text-center text-[11.5px] leading-relaxed text-muted">
              By continuing you agree to our booking terms. Need help?{' '}
              <Link to="/contact" className="font-bold text-burgundy">Talk to us</Link>.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ small parts */

function StepHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-burgundy-50 text-burgundy">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-display text-2xl leading-tight text-burgundy-800">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, placeholder }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ivory text-rosewood">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-bold ${value ? 'text-charcoal' : 'text-muted/70'}`}>
          {value || placeholder}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="truncate text-right text-sm font-semibold text-charcoal">{value}</dd>
    </div>
  );
}
