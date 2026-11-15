import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Mail, MapPin, Camera, Save, Lock, ShieldCheck,
  AlertCircle, CheckCircle2, CalendarDays, Loader2, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { useAuth } from '../../context/AuthContext';
import { PageIntro, Panel, StatCard, BusyOverlay } from '../../components/ui/DashboardBits';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatDate, initials, statusLabel } from '../../utilities/format';
import toast from 'react-hot-toast';

const EMPTY = {
  name: '', phone: '', avatar_url: '', date_of_birth: '', gender: '',
  address: '', city: '', country: '', notes: ''
};

export default function CustomerProfilePage() {
  useDocumentTitle('Profile settings');
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/profile');
      const p = res.data?.data?.profile || null;
      setProfile(p);
      if (p) {
        setForm({
          name: p.name || '',
          phone: p.phone || '',
          avatar_url: p.avatar_url || '',
          date_of_birth: p.date_of_birth ? String(p.date_of_birth).slice(0, 10) : '',
          gender: p.gender || '',
          address: p.address || '',
          city: p.city || '',
          country: p.country || '',
          notes: p.notes || ''
        });
      }
    } catch (err) {
      setError(err.message || 'Could not load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name';
    if (form.phone && !/^[+\d\s().-]{7,20}$/.test(form.phone)) next.phone = 'Enter a valid phone number';
    if (form.date_of_birth && new Date(form.date_of_birth) > new Date()) next.date_of_birth = 'Date of birth cannot be in the future';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      await api.put('/api/profile', {
        ...form,
        date_of_birth: form.date_of_birth || undefined
      });
      toast.success('Profile saved');
      await load();
      refreshUser?.();
    } catch (err) {
      const details = err.details;
      if (Array.isArray(details) && details.length) {
        setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      }
      toast.error(err.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const next = {};
    if (!pw.currentPassword) next.currentPassword = 'Enter your current password';
    if (pw.newPassword.length < 8) next.newPassword = 'Must be at least 8 characters';
    else if (!/[A-Za-z]/.test(pw.newPassword) || !/[0-9]/.test(pw.newPassword)) {
      next.newPassword = 'Include at least one letter and one number';
    }
    if (pw.newPassword !== pw.confirm) next.confirm = 'Passwords do not match';
    if (pw.currentPassword && pw.currentPassword === pw.newPassword) {
      next.newPassword = 'New password must differ from the current one';
    }
    setPwErrors(next);
    if (Object.keys(next).length) return;

    try {
      setPwSaving(true);
      await api.put('/api/profile/password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword
      });
      toast.success('Password updated');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwErrors({});
    } catch (err) {
      const details = err.details;
      if (Array.isArray(details) && details.length) {
        setPwErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      } else {
        setPwErrors({ currentPassword: err.message || 'Could not change password' });
      }
    } finally {
      setPwSaving(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4 MB');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.data?.url;
      if (url) {
        setForm((f) => ({ ...f, avatar_url: url }));
        await api.put('/api/profile', { avatar_url: url });
        toast.success('Profile photo updated');
        refreshUser?.();
        load();
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const field = (key, label, type = 'text', placeholder = '', span = '') => (
    <div className={span}>
      <label htmlFor={`pf-${key}`} className="field-label">{label}</label>
      <input
        id={`pf-${key}`}
        type={type}
        value={form[key] || ''}
        onChange={set(key)}
        placeholder={placeholder}
        aria-invalid={!!errors[key]}
        className="field"
      />
      {errors[key] && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {errors[key]}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center py-24">
        <Spinner className="h-7 w-7 text-burgundy" />
        <p className="mt-3 text-sm text-muted">Loading your profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-burgundy-100 bg-burgundy-50/50 px-6 py-16 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-burgundy" />
        <p className="font-display text-lg text-burgundy-800">We couldn't load your profile</p>
        <p className="mt-1.5 text-sm text-muted">{error}</p>
        <button onClick={load} className="btn-primary mt-5">Try again</button>
      </div>
    );
  }

  return (
    <div>
      <PageIntro
        eyebrow="Account"
        title="Profile settings"
        description="Keep your contact details current so confirmations and reminders reach you."
      />

      {/* ------------------------------ account card ------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={User} label="Account type" value={statusLabel(profile?.role || user?.role)}
          sub="Customer account" />
        <StatCard icon={CalendarDays} label="Member since"
          value={formatDate(profile?.created_at, { month: 'short', year: 'numeric' })}
          sub={`Last sign-in ${profile?.last_login_at ? formatDate(profile.last_login_at, { month: 'short', day: 'numeric' }) : '—'}`}
          tone="rosewood" delay={0.06} />
        <StatCard icon={Mail} label="Email verified" value={profile?.email ? 'Yes' : 'No'}
          sub={profile?.email} tone="emerald" delay={0.12} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* ------------------------------ details ------------------------------ */}
        <Panel title="Personal details" subtitle="Used on bookings and confirmation emails">
          <form onSubmit={save} className="relative" noValidate>
            <BusyOverlay show={saving} label="Saving…" />

            {/* avatar */}
            <div className="mb-6 flex flex-wrap items-center gap-5">
              <div className="relative">
                <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-burgundy-gradient font-display text-2xl text-ivory">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(form.name || user?.name || '')
                  )}
                </span>
                {uploading && (
                  <span className="absolute inset-0 grid place-items-center rounded-3xl bg-white/75">
                    <Loader2 className="h-5 w-5 animate-spin text-burgundy" />
                  </span>
                )}
              </div>
              <div>
                <p className="font-display text-lg text-burgundy-800">{form.name || 'Your name'}</p>
                <p className="text-sm text-muted">{profile?.email}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="hidden"
                  aria-label="Upload profile photo"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary mt-2.5 !py-2 text-xs"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading…' : 'Change photo'}
                </button>
                <p className="mt-1.5 text-[11px] text-muted">JPG or PNG, up to 4 MB</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {field('name', 'Full name *', 'text', 'Sofia Bennett')}
              <div>
                <label htmlFor="pf-email" className="field-label">Email address</label>
                <input id="pf-email" type="email" value={profile?.email || ''} disabled
                  className="field cursor-not-allowed opacity-70" aria-describedby="email-hint" />
                <p id="email-hint" className="mt-1.5 text-[11.5px] text-muted">
                  Email changes require support — contact us to migrate your account.
                </p>
              </div>
              {field('phone', 'Phone', 'tel', '+1 (555) 010-2030')}
              {field('date_of_birth', 'Date of birth', 'date')}
              <div>
                <label htmlFor="pf-gender" className="field-label">Gender</label>
                <select id="pf-gender" value={form.gender} onChange={set('gender')} className="field">
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              {field('city', 'City', 'text', 'Boston')}
              {field('country', 'Country', 'text', 'United States')}
              <div className="sm:col-span-2">
                <label htmlFor="pf-address" className="field-label">Address</label>
                <input id="pf-address" value={form.address} onChange={set('address')}
                  placeholder="Street, apartment, zip" className="field" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pf-notes" className="field-label">Notes for professionals</label>
                <textarea id="pf-notes" rows={3} maxLength={2000} value={form.notes} onChange={set('notes')}
                  placeholder="Allergies, mobility needs, preferred parking…"
                  className="field resize-y" />
                <p className="mt-1 text-right text-[11px] text-muted">{(form.notes || '').length}/2000</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-edge pt-5">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                Save changes
              </button>
              <button type="button" onClick={load} disabled={saving} className="btn-ghost">
                Reset
              </button>
            </div>
          </form>
        </Panel>

        {/* ------------------------------ right column ------------------------------ */}
        <div className="space-y-6">
          <Panel title="Change password" subtitle="At least 8 characters, one letter and one number">
            <form onSubmit={changePassword} className="relative space-y-4" noValidate>
              <BusyOverlay show={pwSaving} label="Updating…" />

              <div>
                <label htmlFor="pw-current" className="field-label">Current password *</label>
                <input id="pw-current" type="password" autoComplete="current-password"
                  value={pw.currentPassword}
                  onChange={(e) => { setPw((p) => ({ ...p, currentPassword: e.target.value })); setPwErrors((p) => ({ ...p, currentPassword: undefined })); }}
                  className="field" aria-invalid={!!pwErrors.currentPassword} />
                {pwErrors.currentPassword && (
                  <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {pwErrors.currentPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="pw-new" className="field-label">New password *</label>
                <input id="pw-new" type="password" autoComplete="new-password"
                  value={pw.newPassword}
                  onChange={(e) => { setPw((p) => ({ ...p, newPassword: e.target.value })); setPwErrors((p) => ({ ...p, newPassword: undefined })); }}
                  className="field" aria-invalid={!!pwErrors.newPassword} />
                {pwErrors.newPassword && (
                  <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {pwErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="pw-confirm" className="field-label">Confirm new password *</label>
                <input id="pw-confirm" type="password" autoComplete="new-password"
                  value={pw.confirm}
                  onChange={(e) => { setPw((p) => ({ ...p, confirm: e.target.value })); setPwErrors((p) => ({ ...p, confirm: undefined })); }}
                  className="field" aria-invalid={!!pwErrors.confirm} />
                {pwErrors.confirm && (
                  <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {pwErrors.confirm}</p>
                )}
              </div>

              <button type="submit" disabled={pwSaving} className="btn-primary w-full !py-3">
                {pwSaving ? <Spinner className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Update password
              </button>
            </form>
          </Panel>

          <div className="rounded-3xl border border-edge bg-white p-6 shadow-card">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-lg text-burgundy-800">Your data stays yours</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              We use your details only for bookings and reminders. Passwords are stored with bcrypt,
              sessions use signed JWTs, and we never sell personal information.
            </p>
            <p className="mt-3 flex items-center gap-2 text-[12.5px] font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Encrypted &amp; access-controlled
            </p>
          </div>

          <div className="rounded-3xl border border-edge bg-ivory/70 p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-rosewood shadow-card">
              <MapPin className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-lg text-burgundy-800">Need to migrate your account?</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Changing the email on file or deleting your account is handled by our team to keep
              bookings intact.
            </p>
            <Link to="/contact" className="btn-secondary mt-4 !py-2.5 text-xs">
              Contact support <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
