import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Sparkles, HeartHandshake, Clock, Target,
  BadgeCheck, CalendarCheck, Gem
} from 'lucide-react';
import api from '../services/api';
import { useDocumentTitle } from '../hooks/useUtility';
import useGsapReveal from '../hooks/useGsapReveal';

const VALUES = [
  {
    icon: Clock,
    title: 'Time is sacred',
    text: 'Every slot is honest — real availability, real durations, no overbooking and no waiting rooms.'
  },
  {
    icon: ShieldCheck,
    title: 'Verified professionals',
    text: 'Credentials, licences and reviews are checked before anyone takes a booking on Appointify.'
  },
  {
    icon: HeartHandshake,
    title: 'Care, not transactions',
    text: 'Reminders, rescheduling and aftercare are built into every appointment, not sold as extras.'
  },
  {
    icon: Gem,
    title: 'Quiet luxury',
    text: 'A calm, considered experience — from the first click to the follow-up message after your visit.'
  }
];

const STEPS = [
  { n: '01', title: 'Discover', text: 'Browse services and professionals, filtered by what you actually need.' },
  { n: '02', title: 'Choose', text: 'See live availability and pick a slot that fits your day.' },
  { n: '03', title: 'Confirm', text: 'Pay securely — the professional approves your request and confirms by email.' },
  { n: '04', title: 'Arrive', text: 'Get reminders beforehand and manage everything from your dashboard.' }
];

