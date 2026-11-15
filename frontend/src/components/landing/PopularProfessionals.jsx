import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, ArrowUpRight, BadgeCheck, Users } from 'lucide-react';
import api from '../../services/api';
import { Section, SectionHeading, ViewAllLink, Stars } from '../ui/Primitives';
import { initials } from '../../utilities/format';

function ProviderCard({ p, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-[26px] border border-edge bg-white p-6 shadow-card transition-all duration-500 ease-elegant hover:-translate-y-2 hover:border-burgundy-100 hover:shadow-lift"
    >
      {/* featured ribbon */}
      {p.is_featured === 1 && (
        <span className="badge absolute right-5 top-5 border border-gold/40 bg-gold-gradient text-charcoal">
          Featured
        </span>
      )}

      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt={p.name}
              loading="lazy"
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-edge transition-all duration-500 group-hover:ring-burgundy-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <span
            className={`grid h-16 w-16 place-items-center rounded-2xl bg-burgundy-gradient font-display text-xl text-ivory ring-2 ring-edge ${
              p.avatar_url ? 'hidden' : ''
            }`}
          >
            {initials(p.name)}
          </span>

          {p.approval_status === 'approved' && (
            <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 ring-2 ring-white">
              <BadgeCheck className="h-3.5 w-3.5 text-white" strokeWidth={2.6} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg text-burgundy-800">{p.name}</h3>
          <p className="mt-0.5 truncate text-xs font-bold uppercase tracking-wider text-rosewood">
            {p.specialization || 'Specialist'}
          </p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 min-h-[40px] text-sm leading-relaxed text-muted">
        {p.headline || 'A trusted Appointify professional ready to help you look and feel your best.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-rosewood" />
          {p.experience_years} yrs
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-rosewood" />
          {p.appt_count ?? 0} bookings
        </span>
        {p.location && (
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-rosewood" />
            <span className="truncate">{p.location}</span>
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-edge pt-4">
        <div className="flex items-center gap-2">
          <Stars value={p.rating_avg || 0} size={13} />
          <span className="text-xs font-bold text-charcoal">
            {Number(p.rating_avg || 0).toFixed(1)}
          </span>
          <span className="text-xs text-muted">({p.review_count || 0})</span>
        </div>

        <Link
          to={`/professionals/${p.id}`}
          className="group/btn inline-flex items-center gap-1.5 rounded-full bg-burgundy-50 px-4 py-2 text-xs font-bold text-burgundy transition-all duration-300 hover:bg-burgundy hover:text-ivory"
        >
          View profile
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </div>

      <span className="pointer-events-none absolute inset-x-6 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-burgundy to-transparent transition-transform duration-500 group-hover:scale-x-100" />
    </motion.article>
  );
}

export default function PopularProfessionals() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/providers?limit=6&sort=popular');
      setProviders(res.data?.data?.providers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Section id="professionals" className="bg-cream relative overflow-hidden">
      <div
        className="pointer-events-none absolute -left-44 bottom-10 h-[26rem] w-[26rem] rounded-full bg-rosewood/15 blur-3xl"
        data-parallax="90"
      />

      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Popular professionals"
            title={
              <>
                Meet the hands behind <span className="italic text-rosewood">every booking</span>
              </>
            }
            subtitle="Hand-picked, reviewed and verified — our professionals consistently earn five-star ratings."
          />
          <div data-reveal="right">
            <ViewAllLink to="/professionals">All professionals</ViewAllLink>
          </div>
        </div>

        <div className="mt-12">
          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-[26px] border border-edge bg-white" />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="rounded-3xl border border-burgundy-100 bg-white p-10 text-center">
              <p className="text-sm text-muted">{error}</p>
              <button onClick={load} className="btn-primary mt-4">Retry</button>
            </div>
          )}

          {!loading && !error && providers.length === 0 && (
            <div className="rounded-3xl border border-dashed border-edge bg-white/70 p-14 text-center">
              <p className="font-display text-xl text-burgundy-800">No professionals listed yet</p>
              <p className="mt-1.5 text-sm text-muted">Approved providers will appear here.</p>
            </div>
          )}

          {!loading && !error && providers.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((p, i) => (
                <ProviderCard key={p.id} p={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
