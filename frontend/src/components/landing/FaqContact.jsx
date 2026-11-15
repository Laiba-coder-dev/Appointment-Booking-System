import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mail, Phone, MapPin, Send, CheckCircle2, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import { SectionHeading, Section } from '../ui/Primitives';

const DEFAULT_FAQS = [
  {
    q: 'How do I book an appointment?',
    a: 'Browse the Services catalogue, pick the treatment you want, choose a professional, then select a date and available time in the seven-step booking flow. Confirm your details, review the summary and complete payment — you will receive an email confirmation immediately.'
  },
  {
    q: 'Can I reschedule or cancel a booking?',
    a: 'Yes. Open the appointment in your dashboard and choose Reschedule or Cancel. Rescheduling pulls live availability, so an overlapping slot can never be selected. Cancellations are refunded automatically when the payment was captured.'
  },
  {
    q: 'Are my payment details safe?',
    a: 'Appointify never stores card numbers. Payments are handled through a tokenised gateway in Stripe test mode (or the built-in mock gateway during development) and only a transaction reference is persisted.'
  },
  {
    q: 'How does Appointify prevent double bookings?',
    a: 'Availability is computed server-side from working hours, blocked dates and existing appointments. Every booking runs inside a database transaction that locks the provider row, and a unique constraint on (provider, start time) makes an overlapping insert impossible.'
  },
  {
    q: 'I am a professional — how do I join?',
    a: 'Register with the Service Provider role, complete your profile and wait for admin approval. Once approved you can publish services, set weekly working hours, block dates and start accepting bookings.'
  },
  {
    q: 'Do providers get a dashboard too?',
    a: 'Absolutely. Providers get statistics, today’s agenda, appointment acceptance, service CRUD, availability management, customer lists, revenue analytics and review responses — all in a dedicated hub.'
  }
];

