import { motion } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';

/** Full-screen branded loading indicator. */
export default function LoadingScreen({ label = 'Loading' }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ivory">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-2xl bg-burgundy/25" />
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-burgundy-gradient shadow-glow">
            <CalendarCheck className="h-7 w-7 text-ivory" strokeWidth={2.2} />
          </span>
        </motion.div>

        <div className="flex items-center gap-2">
          {['', '', ''].map((_, i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-rosewood"
              animate={{ y: [0, -7, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted">{label}</p>
      </div>
    </div>
  );
}

/** Inline spinner for buttons and rows. */
export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span
      className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Skeleton shimmer block. */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-cream via-white to-cream bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.6s linear infinite' }}
    />
  );
}
