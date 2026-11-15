import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, MessageSquare, PenLine, X, CheckCircle2, AlertCircle, Send, CalendarCheck
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { PageIntro, Panel, Tabs, StateBlock } from '../../components/ui/DashboardBits';
import { Stars, StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatDate } from '../../utilities/format';
import toast from 'react-hot-toast';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          className="transition-transform duration-200 hover:scale-115"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.6l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.42l-5.8 3.04 1.1-6.46-4.69-4.58 6.49-.94L12 2.6z"
              fill={n <= value ? '#C9A96A' : '#E9DDD7'}
              stroke={n <= value ? '#C9A96A' : '#E9DDD7'}
              strokeWidth="1"
            />
          </svg>
        </button>
      ))}
      <span className="ml-2 text-sm font-bold text-charcoal">
        {value ? `${value}/5` : 'Not rated'}
      </span>
    </div>
  );
}

export default function CustomerReviewsPage() {
  useDocumentTitle('Your reviews');

  const [tab, setTab] = useState('mine');
  const [reviews, setReviews] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [composer, setComposer] = useState(null); // appointment row
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [mine, done] = await Promise.all([
        api.get('/api/reviews/mine'),
        api.get('/api/appointments?status=completed&limit=50')
      ]);
      setReviews(mine.data?.data?.reviews || []);
      const rows = done.data?.data?.appointments || [];
      setEligible(rows.filter((a) => !a.review_id));
    } catch (err) {
      setError(err.message || 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openComposer = (appt) => {
    setComposer(appt);
    setRating(5);
    setComment('');
    setFormError(null);
  };

  const submit = async () => {
    if (!composer) return;
    if (!rating || rating < 1) {
      setFormError('Please choose a star rating');
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      await api.post('/api/reviews', {
        appointment_id: composer.id,
        rating,
        comment: comment.trim() || undefined
      });
      toast.success('Thanks — your review is live');
      setComposer(null);
      load();
      setTab('mine');
    } catch (err) {
      setFormError(err.message || 'Could not submit your review');
    } finally {
      setSaving(false);
    }
  };

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length)
    : 0;

  return (
    <div>
      <PageIntro
        eyebrow="Feedback"
        title="Your reviews"
        description="Share how your visits went — reviews help other customers and keep our professionals accountable."
        actions={
          eligible.length > 0 && (
            <button onClick={() => { setTab('write'); }} className="btn-primary !py-2.5 text-sm">
              <PenLine className="h-4 w-4" /> Write a review ({eligible.length})
            </button>
          )
        }
      />

      <Tabs
        tabs={[
          { value: 'mine', label: 'Published', count: reviews.length },
          { value: 'write', label: 'Ready to review', count: eligible.length }
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6 max-w-md"
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={4}>
        {tab === 'mine' ? (
          reviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="You haven't reviewed anyone yet"
              description="Once an appointment is marked complete you can leave feedback from here."
              action={
                <button onClick={() => setTab('write')} className="btn-primary btn-sm" disabled={eligible.length === 0}>
                  {eligible.length > 0 ? 'Review a visit' : 'No completed visits yet'}
                </button>
              }
            />
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-5 rounded-2xl border border-edge bg-white px-5 py-4 shadow-card">
                <div>
                  <p className="font-display text-3xl text-burgundy-800">{avg.toFixed(1)}</p>
                  <Stars value={avg} size={15} />
                </div>
                <div className="h-10 w-px bg-edge" />
                <div>
                  <p className="font-display text-3xl text-burgundy-800">{reviews.length}</p>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Reviews written</p>
                </div>
                <p className="ml-auto max-w-xs text-xs leading-relaxed text-muted">
                  Your average rating across every appointment you've completed.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {reviews.map((r, i) => (
                  <motion.article
                    key={r.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col rounded-[26px] border border-edge bg-white p-6 shadow-card transition-all duration-400 hover:-translate-y-1 hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg text-burgundy-800">{r.service_name}</p>
                        <p className="truncate text-xs text-muted">with {r.provider_name}</p>
                      </div>
                      <Stars value={r.rating} size={15} />
                    </div>

                    <p className="mt-4 flex-1 text-sm leading-relaxed text-charcoal">
                      {r.comment || <span className="italic text-muted">No written comment — just the rating.</span>}
                    </p>

                    {r.response && (
                      <div className="mt-4 rounded-2xl border border-edge bg-ivory/70 p-4">
                        <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-rosewood">
                          {r.provider_name} replied
                        </p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-charcoal">{r.response}</p>
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-edge pt-4">
                      <span className="text-[11.5px] text-muted">
                        {formatDate(r.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className={`badge border ${r.is_visible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-edge bg-ivory text-muted'}`}>
                        {r.is_visible ? <CheckCircle2 className="h-3 w-3" /> : null}
                        {r.is_visible ? 'Published' : 'Pending'}
                      </span>
                    </div>
                  </motion.article>
                ))}
              </div>
            </>
          )
        ) : (
          /* ---------------- write tab ---------------- */
          eligible.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="Nothing to review right now"
              description="Completed appointments appear here as soon as your professional marks them done."
              action={<Link to="/dashboard/appointments" className="btn-secondary btn-sm">View appointments</Link>}
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {eligible.map((a, i) => (
                <motion.article
                  key={a.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.3) }}
                  className="rounded-[26px] border border-edge bg-white p-6 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg text-burgundy-800">{a.service_name}</p>
                      <p className="truncate text-xs text-muted">with {a.provider_name}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    {formatDate(a.start_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <button onClick={() => openComposer(a)} className="btn-primary mt-5 w-full !py-3">
                    <Star className="h-4 w-4" /> Review this visit
                  </button>
                </motion.article>
              ))}
            </div>
          )
        )}
      </StateBlock>

      {/* ============================ composer ============================ */}
      <AnimatePresence>
        {composer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setComposer(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">Write a review</p>
                    <h3 id="review-title" className="mt-1 font-display text-xl">{composer.service_name}</h3>
                    <p className="mt-0.5 text-xs text-ivory/65">with {composer.provider_name}</p>
                  </div>
                  <button onClick={() => !saving && setComposer(null)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="px-6 py-5">
                {formError && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-burgundy-100 bg-burgundy-50 px-4 py-3 text-[13px] text-burgundy-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
                  </div>
                )}

                <p className="field-label">How was it?</p>
                <StarPicker value={rating} onChange={setRating} />

                <label htmlFor="review-comment" className="field-label mt-5">
                  Written review <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id="review-comment"
                  rows={5}
                  maxLength={2000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you like? Anything we could improve?"
                  className="field resize-y"
                />
                <p className="mt-1 text-right text-[11px] text-muted">{comment.length}/2000</p>

                <div className="mt-5 flex gap-2.5">
                  <button onClick={submit} disabled={saving} className="btn-primary flex-1 !py-3">
                    {saving ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {saving ? 'Publishing…' : 'Publish review'}
                  </button>
                  <button onClick={() => setComposer(null)} disabled={saving} className="btn-secondary !py-3">
                    Cancel
                  </button>
                </div>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
                  <MessageSquare className="h-3.5 w-3.5 text-rosewood" />
                  Your review is public and attributed to your first name.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