export default function AboutPage() {
  useDocumentTitle('About us');
  const scope = useGsapReveal();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/landing/stats')
      .then((res) => { if (!cancelled) setStats(res.data?.data?.stats || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const counters = [
    { key: 'customers', label: 'Happy customers', suffix: '+' },
    { key: 'professionals', label: 'Professionals', suffix: '' },
    { key: 'completed_bookings', label: 'Appointments completed', suffix: '+' },
    { key: 'reviews', label: 'Reviews collected', suffix: '' }
  ];

  return (
    <div ref={scope} className="bg-ivory">
      {/* ============================ HERO ============================ */}
      <header className="relative overflow-hidden bg-burgundy-gradient pt-[124px]">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-rosewood/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-x relative pb-20 pt-8">
          <span className="eyebrow !text-softrose" data-reveal="left">
            <span className="h-px w-8 bg-softrose/70" /> Our story
          </span>
          <h1
            className="mt-4 max-w-3xl font-display text-4xl leading-[1.06] text-ivory md:text-6xl"
            data-reveal
          >
            Time is the one luxury{' '}
            <span className="italic text-softrose">everyone deserves more of</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ivory/70 md:text-lg" data-reveal>
            Appointify began with a simple frustration: booking an appointment shouldn't take longer
            than the appointment itself. So we built a calmer way — real-time availability,
            verified professionals, and confirmation in seconds.
          </p>

          <div className="mt-9 flex flex-wrap gap-3" data-reveal>
            <Link to="/services" className="btn-gold">
              <CalendarCheck className="h-4 w-4" /> Book an appointment
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/professionals" className="btn border border-white/25 bg-white/10 px-6 py-3 text-sm text-ivory hover:bg-white/20">
              Meet our professionals
            </Link>
          </div>
        </div>
      </header>

      {/* ============================ STATS ============================ */}
      <section className="relative -mt-1 bg-ivory py-14">
        <div className="container-x">
          <div
            data-stagger="0.08"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {counters.map((c) => (
              <div
                key={c.key}
                className="rounded-3xl border border-edge bg-white px-5 py-7 text-center shadow-card transition-all duration-500 ease-elegant hover:-translate-y-1.5 hover:shadow-lift"
              >
                <p className="font-display text-4xl text-burgundy-800 md:text-5xl">
                  <span data-counter={stats ? Number(stats[c.key]) || 0 : 0}>0</span>
                  {c.suffix}
                </p>
                <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ MISSION ============================ */}
      <section className="section-pad bg-cream">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal="left">
            <span className="eyebrow">
              <span className="h-px w-8 bg-rosewood/60" /> The mission
            </span>
            <h2 className="section-title mt-4 text-balance">
              Scheduling software that still feels human
            </h2>
            <p className="section-sub mt-5">
              We design every screen around the person on the other side of it — the customer who
              wants certainty, and the professional who wants a day that flows. No clutter, no
              dark patterns, no surprise fees.
            </p>
            <ul className="mt-7 space-y-4">
              {[
                ['Live availability', 'Slots update the moment an appointment is booked or cancelled.'],
                ['Double-booking protection', 'Database-level locks mean two people can never claim one slot.'],
                ['Thoughtful reminders', 'Email confirmations, reschedules and reminders — automatically.']
              ].map(([title, text]) => (
                <li key={title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-burgundy text-ivory">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-bold text-charcoal">{title}</span>
                    <span className="block text-sm text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* decorative composition (no external assets) */}
          <div className="relative" data-reveal="right">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] bg-burgundy-gradient shadow-lift">
              <div className="noise absolute inset-0" />
              <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_25%_25%,rgba(214,166,169,0.5),transparent_65%)]" />

              {/* floating mini calendar */}
              <motion.div
                initial={{ opacity: 0, y: 26, rotate: -6 }}
                whileInView={{ opacity: 1, y: 0, rotate: -6 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-[8%] top-[14%] w-44 rounded-2xl border border-white/60 bg-ivory p-4 shadow-lift"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rosewood">November</p>
                <div className="mt-2.5 grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={i}
                      className={`grid h-5 w-5 place-items-center rounded-md text-[9px] font-bold ${
                        i === 10 ? 'bg-burgundy text-ivory' : i === 16 ? 'bg-softrose/60 text-burgundy-800' : 'text-muted'
                      }`}
                    >
                      {(i % 28) + 1}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* floating confirmation card */}
              <motion.div
                initial={{ opacity: 0, y: 30, rotate: 5 }}
                whileInView={{ opacity: 1, y: 0, rotate: 5 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-[14%] right-[7%] w-56 rounded-2xl border border-white/60 bg-ivory p-4 shadow-lift"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <CalendarCheck className="h-4.5 w-4.5 h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-extrabold text-charcoal">Appointment confirmed</p>
                    <p className="text-[11px] text-muted">Tue, 10:30 · Signature facial</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-edge">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-burgundy"
                  />
                </div>
              </motion.div>

              {/* clock chip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute right-[14%] top-[12%] rounded-full bg-ivory/95 px-4 py-2 text-xs font-extrabold text-burgundy shadow-card"
              >
                <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 align-middle" />
                3 slots open today
              </motion.div>
            </div>

            <span className="absolute -bottom-5 -left-5 -z-10 h-28 w-28 rounded-3xl bg-softrose/40 blur-xl" />
          </div>
        </div>
      </section>

      {/* ============================ VALUES ============================ */}
      <section className="section-pad bg-ivory">
        <div className="container-x">
          <div className="mx-auto max-w-3xl text-center" data-reveal>
            <span className="eyebrow justify-center">
              <span className="h-px w-8 bg-rosewood/60" /> What we stand for
              <span className="h-px w-8 bg-rosewood/60" />
            </span>
            <h2 className="section-title mt-4">Four principles behind every decision</h2>
          </div>

          <div data-stagger="0.1" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <article
                key={v.title}
                className="group rounded-[26px] border border-edge bg-white p-6 shadow-card transition-all duration-500 ease-elegant hover:-translate-y-2 hover:border-burgundy-100 hover:shadow-lift"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-burgundy-50 text-burgundy transition-transform duration-500 group-hover:scale-110 group-hover:bg-burgundy group-hover:text-ivory">
                  <v.icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="mt-5 font-display text-xl text-burgundy-800">{v.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ STEPS ============================ */}
      <section className="relative overflow-hidden bg-burgundy-gradient py-20 text-ivory md:py-24">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-rosewood/30 blur-3xl" />

        <div className="container-x relative">
          <div className="max-w-2xl" data-reveal="left">
            <span className="eyebrow !text-softrose">
              <span className="h-px w-8 bg-softrose/70" /> How it works
            </span>
            <h2 className="mt-4 font-display text-3xl leading-[1.1] text-ivory md:text-5xl">
              From intent to appointment in four steps
            </h2>
          </div>

          <div data-stagger="0.12" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="glass-dark rounded-3xl p-6 transition-transform duration-500 hover:-translate-y-1.5">
                <span className="font-display text-3xl text-softrose/85">{s.n}</span>
                <h3 className="mt-3 font-display text-xl text-ivory">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory/65">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4" data-reveal>
            <Link to="/register" className="btn-gold">
              <Sparkles className="h-4 w-4" /> Create a free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="flex items-center gap-2 text-sm text-ivory/65">
              <Target className="h-4 w-4 text-softrose" /> No subscription — pay only when you book.
            </p>
          </div>
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="section-pad bg-ivory">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-[32px] border border-edge bg-cream px-7 py-14 text-center shadow-card md:px-14" data-reveal="scale">
            <span className="eyebrow justify-center">
              <span className="h-px w-8 bg-rosewood/60" /> Ready when you are
              <span className="h-px w-8 bg-rosewood/60" />
            </span>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl leading-[1.12] text-burgundy-800 md:text-[2.75rem]">
              Your next appointment is one click away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted">
              Browse the catalogue, pick a professional and choose a live slot — confirmation is
              instant.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/services" className="btn-primary btn-lg">
                Browse services <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="btn-secondary btn-lg">Talk to us</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
