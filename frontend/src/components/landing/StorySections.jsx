import { motion } from 'framer-motion';
import {
  Search, CalendarDays, CreditCard, PartyPopper,
  ShieldCheck, Clock3, Sparkles, Headphones
} from 'lucide-react';
import { SectionHeading, Section } from '../ui/Primitives';

const STEPS = [
  {
    icon: Search,
    title: 'Discover services',
    text: 'Browse curated categories, compare durations and pricing, and find the perfect treatment.'
  },
  {
    icon: CalendarDays,
    title: 'Pick your professional',
    text: 'Choose a verified specialist, then select a date from their live, real-time availability.'
  },
  {
    icon: CreditCard,
    title: 'Confirm & pay',
    text: 'Review your booking, pay securely in test mode and wait for the professional to approve.'
  },
  {
    icon: PartyPopper,
    title: 'Enjoy your visit',
    text: 'Get reminders by email, reschedule any time and leave a review afterwards.'
  }
];

const REASONS = [
  {
    icon: Clock3,
    title: 'Real-time availability',
    text: 'Slots update live from working hours, blocked dates and existing bookings — no double bookings, ever.'
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    text: 'JWT sessions, bcrypt-hashed passwords, role-based access and server-side validation on every request.'
  },
  {
    icon: Sparkles,
    title: 'A premium experience',
    text: 'Editorial typography, considered motion and a burgundy-and-ivory palette that feels genuinely luxury.'
  },
  {
    icon: Headphones,
    title: 'Support that responds',
    text: 'Real humans, real answers — reach the Appointify team any day of the week.'
  }
];

export function HowItWorks() {
  return (
    <Section id="how" className="bg-ivory relative overflow-hidden">
      <SectionHeading
        eyebrow="How it works"
        title={
          <>
            Four steps from intent to <span className="italic text-rosewood">appointment</span>
          </>
        }
        subtitle="A booking flow designed to feel effortless — on desktop, tablet and mobile."
      />

      {/* connector line */}
      <div className="relative mx-auto mt-14 max-w-6xl">
        <span
          className="pointer-events-none absolute left-0 right-0 top-[54px] hidden h-px bg-gradient-to-r from-transparent via-burgundy-200 to-transparent lg:block"
          data-parallax-x="26"
          aria-hidden="true"
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4" data-stagger="0.12">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative text-center">
              <div className="relative mx-auto grid h-[108px] w-[108px] place-items-center">
                <span className="absolute inset-0 rounded-[30px] bg-white shadow-card ring-1 ring-edge" />
                <span className="absolute inset-0 rounded-[30px] bg-burgundy-gradient opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <s.icon className="relative h-9 w-9 text-burgundy" strokeWidth={1.7} />

                <span className="absolute -right-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full bg-gold-gradient text-[11px] font-extrabold text-charcoal ring-4 ring-ivory">
                  {i + 1}
                </span>
              </div>

              <h3 className="mt-6 font-display text-xl text-burgundy-800">{s.title}</h3>
              <p className="mx-auto mt-2.5 max-w-[260px] text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function WhyChoose() {
  return (
    <Section id="why" className="relative overflow-hidden bg-burgundy-gradient text-ivory">
      <div className="noise absolute inset-0" />
      <div className="pointer-events-none absolute -right-32 -top-24 h-[24rem] w-[24rem] rounded-full bg-rosewood/30 blur-3xl" data-parallax="80" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-[20rem] w-[20rem] rounded-full bg-gold/10 blur-3xl" data-parallax="60" />

      <div className="relative grid items-center gap-14 lg:grid-cols-2">
        <div data-reveal="left">
          <span className="eyebrow !text-softrose">
            <span className="h-px w-8 bg-softrose/70" />
            Why choose Appointify
          </span>
          <h2 className="mt-4 font-display text-4xl leading-[1.1] text-ivory md:text-5xl">
            Built for people who<br />
            <span className="italic text-softrose">value their time</span>
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ivory/70">
            Appointify pairs an elegant front-of-house experience with a serious
            scheduling engine underneath — so booking feels beautiful and works flawlessly.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2" data-stagger="0.1">
            {REASONS.map((r) => (
              <div
                key={r.title}
                className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-xl transition-all duration-400 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.12]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ivory/95">
                  <r.icon className="h-5 w-5 text-burgundy" strokeWidth={1.9} />
                </span>
                <h3 className="mt-3.5 font-display text-lg text-ivory">{r.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ivory/65">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- visual composition ---- */}
        <div className="relative mx-auto w-full max-w-lg" data-reveal="scale">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: -3 }}
            whileInView={{ opacity: 1, scale: 1, rotate: -2 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[30px] border border-white/15 shadow-lift"
          >
            <img
              src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=1000&q=80"
              alt="Elegant salon interior"
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/85 via-burgundy-900/15 to-transparent" />

            {/* floating appointment card */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-5 right-5 bottom-5 rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/90 text-white">✓</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ivory">Appointment confirmed</p>
                  <p className="truncate text-[11px] text-ivory/65">Signature Facial · Fri, 2:00 PM</p>
                </div>
                <span className="ml-auto rounded-full bg-ivory/90 px-2.5 py-1 text-[10px] font-extrabold text-burgundy">
                  PAID
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* floating stat chip */}
          <motion.div
            animate={{ y: [0, 14, 0] }}
            transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="absolute -left-6 top-10 rounded-2xl border border-white/20 bg-ivory/95 px-5 py-4 shadow-lift backdrop-blur"
          >
            <p className="font-display text-3xl text-burgundy-800">98%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Show-up rate</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
            className="absolute -right-4 top-1/3 rounded-2xl border border-white/20 bg-ivory/95 px-5 py-4 shadow-lift backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <p className="text-xs font-extrabold uppercase tracking-wider text-burgundy">Live sync</p>
            </div>
            <p className="mt-1 text-[11px] text-muted">Availability updates instantly</p>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