function FAQItem({ item, open, onToggle, index }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-400 ease-elegant ${
        open ? 'border-burgundy-200 bg-white shadow-card' : 'border-edge bg-white/70 hover:bg-white'
      }`}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold transition-colors ${
            open ? 'bg-burgundy text-ivory' : 'bg-burgundy-50 text-burgundy'
          }`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <span
          className={`flex-1 font-display text-[17px] leading-snug transition-colors ${
            open ? 'text-burgundy' : 'text-burgundy-800'
          }`}
        >
          {item.q}
        </span>

        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-400 ease-elegant ${
            open
              ? 'rotate-45 border-burgundy bg-burgundy text-ivory'
              : 'border-edge bg-white text-burgundy'
          }`}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="px-5 pb-6 pl-[4.4rem] text-sm leading-relaxed text-muted sm:px-6 sm:pl-[4.6rem]">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [open, setOpen] = useState(0);
  const [faqs, setFaqs] = useState(DEFAULT_FAQS);

  useEffect(() => {
    api
      .get('/api/faq')
      .then((r) => {
        const list = r.data?.data?.faqs;
        if (Array.isArray(list) && list.length) setFaqs(list);
      })
      .catch(() => {
        /* endpoint is optional — bundled defaults are used */
      });
  }, []);

  return (
    <Section id="faq" className="overflow-hidden bg-cream">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div data-reveal="left">
          <span className="eyebrow">
            <span className="h-px w-8 bg-rosewood/60" />
            FAQ
          </span>
          <h2 className="section-title mt-4">
            Questions? <span className="italic text-rosewood">Answered.</span>
          </h2>
          <p className="section-sub mt-5">
            Everything you need to know about booking, payments and becoming an
            Appointify professional.
          </p>

          <div className="mt-8 rounded-2xl border border-edge bg-white p-6 shadow-card">
            <p className="text-sm font-bold text-charcoal">Still have a question?</p>
            <p className="mt-1.5 text-sm text-muted">
              Our team replies within one business day.
            </p>
            <a href="#contact" className="btn-primary mt-4 btn-sm">
              Talk to us
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="space-y-3.5" data-stagger="0.07">
          {faqs.map((item, i) => (
            <FAQItem
              key={item.q}
              item={item}
              index={i}
              open={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------ CONTACT ------------------------------ */

export function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [serverMsg, setServerMsg] = useState('');

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.subject.trim().length < 3) e.subject = 'Please add a subject';
    if (form.message.trim().length < 10) e.message = 'Message must be at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setState('sending');
    setServerMsg('');
    try {
      const res = await api.post('/api/contact', form);
      setServerMsg(res.data?.message || 'Thanks — we will be in touch shortly.');
      setState('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
      setErrors({});
    } catch (err) {
      setServerMsg(err.message || 'We could not send your message. Please email us directly.');
      setState('error');
    }
  };

  const set = (k) => (ev) => {
    setForm((f) => ({ ...f, [k]: ev.target.value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  return (
    <Section id="contact" className="relative overflow-hidden bg-ivory">
      <div className="pointer-events-none absolute -right-40 top-0 h-[26rem] w-[26rem] rounded-full bg-burgundy-100/50 blur-3xl" data-parallax="80" />

      <div className="relative grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* ---- info column ---- */}
        <div data-reveal="left">
          <SectionHeading
            align="left"
            eyebrow="Contact"
            title={
              <>
                Let’s start a <span className="italic text-rosewood">conversation</span>
              </>
            }
            subtitle="Whether you are booking, partnering or just curious — we would love to hear from you."
          />

          <div className="mt-9 space-y-3.5" data-stagger="0.1">
            {[
              { Icon: Mail, title: 'Email us', value: 'hello@appointify.com', href: 'mailto:hello@appointify.com' },
              { Icon: Phone, title: 'Call us', value: '+1 (415) 555-0100', href: 'tel:+14155550100' },
              { Icon: MapPin, title: 'Visit us', value: '128 Amber Row, San Francisco, CA 94103', href: null }
            ].map(({ Icon, title, value, href }) => {
              const inner = (
                <>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-card ring-1 ring-edge transition-all duration-400 group-hover:-translate-y-1 group-hover:bg-burgundy group-hover:ring-burgundy">
                    <Icon className="h-5 w-5 text-burgundy transition-colors group-hover:text-ivory" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
                      {title}
                    </span>
                    <span className="block truncate text-[15px] font-bold text-charcoal transition-colors group-hover:text-burgundy">
                      {value}
                    </span>
                  </span>
                </>
              );
              return href ? (
                <a key={title} href={href} className="group flex items-center gap-4 rounded-2xl border border-edge bg-white/70 p-4 transition-all duration-400 hover:border-burgundy-200 hover:bg-white hover:shadow-card">
                  {inner}
                </a>
              ) : (
                <div key={title} className="group flex items-center gap-4 rounded-2xl border border-edge bg-white/70 p-4">
                  {inner}
                </div>
              );
            })}
          </div>

          {/* hours */}
          <div className="mt-7 rounded-2xl border border-edge bg-burgundy-gradient p-6 text-ivory">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-softrose">Support hours</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-ivory/70">Monday – Friday</span>
                <span className="font-bold">8:00 – 19:00</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-ivory/70">Saturday</span>
                <span className="font-bold">9:00 – 15:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ivory/70">Sunday</span>
                <span className="font-bold">Closed</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- form column ---- */}
        <motion.div
          data-reveal="right"
          className="relative rounded-[30px] border border-edge bg-white p-7 shadow-lift sm:p-9"
        >
          <span className="absolute -top-3 left-9 rounded-full bg-burgundy-gradient px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ivory shadow-glow">
            Send a message
          </span>

          <h3 className="mt-3 font-display text-2xl text-burgundy-800">How can we help?</h3>
          <p className="mt-1.5 text-sm text-muted">
            Fill in the form and our team will get back to you shortly.
          </p>

          <AnimatePresence mode="wait">
            {state === 'sent' ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
              >
                <motion.span
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                  className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white"
                >
                  <CheckCircle2 className="h-7 w-7" />
                </motion.span>
                <p className="mt-4 font-display text-xl text-emerald-800">Message sent!</p>
                <p className="mt-1.5 text-sm text-emerald-700/85">{serverMsg}</p>
                <button
                  onClick={() => setState('idle')}
                  className="btn-secondary mt-5 !border-emerald-300 !text-emerald-800"
                >
                  Send another
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-7 space-y-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-name" className="field-label">Full name</label>
                    <input
                      id="c-name"
                      className="field"
                      placeholder="Jordan Rivera"
                      value={form.name}
                      onChange={set('name')}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <p className="field-error">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="c-email" className="field-label">Email</label>
                    <input
                      id="c-email"
                      type="email"
                      className="field"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={set('email')}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <p className="field-error">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="c-subject" className="field-label">Subject</label>
                  <input
                    id="c-subject"
                    className="field"
                    placeholder="Booking question"
                    value={form.subject}
                    onChange={set('subject')}
                    aria-invalid={!!errors.subject}
                  />
                  {errors.subject && <p className="field-error">{errors.subject}</p>}
                </div>

                <div>
                  <label htmlFor="c-message" className="field-label">Message</label>
                  <textarea
                    id="c-message"
                    rows={5}
                    className="field resize-none"
                    placeholder="Tell us a little more…"
                    value={form.message}
                    onChange={set('message')}
                    aria-invalid={!!errors.message}
                  />
                  {errors.message && <p className="field-error">{errors.message}</p>}
                </div>

                {state === 'error' && (
                  <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-4 py-3 text-xs font-semibold text-burgundy-700">
                    {serverMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state === 'sending'}
                  className="btn-primary w-full !py-3.5 disabled:opacity-60"
                >
                  {state === 'sending' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send message
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-muted">
                  By submitting you agree to our privacy policy.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Section>
  );
}
