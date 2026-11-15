import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, MessageSquare, Reply, X, Send, AlertCircle, CheckCircle2,
  Users, TrendingUp, Award
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import { PageIntro, Panel, StateBlock, StatCard, Tabs, BusyOverlay } from '../../components/ui/DashboardBits';
import { Stars, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatDate, initials } from '../../utilities/format';
import toast from 'react-hot-toast';

export default function ProviderReviewsPage() {
  useDocumentTitle('Reviews');

  const [providerId, setProviderId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState('all');
  const [replyTarget, setReplyTarget] = useState(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const ov = await api.get('/api/provider/overview');
      const pid = ov.data?.data?.provider_id;
      setProviderId(pid);
      if (!pid) throw new Error('Provider profile not found');
      const res = await api.get(`/api/providers/${pid}/reviews`);
      setReviews(res.data?.data?.reviews || []);
      setStats(res.data?.data?.stats || null);
    } catch (err) {
      setError(err.message || 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openReply = (r) => {
    setReplyTarget(r);
    setReply(r.response || '');
    setReplyError(null);
  };

  const submitReply = async () => {
    if (!replyTarget) return;
    if (reply.trim().length < 3) {
      setReplyError('Write at least a few words before publishing');
      return;
    }
    try {
      setSaving(true);
      setReplyError(null);
      await api.post(`/api/reviews/${replyTarget.id}/response`, { response: reply.trim() });
      toast.success('Response published');
      setReplyTarget(null);
      load();
    } catch (err) {
      setReplyError(err.message || 'Could not publish your response');
    } finally {
      setSaving(false);
    }
  };

  const visible = reviews.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'replied') return !!r.response;
    if (filter === 'unreplied') return !r.response;
    if (filter === 'low') return Number(r.rating) <= 3;
    return true;
  });

  const count = Number(stats?.count) || 0;
  const avg = Number(stats?.avg) || 0;
  const distribution = [
    { stars: 5, n: Number(stats?.five) || 0 },
    { stars: 4, n: Number(stats?.four) || 0 },
    { stars: 3, n: Number(stats?.three) || 0 },
    { stars: 2, n: Number(stats?.two) || 0 },
    { stars: 1, n: Number(stats?.one) || 0 }
  ];
  const unreplied = reviews.filter((r) => !r.response).length;

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="Reviews"
        description="Customer feedback on your work — respond publicly to show you're listening."
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={5}>
        <>
          {/* ------------------------------ rating summary ------------------------------ */}
          <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
            <div className="rounded-3xl border border-edge bg-white p-6 shadow-card">
              <div className="flex items-end gap-4">
                <div>
                  <p className="font-display text-5xl leading-none text-burgundy-800">
                    {count ? avg.toFixed(1) : '—'}
                  </p>
                  <div className="mt-2"><Stars value={avg} size={16} /></div>
                  <p className="mt-1.5 text-xs text-muted">{count} review{count === 1 ? '' : 's'}</p>
                </div>
                <span className="ml-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-100 text-gold-700">
                  <Award className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-5 space-y-2">
                {distribution.map((d) => {
                  const pct = count ? Math.round((d.n / count) * 100) : 0;
                  return (
                    <div key={d.stars} className="flex items-center gap-2.5">
                      <span className="w-6 text-right text-[11px] font-bold text-muted">{d.stars}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                        <motion.div
                          className="h-full rounded-full bg-gold"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: (5 - d.stars) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] font-semibold text-charcoal">{d.n}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Users} label="Total reviews" value={count}
                sub="All-time visible reviews" />
              <StatCard icon={TrendingUp} label="Average score" value={avg ? avg.toFixed(2) : '—'}
                sub="Out of 5.00" tone="gold" delay={0.06} />
              <StatCard icon={MessageSquare} label="Awaiting reply" value={unreplied}
                sub={unreplied ? 'Respond to build trust' : 'All caught up'}
                tone={unreplied ? 'amber' : 'emerald'} delay={0.12} />
            </div>
          </div>

          {/* ------------------------------ filters ------------------------------ */}
          <div className="mt-6">
            <Tabs
              tabs={[
                { value: 'all', label: 'All', count: reviews.length },
                { value: 'unreplied', label: 'Needs reply', count: unreplied },
                { value: 'replied', label: 'Replied', count: reviews.length - unreplied },
                { value: 'low', label: '3★ & below', count: reviews.filter((r) => Number(r.rating) <= 3).length }
              ]}
              value={filter}
              onChange={setFilter}
              className="max-w-xl"
            />
          </div>

          {/* ------------------------------ list ------------------------------ */}
          <Panel flush className="mt-5">
            <StateBlock
              loading={false}
              empty={visible.length === 0}
              emptyIcon={Star}
              emptyTitle={reviews.length === 0 ? 'No reviews yet' : 'Nothing matches this filter'}
              emptyDescription={reviews.length === 0
                ? 'After customers complete a booking they can leave feedback — it will show up here.'
                : 'Try another tab to see more reviews.'}
            >
              <ul className="divide-y divide-edge/70">
                {visible.map((r, i) => (
                  <motion.li
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
                    className="px-5 py-5 sm:px-6"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-burgundy-50 font-display text-sm text-burgundy">
                        {r.avatar_url
                          ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                          : initials(r.customer_name)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="font-semibold text-charcoal">{r.customer_name}</p>
                          <Stars value={r.rating} size={14} />
                          {Number(r.rating) <= 3 && (
                            <span className="badge border border-amber-200 bg-amber-50 text-amber-700">Needs attention</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {r.service_name} · {formatDate(r.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>

                        <p className="mt-3 text-sm leading-relaxed text-charcoal">
                          {r.comment || <span className="italic text-muted">Rating only — no written comment.</span>}
                        </p>

                        {r.response ? (
                          <div className="mt-4 rounded-2xl border border-edge bg-ivory/70 p-4">
                            <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-wider text-rosewood">
                              <Reply className="h-3 w-3" /> Your response
                            </p>
                            <p className="mt-1.5 text-[13.5px] leading-relaxed text-charcoal">{r.response}</p>
                          </div>
                        ) : (
                          <div className="mt-4 flex items-center gap-3">
                            <button onClick={() => openReply(r)} className="btn-primary !py-2.5 text-xs">
                              <Reply className="h-3.5 w-3.5" /> Respond publicly
                            </button>
                            <span className="text-[11.5px] text-muted">Replies appear on your public listing</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </StateBlock>
          </Panel>
        </>
      </StateBlock>

      {!loading && !error && reviews.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Reviews start rolling in once customers complete their appointments."
          />
        </div>
      )}

      {/* ============================ reply composer ============================ */}
      <AnimatePresence>
        {replyTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setReplyTarget(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="reply-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">Public response</p>
                    <h3 id="reply-title" className="mt-1 font-display text-xl">Reply to {replyTarget.customer_name}</h3>
                  </div>
                  <button onClick={() => !saving && setReplyTarget(null)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="relative px-6 py-5">
                <BusyOverlay show={saving} label="Publishing…" />

                <div className="rounded-2xl border border-edge bg-ivory/60 p-4">
                  <div className="flex items-center gap-2.5">
                    <p className="text-sm font-bold text-charcoal">{replyTarget.customer_name}</p>
                    <Stars value={replyTarget.rating} size={13} />
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    {replyTarget.comment || 'Rating only — no written comment.'}
                  </p>
                </div>

                {replyError && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-burgundy-100 bg-burgundy-50 px-4 py-3 text-[13px] text-burgundy-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {replyError}
                  </div>
                )}

                <label htmlFor="reply-text" className="field-label mt-4">Your response</label>
                <textarea
                  id="reply-text" rows={5} maxLength={1000} value={reply}
                  onChange={(e) => { setReply(e.target.value); setReplyError(null); }}
                  placeholder="Thank them, add context, or explain how you'll improve — keep it professional and kind."
                  className="field resize-y"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Visible on your public listing
                  </span>
                  <span className="text-[11px] text-muted">{reply.length}/1000</span>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button onClick={() => setReplyTarget(null)} disabled={saving} className="btn-secondary">Cancel</button>
                  <button onClick={submitReply} disabled={saving} className="btn-primary px-6 py-3 text-sm">
                    {saving ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    Publish response
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
