import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Plus, Trash2, X, CalendarOff, CalendarDays, CheckCircle2,
  AlertCircle, Eye, Ban, Grid3x3, Timer
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle } from '../../hooks/useUtility';
import {
  PageIntro, Panel, StateBlock, ConfirmDialog, StatCard, BusyOverlay
} from '../../components/ui/DashboardBits';
import { EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { DAY_NAMES, DAY_SHORT } from '../../utilities/format';
import toast from 'react-hot-toast';

const EMPTY_HOURS = { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_interval_min: 60, is_active: 1 };
const EMPTY_BLOCK = { unavailable_date: '', reason: '' };

const todayKey = () => new Date().toISOString().slice(0, 10);

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':');
  const hour = Number(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m || '00'} ${ampm}`;
}

export default function ProviderAvailabilityPage() {
  useDocumentTitle('Availability');

  const [availability, setAvailability] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [hoursEditor, setHoursEditor] = useState(false);
  const [hours, setHours] = useState(EMPTY_HOURS);
  const [hoursError, setHoursError] = useState(null);
  const [savingHours, setSavingHours] = useState(false);

  const [blockEditor, setBlockEditor] = useState(false);
  const [block, setBlock] = useState(EMPTY_BLOCK);
  const [blockError, setBlockError] = useState(null);
  const [savingBlock, setSavingBlock] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, row }
  const [busy, setBusy] = useState(false);

  const [previewDate, setPreviewDate] = useState(todayKey());
  const [previewDuration, setPreviewDuration] = useState(60);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/provider/availability');
      setAvailability(res.data?.data?.availability || []);
      setBlocked(res.data?.data?.blocked_dates || []);
    } catch (err) {
      setError(err.message || 'Could not load availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPreview = useCallback(async () => {
    try {
      setPreviewLoading(true);
      const res = await api.get(`/api/provider/slots?date=${previewDate}&duration=${previewDuration}`);
      setPreview(res.data?.data || null);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [previewDate, previewDuration]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  /* ---------------- hours CRUD ---------------- */
  const saveHours = async (e) => {
    e.preventDefault();
    if (hours.start_time >= hours.end_time) {
      setHoursError('End time must be after start time');
      return;
    }
    if (!hours.slot_interval_min || hours.slot_interval_min < 10) {
      setHoursError('Slot interval must be at least 10 minutes');
      return;
    }
    try {
      setSavingHours(true);
      setHoursError(null);
      await api.post('/api/provider/availability', {
        day_of_week: Number(hours.day_of_week),
        start_time: hours.start_time,
        end_time: hours.end_time,
        slot_interval_min: Number(hours.slot_interval_min),
        is_active: Number(hours.is_active)
      });
      toast.success(`${DAY_NAMES[hours.day_of_week]} hours saved`);
      setHoursEditor(false);
      setHours(EMPTY_HOURS);
      load();
    } catch (err) {
      setHoursError(err.message || 'Could not save these hours');
    } finally {
      setSavingHours(false);
    }
  };

  /* ---------------- block dates ---------------- */
  const saveBlock = async (e) => {
    e.preventDefault();
    if (!block.unavailable_date) {
      setBlockError('Pick a date');
      return;
    }
    if (block.unavailable_date < todayKey()) {
      setBlockError('Choose a date from today onwards');
      return;
    }
    try {
      setSavingBlock(true);
      setBlockError(null);
      await api.post('/api/provider/block-dates', {
        unavailable_date: block.unavailable_date,
        reason: block.reason.trim() || undefined
      });
      toast.success('Date blocked — customers can no longer book it');
      setBlockEditor(false);
      setBlock(EMPTY_BLOCK);
      load();
    } catch (err) {
      setBlockError(err.message || 'Could not block this date');
    } finally {
      setSavingBlock(false);
    }
  };

  const removeTarget = async () => {
    if (!deleteTarget) return;
    try {
      setBusy(true);
      if (deleteTarget.kind === 'hours') {
        await api.delete(`/api/provider/availability/${deleteTarget.row.id}`);
        toast.success('Working hours deleted');
      } else {
        await api.delete(`/api/provider/block-dates/${deleteTarget.row.id}`);
        toast.success('Date unblocked');
      }
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not complete that action');
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const workingDays = availability.filter((a) => a.is_active).length;
  const grouped = [...availability].sort((a, b) => a.day_of_week - b.day_of_week);

  const hoursField = (key, label, type = 'time') => (
    <div>
      <label htmlFor={`av-${key}`} className="field-label">{label}</label>
      <input id={`av-${key}`} type={type} value={hours[key]}
        onChange={(e) => { setHours((h) => ({ ...h, [key]: e.target.value })); setHoursError(null); }}
        className="field" />
    </div>
  );

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="Availability"
        description="Set the hours customers can book, block days off, and preview exactly what they'll see."
        actions={
          <>
            <button onClick={() => { setBlock(EMPTY_BLOCK); setBlockEditor(true); }} className="btn-secondary !py-2.5 text-sm">
              <CalendarOff className="h-4 w-4" /> Block a date
            </button>
            <button onClick={() => { setHours(EMPTY_HOURS); setHoursEditor(true); }} className="btn-primary !py-2.5 text-sm">
              <Plus className="h-4 w-4" /> Add working hours
            </button>
          </>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={4}>
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Clock} label="Working days" value={workingDays}
              sub="Active per week" />
            <StatCard icon={CalendarOff} label="Blocked dates" value={blocked.length}
              sub="Upcoming time off" tone="rosewood" delay={0.06} />
            <StatCard icon={Grid3x3} label="Slot interval" value={availability[0] ? `${availability[0].slot_interval_min}m` : '—'}
              sub="Default booking granularity" tone="gold" delay={0.12} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            {/* ---------------- weekly hours ---------------- */}
            <Panel
              title="Weekly working hours"
              subtitle="Customers only see slots inside these windows"
              action={
                <button onClick={() => { setHours(EMPTY_HOURS); setHoursEditor(true); }} className="btn-ghost !py-2 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add day
                </button>
              }
              flush
            >
              <StateBlock
                loading={false}
                empty={grouped.length === 0}
                emptyIcon={Clock}
                emptyTitle="No working hours yet"
                emptyDescription="Add your first day so customers can book you."
              >
                <ul className="divide-y divide-edge/70">
                  {grouped.map((row, i) => (
                    <motion.li
                      key={row.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.25) }}
                      className={`flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6 ${row.is_active ? '' : 'opacity-55'}`}
                    >
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xs font-extrabold ${
                        row.is_active ? 'bg-burgundy text-ivory' : 'bg-cream text-muted'
                      }`}>
                        {DAY_SHORT[row.day_of_week]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base text-burgundy-800">{DAY_NAMES[row.day_of_week]}</p>
                        <p className="text-xs text-muted">
                          {fmtTime(row.start_time)} – {fmtTime(row.end_time)} · slots every {row.slot_interval_min} min
                        </p>
                      </div>
                      {row.is_active
                        ? <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700">Active</span>
                        : <span className="badge border border-edge bg-cream text-muted">Paused</span>}
                      <div className="flex gap-2">
                        <button onClick={() => { setHours({
                          day_of_week: row.day_of_week, start_time: String(row.start_time).slice(0, 5),
                          end_time: String(row.end_time).slice(0, 5), slot_interval_min: row.slot_interval_min, is_active: row.is_active
                        }); setHoursEditor(true); }}
                          aria-label={`Edit ${DAY_NAMES[row.day_of_week]}`}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-burgundy transition hover:border-burgundy">
                          <Clock className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget({ kind: 'hours', row })}
                          aria-label={`Delete ${DAY_NAMES[row.day_of_week]}`}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </StateBlock>
            </Panel>

            <div className="space-y-6">
              {/* ---------------- blocked dates ---------------- */}
              <Panel
                title="Blocked dates"
                subtitle="Holidays, leave, personal time"
                flush
              >
                <StateBlock
                  loading={false}
                  empty={blocked.length === 0}
                  emptyIcon={CalendarDays}
                  emptyTitle="No dates blocked"
                  emptyDescription="You're bookable on every working day."
                >
                  <ul className="divide-y divide-edge/70">
                    {blocked.map((b) => (
                      <li key={b.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rosewood/10 text-rosewood">
                          <Ban className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-charcoal">
                            {new Date(`${b.unavailable_date}T12:00:00Z`).toLocaleDateString(undefined, {
                              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                            })}
                          </p>
                          {b.reason && <p className="truncate text-xs text-muted">{b.reason}</p>}
                        </div>
                        <button onClick={() => setDeleteTarget({ kind: 'block', row: b })}
                          aria-label="Unblock this date"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </StateBlock>
                <div className="border-t border-edge bg-ivory/60 px-5 py-3.5 sm:px-6">
                  <button onClick={() => { setBlock(EMPTY_BLOCK); setBlockEditor(true); }}
                    className="btn-secondary w-full !py-2.5 text-xs">
                    <CalendarOff className="h-3.5 w-3.5" /> Block another date
                  </button>
                </div>
              </Panel>
            </div>
          </div>

          {/* ---------------- slot preview ---------------- */}
          <Panel
            className="mt-6"
            title="Customer slot preview"
            subtitle="Exactly what customers see for a given day"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={previewDate} min={todayKey()} aria-label="Preview date"
                  onChange={(e) => setPreviewDate(e.target.value)}
                  className="field !w-auto !py-2 !text-[13px]" />
                <select value={previewDuration} aria-label="Service duration"
                  onChange={(e) => setPreviewDuration(Number(e.target.value))}
                  className="field !w-auto !py-2 !text-[13px]">
                  {[30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            }
          >
            {previewLoading ? (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7">
                {[...Array(14)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-cream" />
                ))}
              </div>
            ) : preview ? (
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`badge border ${preview.blocked ? 'border-rosewood/30 bg-rosewood/10 text-rosewood' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    {preview.blocked ? <Ban className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {preview.reason}
                  </span>
                  <span className="text-xs text-muted">
                    {preview.slots?.length || 0} slot{(preview.slots?.length || 0) === 1 ? '' : 's'} available
                  </span>
                </div>

                {preview.slots?.length ? (
                  <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7">
                    {preview.slots.map((s) => (
                      <div key={s.time}
                        className={`rounded-xl border px-2 py-2.5 text-center text-[13px] font-bold ${
                          s.available
                            ? 'border-edge bg-white text-charcoal'
                            : 'border-edge bg-cream text-muted/60 line-through'
                        }`}>
                        {String(s.time).slice(0, 5)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-edge bg-ivory/60 px-6 py-8 text-center">
                    <Clock className="mx-auto mb-2 h-6 w-6 text-rosewood" />
                    <p className="text-sm font-bold text-charcoal">No slots on this date</p>
                    <p className="mt-1 text-xs text-muted">{preview.reason}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Pick a date to preview slots.</p>
            )}
          </Panel>
        </>
      </StateBlock>

      {availability.length === 0 && !loading && !error && (
        <div className="mt-6">
          <EmptyState
            icon={Clock}
            title="Set your first working day"
            description="Without working hours customers can see your profile but can't book you."
            action={<button onClick={() => { setHours(EMPTY_HOURS); setHoursEditor(true); }} className="btn-primary btn-sm">Add working hours</button>}
          />
        </div>
      )}

      {/* ============================ hours editor ============================ */}
      <AnimatePresence>
        {hoursEditor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !savingHours) setHoursEditor(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="hours-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">Working hours</p>
                    <h3 id="hours-title" className="mt-1 font-display text-xl">Add or update a day</h3>
                  </div>
                  <button onClick={() => !savingHours && setHoursEditor(false)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <form onSubmit={saveHours} className="relative px-6 py-5" noValidate>
                <BusyOverlay show={savingHours} label="Saving…" />
                {hoursError && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-burgundy-100 bg-burgundy-50 px-4 py-3 text-[13px] text-burgundy-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {hoursError}
                  </div>
                )}

                <div>
                  <label htmlFor="av-day" className="field-label">Day of week</label>
                  <select id="av-day" value={hours.day_of_week}
                    onChange={(e) => setHours((h) => ({ ...h, day_of_week: Number(e.target.value) }))}
                    className="field">
                    {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {hoursField('start_time', 'From')}
                  {hoursField('end_time', 'Until')}
                </div>

                <div className="mt-4">
                  <label htmlFor="av-interval" className="field-label">Slot interval (minutes)</label>
                  <select id="av-interval" value={hours.slot_interval_min}
                    onChange={(e) => setHours((h) => ({ ...h, slot_interval_min: Number(e.target.value) }))}
                    className="field">
                    {[15, 20, 30, 45, 60, 90, 120].map((n) => (
                      <option key={n} value={n}>Every {n} minutes</option>
                    ))}
                  </select>
                </div>

                <p className="mt-4 flex items-center gap-2 rounded-xl border border-edge bg-ivory/60 px-4 py-3 text-xs text-muted">
                  <Timer className="h-4 w-4 shrink-0 text-rosewood" />
                  Existing days with the same weekday are updated automatically.
                </p>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setHoursEditor(false)} disabled={savingHours} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingHours} className="btn-primary px-6 py-3 text-sm">
                    {savingHours ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save hours
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================ block date editor ============================ */}
      <AnimatePresence>
        {blockEditor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !savingBlock) setBlockEditor(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="block-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">Time off</p>
                    <h3 id="block-title" className="mt-1 font-display text-xl">Block a date</h3>
                  </div>
                  <button onClick={() => !savingBlock && setBlockEditor(false)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <form onSubmit={saveBlock} className="relative px-6 py-5" noValidate>
                <BusyOverlay show={savingBlock} label="Blocking…" />
                {blockError && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-burgundy-100 bg-burgundy-50 px-4 py-3 text-[13px] text-burgundy-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {blockError}
                  </div>
                )}

                <div>
                  <label htmlFor="blk-date" className="field-label">Date *</label>
                  <input id="blk-date" type="date" min={todayKey()} value={block.unavailable_date}
                    onChange={(e) => { setBlock((b) => ({ ...b, unavailable_date: e.target.value })); setBlockError(null); }}
                    className="field" />
                </div>

                <div className="mt-4">
                  <label htmlFor="blk-reason" className="field-label">Reason <span className="font-normal text-muted">(optional)</span></label>
                  <input id="blk-reason" value={block.reason} maxLength={255}
                    onChange={(e) => setBlock((b) => ({ ...b, reason: e.target.value }))}
                    placeholder="Annual leave, conference, personal…" className="field" />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted">
                  Customers with existing appointments on this date are <strong>not</strong> affected —
                  only new bookings are blocked.
                </p>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setBlockEditor(false)} disabled={savingBlock} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingBlock} className="btn-primary px-6 py-3 text-sm">
                    {savingBlock ? <Spinner className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    Block date
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.kind === 'block' ? 'Unblock this date?' : 'Delete these working hours?'}
        message={
          deleteTarget
            ? deleteTarget.kind === 'block'
              ? `${new Date(`${deleteTarget.row.unavailable_date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} will become bookable again.`
              : `${DAY_NAMES[deleteTarget.row.day_of_week]} (${fmtTime(deleteTarget.row.start_time)} – ${fmtTime(deleteTarget.row.end_time)}) will be removed from your week.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={busy}
        onConfirm={removeTarget}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
