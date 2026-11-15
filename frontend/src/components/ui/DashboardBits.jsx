import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, ChevronRight, AlertTriangle, Inbox, Loader2,
  X, CheckCircle2, Info
} from 'lucide-react';
import { Spinner } from './LoadingScreen';

/* ============================================================
   Shared dashboard building blocks — used by customer,
   provider and admin surfaces so every table, stat, filter
   and dialog looks and behaves identically.
   ============================================================ */

/** Page heading with eyebrow, title, description and action row. */
export function PageIntro({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="mt-2 font-display text-2xl leading-tight text-burgundy-800 sm:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** Compact KPI card with icon, value and optional sub-line. */
export function StatCard({ icon: Icon, label, value, sub, tone = 'burgundy', delay = 0 }) {
  const tones = {
    burgundy: 'bg-burgundy-50 text-burgundy',
    rosewood: 'bg-rosewood/10 text-rosewood',
    gold: 'bg-gold-100 text-gold-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    ivory: 'bg-ivory text-burgundy-800'
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-edge bg-white p-5 shadow-card transition-all duration-400 ease-elegant hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl leading-none text-burgundy-800">{value}</p>
          {sub && <p className="mt-2 truncate text-xs text-muted">{sub}</p>}
        </div>
        {Icon && (
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-400 group-hover:scale-110 ${tones[tone] || tones.burgundy}`}>
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </span>
        )}
      </div>
      <span className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-burgundy-50/70" aria-hidden="true" />
    </motion.div>
  );
}

/** White panel with optional header, subtitle and right-aligned action. */
export function Panel({ title, subtitle, action, children, className = '', bodyClassName = 'p-5 sm:p-6', flush = false }) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-edge bg-white shadow-card ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge bg-ivory/70 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h3 className="font-display text-base text-burgundy-800 sm:text-lg">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={flush ? '' : bodyClassName}>{children}</div>
    </section>
  );
}

/** Rounded search input used across list pages. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', label = 'Search' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="field !pl-10"
      />
    </div>
  );
}

/** Styled select filter. */
export function SelectInput({ value, onChange, options = [], label, className = '', ariaLabel }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel || label}
      className={`field !w-auto !py-2.5 !text-[13px] !font-semibold ${className}`}
    >
      {label && <option value="">{label}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Pill tab strip (filters, sub-views). */
export function Tabs({ tabs = [], value, onChange, className = '' }) {
  return (
    <div className={`hide-scroll -mx-1 flex gap-1.5 overflow-x-auto rounded-2xl border border-edge bg-cream/70 p-1.5 ${className}`} role="tablist">
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`relative shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all duration-300 ease-elegant ${
              active ? 'bg-white text-burgundy shadow-card' : 'text-muted hover:text-burgundy'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count !== null && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${active ? 'bg-burgundy-50 text-burgundy' : 'bg-white text-muted'}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pagination with page numbers (mirrors the public list pages). */
export function Pagination({ page = 1, totalPages = 1, total = 0, onChange, noun = 'items' }) {
  if (totalPages <= 1) return total > 0 ? (
    <p className="mt-6 text-center text-xs text-muted">{total} {noun}</p>
  ) : null;

  const go = (p) => onChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <nav className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-between" aria-label="Pagination">
      <p className="text-xs text-muted">
        Page <span className="font-bold text-charcoal">{page}</span> of{' '}
        <span className="font-bold text-charcoal">{totalPages}</span> · {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="grid h-10 w-10 place-items-center rounded-full border border-edge bg-white text-burgundy transition hover:border-burgundy disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const n = i + 1;
          if (Math.abs(n - page) > 2 && n !== 1 && n !== totalPages) return null;
          return (
            <button
              key={n}
              onClick={() => go(n)}
              aria-current={page === n ? 'page' : undefined}
              className={`h-10 min-w-[40px] rounded-full px-3 text-sm font-bold transition-all duration-300 ${
                page === n ? 'bg-burgundy text-ivory shadow-glow' : 'border border-edge bg-white text-burgundy hover:border-burgundy'
              }`}
            >
              {n}
            </button>
          );
        })}
        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="grid h-10 w-10 place-items-center rounded-full border border-edge bg-white text-burgundy transition hover:border-burgundy disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

/** Unified loading / error / empty state for list surfaces. */
export function StateBlock({ loading, error, empty, onRetry, emptyIcon: EmptyIcon = Inbox, emptyTitle = 'Nothing here yet', emptyDescription, rows = 4, children }) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-gradient-to-r from-cream via-white to-cream bg-[length:200%_100%]"
            style={{ animation: 'shimmer 1.5s linear infinite', animationDelay: `${i * 0.1}s` }}
          />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-burgundy-100 bg-burgundy-50/50 px-6 py-14 text-center">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-burgundy shadow-card">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h3 className="font-display text-lg text-burgundy-800">We couldn't load this</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary mt-5 btn-sm">Try again</button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-edge bg-ivory/60 px-6 py-14 text-center">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-card">
          <EmptyIcon className="h-5 w-5 text-rosewood" />
        </span>
        <h3 className="font-display text-lg text-burgundy-800">{emptyTitle}</h3>
        {emptyDescription && <p className="mt-1.5 max-w-sm text-sm text-muted">{emptyDescription}</p>}
      </div>
    );
  }

  return children;
}

/**
 * Responsive data table.
 * columns: [{ key, header, className, render(row) }]
 */
export function DataTable({ columns = [], rows = [], keyFn, onRowClick, className = '' }) {
  return (
    <div className={`-mx-1 overflow-x-auto px-1 ${className}`}>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-edge">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted ${c.headerClassName || ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={keyFn ? keyFn(row) : row.id ?? i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25) }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-edge/60 transition-colors duration-200 last:border-0 ${
                onRowClick ? 'cursor-pointer hover:bg-ivory/70' : 'hover:bg-ivory/50'
              }`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-3.5 align-middle text-[13.5px] text-charcoal ${c.className || ''}`}>
                  {c.render ? c.render(row, i) : row[c.key]}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Confirmation dialog (destructive / irreversible actions). */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep editing',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-burgundy-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel?.(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
          >
            <div className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
              <div className="noise absolute inset-0" />
              <div className="relative flex items-start justify-between gap-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone === 'danger' ? 'bg-white/15 text-softrose' : 'bg-white/15 text-ivory'}`}>
                  {tone === 'danger' ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                </span>
                <button
                  onClick={() => !loading && onCancel?.()}
                  aria-label="Close dialog"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 id="confirm-title" className="relative mt-3 font-display text-xl text-ivory">{title}</h3>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-muted">{message}</p>
              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button onClick={() => onCancel?.()} disabled={loading} className="btn-secondary">
                  {cancelLabel}
                </button>
                <button
                  onClick={() => onConfirm?.()}
                  disabled={loading}
                  className={tone === 'danger' ? 'btn bg-burgundy text-ivory px-6 py-3 text-sm hover:bg-burgundy-800' : 'btn-primary'}
                >
                  {loading && <Spinner className="h-4 w-4" />}
                  {!loading && tone === 'danger' && <CheckCircle2 className="h-4 w-4" />}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Inline row action button (icon + label on desktop). */
export function RowAction({ icon: Icon, label, onClick, tone = 'default', disabled = false, className = '' }) {
  const tones = {
    default: 'text-burgundy hover:bg-burgundy-50',
    danger: 'text-red-600 hover:bg-red-50',
    success: 'text-emerald-700 hover:bg-emerald-50',
    muted: 'text-muted hover:bg-ivory'
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white transition-all duration-200 hover:border-burgundy-300 disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
    </button>
  );
}

/** Small labelled chip used for inline filters and metadata. */
export function Chip({ children, active = false, onClick, className = '' }) {
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      onClick={onClick}
      className={`badge border transition-all duration-300 ${
        active
          ? 'border-burgundy bg-burgundy text-ivory'
          : 'border-edge bg-white text-muted hover:border-burgundy-300 hover:text-burgundy'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </Comp>
  );
}

/** Subtle busy overlay for forms/cards while a mutation is in flight. */
export function BusyOverlay({ show, label = 'Working…' }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 grid place-items-center rounded-[inherit] bg-white/70 backdrop-blur-[2px]"
        >
          <span className="flex items-center gap-2 rounded-full border border-edge bg-white px-4 py-2 text-xs font-bold text-burgundy shadow-card">
            <Loader2 className="h-4 w-4 animate-spin" /> {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default {
  PageIntro, StatCard, Panel, SearchInput, SelectInput, Tabs, Pagination,
  StateBlock, DataTable, ConfirmDialog, RowAction, Chip, BusyOverlay
};
