import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, AlertCircle, Eye, EyeOff, User, Briefcase,
  Check, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useUtility';
import { Spinner } from '../../components/ui/LoadingScreen';

const ROLES = [
  {
    id: 'customer',
    icon: User,
    title: 'Customer',
    text: 'Book appointments with top professionals.'
  },
  {
    id: 'provider',
    icon: Briefcase,
    title: 'Service Provider',
    text: 'Publish services and grow your calendar.'
  }
];

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    phone: '', specialization: '', headline: '', experience_years: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Za-z]/.test(p) && /[0-9]/.test(p)) s++;
    if (p.length >= 12) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  })();

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      e.password = 'Include at least one letter and one number';
    }
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    if (role === 'provider' && form.specialization.trim().length < 2) {
      e.specialization = 'Tell us your specialisation';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
        phone: form.phone || ''
      };
      if (role === 'provider') {
        payload.specialization = form.specialization;
        payload.headline = form.headline;
        payload.experience_years = Number(form.experience_years) || 0;
      }

      const { user, message } = await register(payload);
      // Success message surfaces via toast; route by role.
      const target = user.role === 'provider' ? '/provider' : '/dashboard';
      navigate(target, { replace: true, state: { flash: message } });
    } catch (err) {
      setServerError(err.message || 'Unable to create your account.');
      if (err.details?.length) {
        const map = {};
        err.details.forEach((d) => (map[d.field] = d.message));
        setErrors((prev) => ({ ...prev, ...map }));
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (ev) => {
    setForm((f) => ({ ...f, [k]: ev.target.value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* role selector */}
      <div className="grid grid-cols-2 gap-3">
        {ROLES.map((r) => {
          const active = role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              aria-pressed={active}
              className={`relative rounded-2xl border p-3.5 text-left transition-all duration-300 ease-elegant ${
                active
                  ? 'border-burgundy bg-burgundy-50 shadow-card'
                  : 'border-edge bg-white hover:border-burgundy-200 hover:shadow-card'
              }`}
            >
              <span className="flex items-center justify-between">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                    active ? 'bg-burgundy text-ivory' : 'bg-cream text-burgundy'
                  }`}
                >
                  <r.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="grid h-5 w-5 place-items-center rounded-full bg-burgundy text-ivory"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                )}
              </span>
              <span className="mt-2.5 block text-[13px] font-bold text-charcoal">{r.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">{r.text}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {serverError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-start gap-2.5 rounded-xl border border-burgundy-200 bg-burgundy-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
              <p className="text-[13px] font-semibold text-burgundy-700">{serverError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label htmlFor="r-name" className="field-label">Full name</label>
        <input id="r-name" className="field" placeholder="Jordan Rivera" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-email" className="field-label">Email</label>
          <input id="r-email" type="email" className="field" placeholder="you@example.com" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="r-phone" className="field-label">Phone <span className="normal-case tracking-normal text-muted/70">(optional)</span></label>
          <input id="r-phone" className="field" placeholder="+1 415 555 0100" value={form.phone} onChange={set('phone')} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {role === 'provider' && (
          <motion.div
            key="provider-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-2xl border border-burgundy-100 bg-burgundy-50/40 p-4">
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-burgundy">
                <Briefcase className="h-3.5 w-3.5" /> Professional details
                <span className="ml-auto font-normal normal-case tracking-normal text-muted">
                  pending admin approval
                </span>
              </p>

              <div>
                <label htmlFor="r-spec" className="field-label">Specialisation</label>
                <input id="r-spec" className="field" placeholder="Clinical Aesthetics" value={form.specialization} onChange={set('specialization')} aria-invalid={!!errors.specialization} />
                {errors.specialization && <p className="field-error">{errors.specialization}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
                <div>
                  <label htmlFor="r-head" className="field-label">Headline</label>
                  <input id="r-head" className="field" placeholder="10 years of skin health expertise" value={form.headline} onChange={set('headline')} />
                </div>
                <div>
                  <label htmlFor="r-exp" className="field-label">Years exp.</label>
                  <input id="r-exp" type="number" min="0" max="60" className="field" placeholder="8" value={form.experience_years} onChange={set('experience_years')} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-pw" className="field-label">Password</label>
          <div className="relative">
            <input
              id="r-pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              className="field !pr-11"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={set('password')}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition hover:text-burgundy"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="r-confirm" className="field-label">Confirm</label>
          <input
            id="r-confirm"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            className="field"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={set('confirm')}
            aria-invalid={!!errors.confirm}
          />
          {errors.confirm && <p className="field-error">{errors.confirm}</p>}
        </div>
      </div>

      {/* strength meter */}
      {form.password && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-400 ${
                  i <= strength
                    ? strength <= 1
                      ? 'bg-red-400'
                      : strength === 2
                        ? 'bg-amber-400'
                        : strength === 3
                          ? 'bg-gold'
                          : 'bg-emerald-500'
                    : 'bg-edge'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted">
            {['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]} — use 8+ chars with a letter and a number.
          </p>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
        {loading ? (
          <>
            <Spinner /> Creating account…
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" /> Create account
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        Your password is hashed with bcrypt and never stored in plain text.
      </p>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-burgundy underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
