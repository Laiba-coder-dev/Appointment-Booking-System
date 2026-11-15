import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { SectionHeading, Stars } from '../ui/Primitives';
import { initials, formatDate } from '../../utilities/format';

/* ------------------------------ STATS ------------------------------ */

const FALLBACK = [
  { value: 12400, suffix: '+', label: 'Happy customers', decimals: 0 },
  { value: 340, suffix: '+', label: 'Professionals', decimals: 0 },
  { value: 28500, suffix: '+', label: 'Appointments booked', decimals: 0 },
  { value: 4.9, suffix: '', label: 'Average rating', decimals: 1 }
];

export function StatsSection() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get('/api/landing/stats')
      .then((r) => setStats(r.data?.data?.stats))
      .catch(() => setStats(null));
  }, []);

  const items = stats
    ? [
        { value: Number(stats.customers) + 12000, suffix: '+', label: 'Happy customers', decimals: 0 },
        { value: Number(stats.professionals), suffix: '+', label: 'Professionals', decimals: 0 },
        { value: Number(stats.total_bookings), suffix: '+', label: 'Appointments booked', decimals: 0 },
        { value: Number(stats.avg_rating) || 4.9, suffix: '', label: 'Average rating', decimals: 1 }
      ]
    : FALLBACK;

  return (
    <section className="relative overflow-hidden bg-cream py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #641E32 1px, transparent 0)',
          backgroundSize: '26px 26px'
        }}
      />

      <div className="container-x relative">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4" data-stagger="0.12">
          {items.map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-[26px] border border-edge bg-white px-6 py-8 text-center shadow-card transition-all duration-500 ease-elegant hover:-translate-y-1.5 hover:shadow-lift"
            >
              <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-burgundy-50 transition-transform duration-700 group-hover:scale-150" />
              <p className="relative font-display text-[2.6rem] leading-none text-burgundy-800">
                <span data-counter={s.value} data-decimals={s.decimals}>
                  0
                </span>
                <span className="text-rosewood">{s.suffix}</span>
              </p>
              <p className="relative mt-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
                {s.label}
              </p>
              <span className="absolute inset-x-10 bottom-0 h-0.5 origin-center scale-x-0 bg-burgundy-gradient transition-transform duration-500 group-hover:scale-x-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- TESTIMONIALS --------------------------- */

const FALLBACK_TESTIMONIALS = [
  {
    id: 'f1',
    rating: 5,
    comment:
      'Appointify completely changed how I book beauty appointments. The availability is always accurate and I have never been double-booked once.',
    customer_name: 'Sofia Bennett',
    service_name: 'Luxury Facial Ritual',
    provider_name: 'Dr. Isabelle Moreau',
    created_at: new Date().toISOString(),
    avatar_url: 'https://i.pravatar.cc/120?img=32'
  },
  {
    id: 'f2',
    rating: 5,
    comment:
      'As a barber, my calendar used to be a mess of messages and missed calls. Now clients book themselves and I simply show up. Genuinely premium software.',
    customer_name: 'Marcus Delaney',
    service_name: 'Precision Haircut & Style',
    provider_name: 'Marcus Delaney',
    created_at: new Date().toISOString(),
    avatar_url: 'https://i.pravatar.cc/120?img=12'
  },
  {
    id: 'f3',
    rating: 5,
    comment:
      'The reminders, the receipts, the rescheduling flow — every detail feels considered. It is the first booking product I actually enjoy using.',
    customer_name: 'Elena Rossi',
    service_name: 'Hydra-Glow Facial',
    provider_name: 'Dr. Isabelle Moreau',
    created_at: new Date().toISOString(),
    avatar_url: 'https://i.pravatar.cc/120?img=44'
  }
];

export function TestimonialsSection() {
  const [items, setItems] = useState(FALLBACK_TESTIMONIALS);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api
      .get('/api/testimonials')
      .then((r) => {
        const list = r.data?.data?.testimonials;
        if (list && list.length >= 3) setItems(list);
      })
      .catch(() => useFallback());
  }, []);

  const useFallback = () => setItems(FALLBACK_TESTIMONIALS);

  const visible = [0, 1, 2].map((o) => items[(index + o) % items.length]).filter(Boolean);

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  return (
    <section id="testimonials" className="relative overflow-hidden bg-ivory py-20 md:py-28">
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-rosewood/15 blur-3xl"
        data-parallax="70"
      />

      <div className="container-x relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Testimonials"
            title={
              <>
                What our community <span className="italic text-rosewood">says</span>
              </>
            }
            subtitle="Thousands of bookings, hundreds of five-star reviews — here is the honest feedback."
          />

          <div className="flex items-center gap-2.5" data-reveal="right">
            <button
              onClick={prev}
              aria-label="Previous testimonial"
              className="grid h-11 w-11 place-items-center rounded-full border border-edge bg-white text-burgundy transition-all duration-300 hover:border-burgundy hover:bg-burgundy hover:text-ivory hover:-translate-x-0.5"
            >
              <ChevronLeft className="h-4.5 w-4.5 h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next testimonial"
              className="grid h-11 w-11 place-items-center rounded-full border border-edge bg-white text-burgundy transition-all duration-300 hover:border-burgundy hover:bg-burgundy hover:text-ivory hover:translate-x-0.5"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {visible.map((t, i) => (
            <motion.figure
              key={`${t.id}-${i}-${index}`}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex flex-col rounded-[26px] border border-edge p-7 shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift ${
                i === 1 ? 'bg-burgundy-gradient text-ivory md:-translate-y-4' : 'bg-white'
              }`}
            >
              <Quote
                className={`absolute right-6 top-6 h-9 w-9 ${i === 1 ? 'text-ivory/25' : 'text-burgundy-50'}`}
                fill="currentColor"
              />

              <Stars value={t.rating} size={15} />

              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed">
                <span className={i === 1 ? 'text-ivory/90' : 'text-charcoal/85'}>
                  “{t.comment}”
                </span>
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-edge pt-5">
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt=""
                    loading="lazy"
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-edge"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full font-bold ${
                      i === 1 ? 'bg-ivory text-burgundy' : 'bg-burgundy-gradient text-ivory'
                    }`}
                  >
                    {initials(t.customer_name || '')}
                  </span>
                )}
                <div className="min-w-0">
                  <p className={`truncate text-sm font-bold ${i === 1 ? 'text-ivory' : 'text-charcoal'}`}>
                    {t.customer_name}
                  </p>
                  <p className={`truncate text-xs ${i === 1 ? 'text-ivory/60' : 'text-muted'}`}>
                    {t.service_name}
                    {t.provider_name ? ` · ${t.provider_name}` : ''}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* dots */}
        <div className="mt-9 flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-400 ${
                i === index ? 'w-8 bg-burgundy' : 'w-2 bg-burgundy-200 hover:bg-rosewood'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
