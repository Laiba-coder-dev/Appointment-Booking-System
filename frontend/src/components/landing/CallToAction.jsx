import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarCheck, Sparkles, ShieldCheck, Clock } from 'lucide-react';

/**
 * Closing conversion band before the contact section.
 * Uses layered GSAP parallax for depth.
 */
export default function CallToAction() {
  return (
    <section className="relative overflow-hidden bg-ivory py-16 md:py-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[36px] bg-burgundy-gradient px-7 py-14 text-center shadow-lift md:px-16 md:py-20">
          <div className="noise absolute inset-0" />

          {/* layered parallax glows */}
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rosewood/40 blur-3xl"
            data-parallax="55"
          />
          <div
            className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-gold/15 blur-3xl"
            data-parallax="75"
          />
          <div
            className="pointer-events-none absolute left-1/2 top-4 h-40 w-40 -translate-x-1/2 rounded-full bg-softrose/25 blur-2xl"
            data-parallax="40"
          />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ivory backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Ready when you are
            </span>

            <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl leading-[1.08] text-ivory md:text-5xl lg:text-[3.5rem]">
              Your next appointment is
              <span className="italic text-softrose"> one click away</span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ivory/70">
              Join thousands who plan their days with Appointify. Discover services,
              choose your professional and book in under a minute.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link to="/book" className="btn-primary btn-lg group !bg-ivory !text-burgundy-800 hover:!bg-white">
                <CalendarCheck className="h-4 w-4" />
                Book an Appointment
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
              <Link
                to="/register"
                className="btn btn-lg border border-white/30 bg-white/10 px-7 text-ivory backdrop-blur transition-all duration-300 hover:border-white/55 hover:bg-white/15 hover:-translate-y-0.5"
              >
                Create free account
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/10 pt-7 text-xs text-ivory/60">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-softrose" /> Secure checkout
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-softrose" /> Approval-based booking
              </span>
              <span className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-softrose" /> Free cancellation
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
