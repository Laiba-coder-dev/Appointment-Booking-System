import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Clock, MapPin, Send, CheckCircle2, MessageSquare,
  LifeBuoy, ArrowRight, Loader2, AlertCircle, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useDocumentTitle } from '../hooks/useUtility';
import useGsapReveal from '../hooks/useGsapReveal';

const SUBJECTS = ['General question', 'Booking help', 'Payment or refund', 'Become a professional', 'Partnership', 'Something else'];

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function ContactPage() {
  useDocumentTitle('Contact us');
  const scope = useGsapReveal();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState(null);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.subject.trim().length < 3) next.subject = 'Please choose a subject';
    if (form.message.trim().length < 10) next.message = 'Message must be at least 10 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSending(true);
      setServerError(null);
      const res = await api.post('/api/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim()
      });
      setSent(true);
      setForm(EMPTY);
      return res.data?.message;
    } catch (err) {
      const details = err.details;
      if (Array.isArray(details) && details.length) {
        setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      }
      setServerError(err.message || 'We could not send your message');
    } finally {
      setSending(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label htmlFor={`contact-${key}`} className="field-label">{label}</label>
      <input
        id={`contact-${key}`}
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `err-${key}` : undefined}
        className="field"
      />
      {errors[key] && (
        <p id={`err-${key}`} className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {errors[key]}</p>
      )}
    </div>
  );

  return (
    <div ref={scope} className="bg-ivory pb-24">
      {/* ============================ HERO ============================ */}
      <header className="relative overflow-hidden bg-burgundy-gradient pt-[124px]">
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -right-20 top-8 h-72 w-72 rounded-full bg-rosewood/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-x relative pb-16 pt-6">
          <span className="eyebrow !text-softrose" data-reveal="left">
            <span className="h-px w-8 bg-softrose/70" /> Contact
          </span>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-[1.08] text-ivory md:text-5xl" data-reveal>
            Let's start a <span className="italic text-softrose">conversation</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ivory/70" data-reveal>
            Questions about a booking, a payment or joining Appointify as a professional?
            We reply within one business day.
          </p>
        </div>
      </header>

      {/* ============================ CONTENT ============================ */}
      <div className="container-x -mt-6 mt-10">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          {/* ------------------------- form ------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="self-start rounded-[28px] border border-edge bg-white p-6 shadow-card sm:p-8"
          >
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="py-10 text-center"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-burgundy text-ivory shadow-glow"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </motion.span>
                  <h2 className="mt-6 font-display text-2xl text-burgundy-800">Message sent</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    Thanks for reaching out — our team will reply to your inbox within one business
                    day. Anything urgent about an existing booking is fastest from your dashboard.
                  </p>
                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <button onClick={() => setSent(false)} className="btn-primary">
                      Send another message
                    </button>
                    <Link to="/services" className="btn-secondary">
                      Browse services <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={submit}
                  noValidate
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-burgundy-50 text-burgundy">
                      <MessageSquare className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-display text-xl text-burgundy-800">Send us a message</h2>
                      <p className="text-xs text-muted">All fields are required</p>
                    </div>
                  </div>

                  {serverError && (
                    <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-burgundy-100 bg-burgundy-50 px-4 py-3 text-[13px] text-burgundy-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
                    </div>
                  )}

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    {field('name', 'Your name', 'text', 'Sofia Bennett')}
                    {field('email', 'Email address', 'email', 'sofia@example.com')}
                  </div>

                  <div className="mt-5">
                    <label htmlFor="contact-subject" className="field-label">Subject</label>
                    <select
                      id="contact-subject"
                      value={form.subject}
                      onChange={set('subject')}
                      aria-invalid={!!errors.subject}
                      className="field"
                    >
                      <option value="">Choose a topic…</option>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.subject && (
                      <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {errors.subject}</p>
                    )}
                  </div>

                  <div className="mt-5">
                    <label htmlFor="contact-message" className="field-label">Message</label>
                    <textarea
                      id="contact-message"
                      rows={6}
                      value={form.message}
                      onChange={set('message')}
                      placeholder="Tell us a little more… (at least 10 characters)"
                      aria-invalid={!!errors.message}
                      className="field resize-y"
                    />
                    <div className="mt-1.5 flex items-center justify-between">
                      {errors.message ? (
                        <p className="field-error !mt-0"><AlertCircle className="h-3.5 w-3.5" /> {errors.message}</p>
                      ) : <span />}
                      <span className={`text-[11px] ${form.message.length < 10 ? 'text-muted' : 'text-emerald-600'}`}>
                        {form.message.length}/10 min
                      </span>
                    </div>
                  </div>

                  <button type="submit" disabled={sending} className="btn-primary mt-7 w-full !py-3.5">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? 'Sending…' : 'Send message'}
                  </button>

                  <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    We never share your details. Unsubscribing is always one click.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ------------------------- aside ------------------------- */}
          <aside className="space-y-5">
            {[
              {
                icon: Mail,
                title: 'Email support',
                lines: ['hello@appointify.com', 'Replies within one business day'],
                action: null
              },
              {
                icon: Clock,
                title: 'Support hours',
                lines: ['Monday – Saturday · 08:00 – 20:00', 'Sunday · appointments only'],
                action: null
              },
              {
                icon: LifeBuoy,
                title: 'Existing booking?',
                lines: ['Reschedule, cancel or refund from your dashboard — it takes seconds.'],
                action: { to: '/dashboard/appointments', label: 'Open my appointments' }
              }
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[26px] border border-edge bg-white p-6 shadow-card"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-burgundy-50 text-burgundy">
                  <card.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg text-burgundy-800">{card.title}</h3>
                <div className="mt-2 space-y-1">
                  {card.lines.map((l) => (
                    <p key={l} className="text-sm text-muted">{l}</p>
                  ))}
                </div>
                {card.action && (
                  <Link to={card.action.to} className="btn-secondary mt-4 !py-2.5 text-xs">
                    {card.action.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </motion.div>
            ))}

            <div className="rounded-[26px] border border-edge bg-burgundy-gradient p-6 text-ivory">
              <div className="noise absolute" />
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-softrose">
                <MapPin className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg text-ivory">Studio &amp; headquarters</h3>
              <p className="mt-2 text-sm leading-relaxed text-ivory/70">
                18 Rosewood Lane, Suite 400<br />
                Boston, MA 02110
              </p>
              <p className="mt-3 text-xs text-ivory/55">
                Visits by appointment only — book a slot with our concierge team.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
