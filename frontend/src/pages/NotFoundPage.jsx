import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarX, ArrowLeft, Search } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useUtility';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');

  useEffect(() => {
    document.body.style.background = '#FFF9F0';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ivory px-6 text-center">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-burgundy-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-rosewood/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-lg"
      >
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-burgundy-gradient shadow-glow">
          <CalendarX className="h-9 w-9 text-ivory" strokeWidth={1.7} />
        </span>

        <p className="mt-8 font-display text-[7rem] leading-none text-burgundy-800 sm:text-[9rem]">
          404
        </p>

        <span className="mx-auto mt-4 block h-px w-24 bg-gradient-to-r from-transparent via-rosewood to-transparent" />

        <h1 className="mt-6 font-display text-3xl text-burgundy-800">
          This slot doesn't exist
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          The page you're looking for has been moved, deleted or never booked in the
          first place. Let's get you back on schedule.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to home
          </Link>
          <Link to="/services" className="btn-secondary">
            <Search className="h-4 w-4" />
            Browse services
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
