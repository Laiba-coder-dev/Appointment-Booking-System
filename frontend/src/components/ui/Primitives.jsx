import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

/** Reusable section heading with eyebrow + editorial title. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
  action = null
}) {
  const centered = align === 'center';
  return (
    <div
      className={`${centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'} ${className}`}
      data-reveal={centered ? 'up' : 'left'}
    >
      {eyebrow && (
        <span className={`eyebrow ${centered ? 'justify-center' : ''}`}>
          <span className="h-px w-8 bg-rosewood/60" />
          {eyebrow}
          {centered && <span className="h-px w-8 bg-rosewood/60" />}
        </span>
      )}
      <h2 className="section-title mt-4 text-balance">{title}</h2>
      {subtitle && <p className={`section-sub mt-5 ${centered ? 'mx-auto' : ''}`}>{subtitle}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

/** Animated section wrapper with GSAP reveal targets. */
export function Section({ id, children, className = '', tone = 'ivory' }) {
  const tones = {
    ivory: 'bg-ivory',
    cream: 'bg-cream',
    light: 'bg-lightbg',
    white: 'bg-white',
    burgundy: 'bg-burgundy-gradient text-ivory'
  };
  return (
    <section id={id} className={`section-pad relative ${tones[tone] || tones.ivory} ${className}`}>
      <div className="container-x">{children}</div>
    </section>
  );
}

/** Premium "view all" link with arrow slide. */
export function ViewAllLink({ to, children = 'View all' }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 rounded-full border border-edge bg-white px-5 py-2.5 text-sm font-bold text-burgundy transition-all duration-300 ease-elegant hover:border-burgundy hover:-translate-y-0.5 hover:shadow-card"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
    </Link>
  );
}

/** Star rating display. */
export function Stars({ value = 0, size = 14, showValue = false }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${value} out of 5 stars`}>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.6l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.42l-5.8 3.04 1.1-6.46-4.69-4.58 6.49-.94L12 2.6z"
              fill={i <= rounded ? '#C9A96A' : '#E9DDD7'}
            />
          </svg>
        ))}
      </span>
      {showValue && (
        <span className="text-xs font-bold text-charcoal">{Number(value).toFixed(1)}</span>
      )}
    </span>
  );
}

/** Status badge using shared status palette. */
export function StatusBadge({ status, label, className = '' }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-burgundy-50 text-burgundy-700 border-burgundy-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rosewood/10 text-rosewood border-rosewood/30',
    rejected: 'bg-red-50 text-red-600 border-red-200',
    no_show: 'bg-slate-100 text-slate-600 border-slate-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    refunded: 'bg-slate-100 text-slate-600 border-slate-200',
    partially_refunded: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected_provider: 'bg-red-50 text-red-600 border-red-200'
  };
  return (
    <span
      className={`badge border capitalize ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'} ${className}`}
    >
      {label || String(status || '').replace('_', ' ')}
    </span>
  );
}

/** Framer-motion card hover wrapper. */
export function MotionCard({ children, className = '', delay = 0, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -7 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Empty / loading / error state trio used across the app. */
export function EmptyState({ icon: Icon, title, description, action = null, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-edge bg-ivory/60 px-6 py-16 text-center ${className}`}>
      {Icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-card">
          <Icon className="h-6 w-6 text-rosewood" />
        </span>
      )}
      <h3 className="font-display text-xl text-burgundy-800">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-burgundy-100 bg-burgundy-50/50 px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-burgundy shadow-card">
        !
      </span>
      <h3 className="font-display text-xl text-burgundy-800">We couldn't load this</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-6">
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingRows({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl bg-gradient-to-r from-cream via-white to-cream bg-[length:200%_100%]"
          style={{ animation: 'shimmer 1.5s linear infinite', animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

/** Primary CTA that adapts for signed-in users. */
export function BookCTA({ label = 'Book an Appointment', className = '' }) {
  return (
    <Link to="/services" className={`btn-primary btn-lg group ${className}`}>
      <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
      {label}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}
