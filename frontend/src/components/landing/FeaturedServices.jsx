import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowUpRight, ArrowRight, Timer, Wallet, Search } from 'lucide-react';
import api from '../../services/api';
import { Section, SectionHeading, ViewAllLink, Stars, LoadingRows, ErrorState } from '../ui/Primitives';
import { formatMoney } from '../../utilities/format';

function ServiceCard({ service, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-edge bg-white shadow-card transition-all duration-500 ease-elegant hover:-translate-y-2 hover:shadow-lift hover:border-burgundy-100"
    >
      {/* image */}
      <div className="relative aspect-[16/11] overflow-hidden bg-cream">
        <img
          src={service.image_url || 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80'}
          alt={service.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-elegant group-hover:scale-110"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/70 via-burgundy-900/10 to-transparent" />

        <span className="badge absolute left-4 top-4 border border-white/30 bg-white/90 text-burgundy backdrop-blur">
          {service.category_name}
        </span>

        {service.provider_name && (
          <span className="absolute bottom-3.5 left-4 flex items-center gap-1.5 text-[11px] font-bold text-ivory/95">
            <span className="h-1.5 w-1.5 rounded-full bg-softrose" />
            {service.provider_name}
          </span>
        )}

        <span className="absolute bottom-3.5 right-4 font-display text-xl font-bold text-ivory drop-shadow">
          {formatMoney(service.price)}
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5.5 p-5">
        <h3 className="font-display text-xl leading-snug text-burgundy-800 transition-colors group-hover:text-burgundy">
          {service.name}
        </h3>

        <p className="mt-2.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
          {service.description || 'A signature Appointify treatment delivered by certified professionals.'}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-edge pt-4">
          <div className="flex items-center gap-3.5 text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-rosewood" />
              {service.duration_min} min
            </span>
            {service.rating_avg > 0 && (
              <span className="flex items-center gap-1.5">
                <Stars value={service.rating_avg} size={11} />
                <span className="font-bold text-charcoal">{Number(service.rating_avg).toFixed(1)}</span>
              </span>
            )}
          </div>

          <Link
            to={`/services/${service.id}`}
            className="group/btn grid h-9 w-9 place-items-center rounded-full bg-burgundy text-ivory transition-all duration-300 ease-elegant group-hover:bg-burgundy-800 group-hover:scale-110"
            aria-label={`View ${service.name}`}
          >
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      {/* hover sheen */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rosewood/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </motion.article>
  );
}

export default function FeaturedServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/services?limit=6&sort=popular');
      setServices(res.data?.data?.services || []);
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
    <Section id="services" className="bg-ivory max-lg:overflow-hidden">
      {/* decorative parallax blob */}
      <div
        className="pointer-events-none absolute -right-40 top-16 h-96 w-96 rounded-full bg-burgundy-100/45 blur-3xl"
        data-parallax="70"
      />

      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Featured services"
            title={
              <>
                Signature treatments, <span className="italic text-rosewood">crafted for you</span>
              </>
            }
            subtitle="From restorative wellness to precision grooming — explore the most booked services on Appointify."
          />
          <div data-reveal="right">
            <ViewAllLink to="/services">Browse all services</ViewAllLink>
          </div>
        </div>

        <div className="mt-12">
          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-[26px] border border-edge bg-white">
                  <div className="aspect-[16/11] animate-pulse bg-cream" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-cream" />
                    <div className="h-3.5 w-full animate-pulse rounded bg-cream" />
                    <div className="h-3.5 w-5/6 animate-pulse rounded bg-cream" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && <ErrorState message={error} onRetry={load} />}

          {!loading && !error && services.length === 0 && (
            <div className="rounded-3xl border border-dashed border-edge bg-white/60 p-14 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-rosewood" />
              <p className="font-display text-xl text-burgundy-800">No services published yet</p>
              <p className="mt-1.5 text-sm text-muted">Check back shortly — new services are added daily.</p>
            </div>
          )}

          {!loading && !error && services.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i} />
              ))}
            </div>
          )}
        </div>

        {!loading && !error && services.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-11 flex justify-center"
          >
            <Link to="/services" className="btn-secondary group">
              Explore the full catalogue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </Link>
          </motion.div>
        )}
      </div>
    </Section>
  );
}
