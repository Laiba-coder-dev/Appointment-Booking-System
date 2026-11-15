import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings, Save, Star, BadgeCheck, Camera, Loader2, AlertCircle,
  MapPin, Briefcase, GraduationCap, DollarSign, FileText, Sparkles,
  CheckCircle2, Eye, ArrowRight, ShieldCheck, Hash
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { useAuth } from '../../context/AuthContext';
import { PageIntro, Panel, StatCard, BusyOverlay, ConfirmDialog } from '../../components/ui/DashboardBits';
import { Spinner } from '../../components/ui/LoadingScreen';
import { StatusBadge, Stars } from '../../components/ui/Primitives';
import { formatDate, formatMoney, initials } from '../../utilities/format';
import toast from 'react-hot-toast';

const EMPTY = {
  headline: '', bio: '', specialization: '', experience_years: 0,
  hourly_rate: '', location: '', license_number: '', is_featured: 0
};

export default function ProviderProfilePage() {
  useDocumentTitle('Provider profile');
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [featuredDialog, setFeaturedDialog] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/provider/overview');
      const p = res.data?.data?.profile || null;
      setProfile(p);
      setMeta(res.data?.data || null);
      if (p) {
        setForm({
          headline: p.headline || '',
          bio: p.bio || '',
          specialization: p.specialization || '',
          experience_years: p.experience_years ?? 0,
          hourly_rate: p.hourly_rate ?? '',
          location: p.location || '',
          license_number: p.license_number || '',
          is_featured: Number(p.is_featured) || 0
        });
      }
    } catch (err) {
      setError(err.message || 'Could not load your provider profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.headline.trim().length > 180) next.headline = 'Keep the headline under 180 characters';
    if (form.bio.length > 2000) next.bio = 'Keep the bio under 2000 characters';
    if (form.specialization.trim().length > 150) next.specialization = 'Under 150 characters please';
    if (form.experience_years < 0 || form.experience_years > 60) next.experience_years = 'Enter 0–60 years';
    if (form.hourly_rate !== '' && (Number(form.hourly_rate) < 0 || Number(form.hourly_rate) > 9999)) {
      next.hourly_rate = 'Enter a valid hourly rate';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      await api.patch('/api/provider/profile', {
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        specialization: form.specialization.trim(),
        experience_years: Number(form.experience_years) || 0,
        hourly_rate: form.hourly_rate === '' ? '' : Number(form.hourly_rate),
        location: form.location.trim(),
        license_number: form.license_number.trim(),
        is_featured: Number(form.is_featured)
      });
      toast.success('Provider profile saved');
      await load();
      refreshUser?.();
    } catch (err) {
      toast.error(err.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 4 * 1024 * 1024) return toast.error('Image must be under 4 MB');
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.data?.url;
      if (url) {
        await api.put('/api/profile', { avatar_url: url });
        toast.success('Photo updated');
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

  const toggleFeatured = async () => {
    try {
      setSaving(true);
      await api.patch('/api/provider/profile', { is_featured: form.is_featured ? 0 : 1 });
      toast.success(form.is_featured ? 'Removed from featured list' : 'Marked as featured');
      setFeaturedDialog(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update featured status');
    } finally {
      setSaving(false);
    }
  };

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

  const completionFields = [form.headline, form.bio, form.specialization, form.location, form.license_number];
  const completion = completionFields.filter((v) => String(v || '').trim()).length;

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="Profile settings"
        description="Your public profile is what customers see before they book — make it count."
        actions={
          <Link to={`/professionals/${meta?.provider_id || ''}`} className="btn-secondary !py-2.5 text-sm">
            <Eye className="h-4 w-4" /> Preview public profile <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {/* ------------------------------ status strip ------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BadgeCheck} label="Approval status"
          value={statusLabelOf(profile?.approval_status)}
          sub={profile?.approval_status === 'approved'
            ? 'Visible and bookable'
            : profile?.approval_status === 'pending'
              ? 'Awaiting admin review'
              : 'Not currently listed'}
          tone={profile?.approval_status === 'approved' ? 'emerald' : 'amber'} />
        <StatCard icon={Star} label="Rating"
          value={profile?.rating_avg ? `${Number(profile.rating_avg).toFixed(1)} ★` : '—'}
          sub={`${profile?.review_count || 0} review${Number(profile?.review_count) === 1 ? '' : 's'}`}
          tone="gold" delay={0.06} />
        <StatCard icon={Briefcase} label="Services" value={meta?.services ?? '—'}
          sub={`${meta?.working_days ?? 0} working day${Number(meta?.working_days) === 1 ? '' : 's'} per week`} delay={0.12} />
        <StatCard icon={Sparkles} label="Featured" value={form.is_featured ? 'Yes' : 'No'}
          sub={form.is_featured ? 'Shown on the homepage' : 'Ask an admin to feature you'}
          tone="rosewood" delay={0.18} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* ------------------------------ edit form ------------------------------ */}
        <Panel title="Public profile" subtitle="Shown on your listing and booking pages">
          <form onSubmit={save} className="relative" noValidate>
            <BusyOverlay show={saving} label="Saving…" />

            {/* avatar row */}
            <div className="mb-6 flex flex-wrap items-center gap-5">
              <div className="relative">
                <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-burgundy-gradient font-display text-2xl text-ivory">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    : initials(profile?.name || user?.name || '')}
                </span>
                {uploading && (
                  <span className="absolute inset-0 grid place-items-center rounded-3xl bg-white/75">
                    <Loader2 className="h-5 w-5 animate-spin text-burgundy" />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg text-burgundy-800">{profile?.name}</p>
                <p className="text-sm text-muted">{profile?.email} · {profile?.phone || 'no phone'}</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar}
                  className="hidden" aria-label="Upload profile photo" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="btn-secondary mt-2.5 !py-2 text-xs">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading…' : 'Change photo'}
                </button>
              </div>
              <div className="ml-auto text-right">
                <p className="font-display text-3xl text-burgundy-800">
                  {Math.round((completion / completionFields.length) * 100)}%
                </p>
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted">Profile complete</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="pp-headline" className="field-label">Headline</label>
                <input id="pp-headline" value={form.headline} onChange={set('headline')} maxLength={180}
                  placeholder="Award-winning colourist with 12 years behind the chair"
                  className="field" aria-invalid={!!errors.headline} />
                <div className="mt-1.5 flex justify-between">
                  {errors.headline
                    ? <p className="field-error !mt-0"><AlertCircle className="h-3.5 w-3.5" /> {errors.headline}</p>
                    : <span />}
                  <span className="text-[11px] text-muted">{form.headline.length}/180</span>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="pp-spec" className="field-label">Specialization</label>
                  <input id="pp-spec" value={form.specialization} onChange={set('specialization')}
                    maxLength={150} placeholder="Hair colour & balayage" className="field"
                    aria-invalid={!!errors.specialization} />
                  {errors.specialization && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {errors.specialization}</p>}
                </div>
                <div>
                  <label htmlFor="pp-loc" className="field-label">Location</label>
                  <input id="pp-loc" value={form.location} onChange={set('location')}
                    placeholder="Boston, MA" className="field" />
                </div>
                <div>
                  <label htmlFor="pp-exp" className="field-label">Years of experience</label>
                  <input id="pp-exp" type="number" min={0} max={60} value={form.experience_years}
                    onChange={set('experience_years')} className="field"
                    aria-invalid={!!errors.experience_years} />
                  {errors.experience_years && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {errors.experience_years}</p>}
                </div>
                <div>
                  <label htmlFor="pp-rate" className="field-label">Hourly rate (USD) <span className="font-normal text-muted">(optional)</span></label>
                  <input id="pp-rate" type="number" min={0} step="0.01" value={form.hourly_rate}
                    onChange={set('hourly_rate')} placeholder="120" className="field"
                    aria-invalid={!!errors.hourly_rate} />
                  {errors.hourly_rate && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {errors.hourly_rate}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="pp-license" className="field-label">Licence / certification number <span className="font-normal text-muted">(optional)</span></label>
                <input id="pp-license" value={form.license_number} onChange={set('license_number')}
                  placeholder="e.g. MA-COS-123456" className="field" />
              </div>

              <div>
                <label htmlFor="pp-bio" className="field-label">Bio</label>
                <textarea id="pp-bio" rows={6} maxLength={2000} value={form.bio} onChange={set('bio')}
                  placeholder="Tell customers about your approach, training and what a session with you feels like…"
                  className="field resize-y" aria-invalid={!!errors.bio} />
                <div className="mt-1.5 flex justify-between">
                  {errors.bio
                    ? <p className="field-error !mt-0"><AlertCircle className="h-3.5 w-3.5" /> {errors.bio}</p>
                    : <span />}
                  <span className="text-[11px] text-muted">{form.bio.length}/2000</span>
                </div>
              </div>

              <button type="button"
                onClick={() => setFeaturedDialog(true)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
                  form.is_featured
                    ? 'border-gold/50 bg-gold-100/70'
                    : 'border-dashed border-edge bg-ivory/50 hover:border-gold/50'
                }`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${form.is_featured ? 'bg-gold text-white' : 'bg-white text-rosewood shadow-card'}`}>
                  <Sparkles className="h-4.5 w-4.5 h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-charcoal">Featured professional</span>
                  <span className="block text-xs text-muted">
                    Appears at the top of search results and on the homepage.
                  </span>
                </span>
                <StatusBadge status={form.is_featured ? 'approved' : 'rejected'}
                  label={form.is_featured ? 'On' : 'Off'} />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-edge pt-5">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                Save profile
              </button>
              <button type="button" onClick={load} disabled={saving} className="btn-ghost">Reset</button>
            </div>
          </form>
        </Panel>

        {/* ------------------------------ sidebar ------------------------------ */}
        <div className="space-y-6">
          <Panel title="How customers see you">
            <div className="rounded-2xl border border-edge bg-gradient-to-br from-ivory to-cream p-5">
              <div className="flex items-center gap-3.5">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-burgundy-gradient font-display text-lg text-ivory">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    : initials(profile?.name || '')}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-burgundy-800">{profile?.name}</p>
                  <p className="truncate text-xs text-rosewood">{form.specialization || 'Specialist'}</p>
                </div>
              </div>
              <p className="mt-3.5 text-sm font-semibold text-charcoal">
                {form.headline || 'Add a headline to stand out'}
              </p>
              <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-muted">
                {form.bio || 'Your bio appears here — share your approach and training.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-edge pt-3.5 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Stars value={profile?.rating_avg || 0} size={13} /></span>
                {form.experience_years > 0 && (
                  <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {form.experience_years} yrs</span>
                )}
                {form.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {form.location}</span>}
                {form.hourly_rate !== '' && (
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {formatMoney(form.hourly_rate)}/hr</span>
                )}
              </div>
              <Link to={`/professionals/${meta?.provider_id || ''}`}
                className="btn-secondary mt-4 w-full !py-2.5 text-xs">
                View full listing <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Panel>

          <div className="rounded-3xl border border-edge bg-white p-6 shadow-card">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-lg text-burgundy-800">Verification</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {profile?.approval_status === 'approved'
                ? 'Your credentials have been reviewed by our team. Keep your licence number current to stay verified.'
                : 'Our team reviews every provider before they go live. You can still edit your profile meanwhile.'}
            </p>
            <p className="mt-3 flex items-center gap-2 text-[12.5px] font-bold text-charcoal">
              <Hash className="h-4 w-4 text-rosewood" /> Provider #{meta?.provider_id}
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={featuredDialog}
        tone="info"
        title={form.is_featured ? 'Remove featured status?' : 'Request featured status?'}
        message={form.is_featured
          ? 'Your profile will return to its normal position in search results.'
          : 'Featured placement highlights your profile across the site. Some regions require admin approval before it goes live.'}
        confirmLabel={form.is_featured ? 'Remove featured' : 'Turn on featured'}
        cancelLabel="Keep as is"
        loading={saving}
        onConfirm={toggleFeatured}
        onCancel={() => setFeaturedDialog(false)}
      />
    </div>
  );
}

function statusLabelOf(s) {
  if (s === 'approved') return 'Approved';
  if (s === 'pending') return 'Pending';
  if (s === 'rejected') return 'Rejected';
  return 'Unknown';
}
