import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck, Instagram, Twitter, Linkedin, Facebook,
  Mail, Phone, MapPin, ArrowUpRight, Heart
} from 'lucide-react';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Browse Services', to: '/services' },
      { label: 'Professionals', to: '/professionals' },
      { label: 'How It Works', to: '/#how' },
      { label: 'Testimonials', to: '/#testimonials' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'FAQ', to: '/#faq' },
      { label: 'Careers', to: '/contact' }
    ]
  },
  {
    title: 'Get Started',
    links: [
      { label: 'Sign Up', to: '/register' },
      { label: 'Login', to: '/login' },
      { label: 'Book Now', to: '/services' },
      { label: 'Become a Provider', to: '/register?role=provider' }
    ]
  }
];

const SOCIALS = [
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Twitter, label: 'Twitter' },
  { Icon: Linkedin, label: 'LinkedIn' },
  { Icon: Facebook, label: 'Facebook' }
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-burgundy-800 text-ivory">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-rosewood/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative container-x">
        {/* ---- Newsletter band ---- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="-translate-y-12 rounded-[28px] border border-white/10 bg-white/[0.07] p-8 backdrop-blur-xl md:flex md:items-center md:justify-between md:gap-8"
        >
          <div>
            <p className="eyebrow !text-softrose">Stay in the loop</p>
            <h3 className="mt-2 font-display text-2xl text-ivory md:text-3xl">
              Scheduling insights, delivered monthly.
            </h3>
          </div>
          <form
            className="mt-5 flex w-full max-w-md gap-2.5 md:mt-0"
            onSubmit={(e) => {
              e.preventDefault();
              const btn = e.currentTarget.querySelector('button');
              const original = btn.textContent;
              btn.textContent = 'Subscribed ✓';
              setTimeout(() => (btn.textContent = original), 2400);
              e.currentTarget.reset();
            }}
          >
            <input
              type="email"
              required
              placeholder="you@example.com"
              aria-label="Email address"
              className="field !border-white/20 !bg-white/10 !text-ivory placeholder:!text-ivory/55 focus:!border-softrose focus:!ring-rosewood/30"
            />
            <button type="submit" className="btn-gold btn-sm shrink-0 !py-3">
              Join
            </button>
          </form>
        </motion.div>

        {/* ---- Main grid ---- */}
        <div className="grid gap-12 pb-14 pt-4 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ivory shadow-card">
                <CalendarCheck className="h-5 w-5 text-burgundy" strokeWidth={2.2} />
              </span>
              <span className="font-display text-2xl font-bold text-ivory">
                Appoint<span className="text-softrose">ify</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/70">
              Your Time. Your Schedule. Your Way. Discover services, choose professionals
              and manage your time with ease on a platform built for modern life.
            </p>

            <div className="mt-6 space-y-2.5 text-sm text-ivory/70">
              <a href="mailto:hello@appointify.com" className="flex items-center gap-2.5 transition hover:text-softrose">
                <Mail className="h-4 w-4 shrink-0" /> hello@appointify.com
              </a>
              <a href="tel:+14155550100" className="flex items-center gap-2.5 transition hover:text-softrose">
                <Phone className="h-4 w-4 shrink-0" /> +1 (415) 555-0100
              </a>
              <p className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0" /> 128 Amber Row, San Francisco, CA
              </p>
            </div>

            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  onClick={(e) => e.preventDefault()}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-ivory/75 transition-all duration-300 ease-elegant hover:-translate-y-1 hover:border-softrose hover:bg-white/10 hover:text-ivory"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col, i) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-2"
            >
              <h4 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-softrose">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1.5 text-sm text-ivory/70 transition hover:text-ivory"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          <div className="lg:col-span-1" />
        </div>

        {/* ---- Bottom bar ---- */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-7 text-xs text-ivory/55 md:flex-row">
          <p>© {new Date().getFullYear()} Appointify. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-softrose">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-softrose">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-softrose">Cookies</a>
          </div>
          <p className="flex items-center gap-1.5">
            Crafted with <Heart className="h-3.5 w-3.5 fill-softrose text-softrose" /> in Burgundy &amp; Ivory
          </p>
        </div>
      </div>
    </footer>
  );
}
