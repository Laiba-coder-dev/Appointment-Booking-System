import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useUtility';
import { Spinner } from '../../components/ui/LoadingScreen';

const DEMO = [
  { role: 'Customer', email: 'sofia@example.com' },
  { role: 'Provider', email: 'isabelle@appointify.com' },
  { role: 'Admin', email: 'admin@appointify.com' }
];

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const from = location.state?.from;
      const fallback =
        user.role === 'admin' ? '/admin' : user.role === 'provider' ? '/provider' : '/dashboard';
      navigate(from && !from.startsWith('/login') ? from : fallback, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (ev) => {
    setForm((f) => ({ ...f, [k]: ev.target.value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const fillDemo = (email) => {
    setForm({ email, password: 'Password123!' });
    setErrors({});
    setServerError('');
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2.5 rounded-xl border border-burgundy-200 bg-burgundy-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
              <p className="text-[13px] font-semibold text-burgundy-700">{serverError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label htmlFor="email" className="field-label">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="field"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="field-label">Password</label>
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rosewood hover:text-burgundy"
          >
            {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          id="password"
          type={showPw ? 'text' : 'password'}
          autoComplete="current-password"
          className="field"
          placeholder="••••••••"
          value={form.password}
          onChange={set('password')}
          aria-invalid={!!errors.password}
        />
        {errors.password && <p className="field-error">{errors.password}</p>}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
        {loading ? (
          <>
            <Spinner /> Signing in…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" /> Sign in
          </>
        )}
      </button>

      <p className="text-center text-sm text-muted">
        New to Appointify?{' '}
        <Link to="/register" className="font-bold text-burgundy underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      {/* ---- demo accounts ---- */}
      <div className="rounded-2xl border border-dashed border-burgundy-200 bg-burgundy-50/50 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-burgundy">
          <CheckCircle2 className="h-3.5 w-3.5" /> Demo accounts
        </p>
        <p className="mt-1 text-[11px] text-muted">Password for all: <strong>Password123!</strong></p>
        <div className="mt-2.5 space-y-1.5">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => fillDemo(d.email)}
              className="flex w-full items-center justify-between rounded-lg border border-edge bg-white px-3 py-2 text-left transition hover:border-burgundy-300 hover:shadow-card"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-rosewood">
                  {d.role}
                </span>
                <span className="block truncate text-xs text-charcoal">{d.email}</span>
              </span>
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-burgundy" />
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
