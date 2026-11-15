import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Sparkles, Star } from 'lucide-react';
import HeroScene from '../../three/HeroScene';
import { use3DEnabled } from '../../hooks/useMotion';

const TRUST = [
  { label: 'Trusted by', value: '12,400+' },
  { label: 'Professionals', value: '340+' },
  { label: 'Avg. rating', value: '4.9' }
];

export default function Hero() {
  const sectionRef = useRef(null);
  const threeEnabled = use3DEnabled();
  const reduced = useReducedMotion();
  const [showLite, setShowLite] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start']
  });

  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 130]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, reduced ? 1 : 0]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -90]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.08]);

  useEffect(() => {
    setShowLite(localStorage.getItem('appointify_3d') === 'off');
  }, []);

  const toggle3D = () => {
    const next = threeEnabled ? 'off' : 'on';
    localStorage.setItem('appointify_3d', next);
    setShowLite(next === 'off');
    // reload to re-evaluate capability flags cleanly
    window.location.reload();
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] overflow-hidden bg-burgundy-800 pt-[72px]"
      aria-label="Appointify hero"
    >
      {/* --- base gradient (always present behind the canvas) --- */}
      <div className="absolute inset-0 bg-burgundy-gradient" />
      <div className="absolute inset-0 noise" />

      {/* --- interactive 3D scene --- */}
      <motion.div
        style={{ y: sceneY, scale: sceneScale }}
        className="absolute inset-0 z-0"
        aria-hidden={!threeEnabled}
      >
        <HeroScene enabled={threeEnabled} quality={threeEnabled ? 'high' : 'low'} />
      </motion.div>

      {/* --- legibility vignette --- */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(100deg, rgba(52,14,23,0.86) 0%, rgba(52,14,23,0.55) 34%, rgba(52,14,23,0.08) 62%, rgba(52,14,23,0.42) 100%)'
        }}
      />

      {/* ---------- Content ---------- */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-20 container-x flex min-h-[calc(100svh-72px)] flex-col justify-center py-16"
      >
        <div className="max-w-2xl">
          {/* eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-xl"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-softrose opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-softrose" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ivory/90">
              Premium scheduling, beautifully simple
            </span>
          </motion.div>

          {/* headline — masked line reveal */}
          <h1 className="mt-7 font-display text-[3rem] font-medium leading-[1.02] text-ivory sm:text-[4rem] lg:text-[4.7rem]">
            {['Your Time.', 'Your Schedule.', 'Your Way.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span
                  className={`block ${i === 2 ? 'italic text-softrose' : ''}`}
                  initial={{ y: '112%' }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: 1.05,
                    delay: 0.22 + i * 0.13,
                    ease: [0.19, 1, 0.22, 1]
                  }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* supporting copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 max-w-xl text-[15px] leading-relaxed text-ivory/80 sm:text-base"
          >
            Book appointments effortlessly with our modern scheduling platform.
            Discover services, choose professionals, and manage your time with ease.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.88, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-3.5"
          >
            <Link to="/book" className="btn-primary btn-lg group !bg-ivory !text-burgundy-800 hover:!bg-white">
              <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Book an Appointment
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
            </Link>

            <Link
              to="/services"
              className="btn btn-lg group whitespace-nowrap border border-white/30 bg-white/10 px-7 text-ivory backdrop-blur transition-all duration-300 ease-elegant hover:border-white/50 hover:bg-white/15 hover:-translate-y-0.5"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                <Play className="h-3 w-3 fill-current" />
              </span>
              Explore Services
            </Link>
          </motion.div>

          {/* trust row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 flex flex-wrap items-center gap-7 border-t border-white/10 pt-7"
          >
            <div className="flex -space-x-3">
              {[32, 12, 44, 68, 25].map((n, i) => (
                <img
                  key={n}
                  src={`https://i.pravatar.cc/80?img=${n}`}
                  alt=""
                  loading="lazy"
                  className="h-9 w-9 rounded-full border-2 border-burgundy-800 object-cover transition-transform duration-300 hover:-translate-y-1 hover:z-10"
                  style={{ zIndex: 10 - i }}
                />
              ))}
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-burgundy-800 bg-ivory text-[10px] font-extrabold text-burgundy">
                +9k
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                ))}
              </div>
              <span className="text-xs font-bold text-ivory">4.9</span>
              <span className="text-xs text-ivory/55">· 2,318 reviews</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-ivory/60">
              <ShieldCheck className="h-4 w-4 text-softrose" />
              Secure booking · No hidden fees
            </div>
          </motion.div>

          {/* quick stats (visible on small screens where side cards are hidden) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-8 grid grid-cols-3 gap-3 lg:hidden"
          >
            {TRUST.map((t) => (
              <div key={t.label} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur">
                <p className="font-display text-lg text-ivory">{t.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-ivory/55">{t.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* --- side stat rail (desktop) --- */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col gap-4 xl:flex"
          data-speed="1.18"
        >
          {TRUST.map((t, i) => (
            <div
              key={t.label}
              className="glass-dark w-[178px] rounded-2xl px-5 py-4"
              style={{ transform: `translateX(${i % 2 ? 26 : 0}px)` }}
            >
              <p className="font-display text-[1.7rem] leading-none text-ivory">{t.value}</p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-softrose">
                {t.label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* --- scroll cue --- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-ivory/50">Scroll</span>
        <span className="relative block h-11 w-6 rounded-full border border-white/30">
          <motion.span
            className="absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 rounded-full bg-softrose"
            animate={reduced ? {} : { y: [0, 20, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.div>

      {/* --- 3D toggle (accessibility / performance control) --- */}
      <button
        onClick={toggle3D}
        className="absolute bottom-6 right-5 z-30 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ivory/80 backdrop-blur transition hover:border-white/45 hover:text-ivory"
        title={threeEnabled ? 'Switch to the lightweight hero' : 'Enable the full 3D hero'}
      >
        {threeEnabled ? '3D: On' : '3D: Off'}
      </button>
    </section>
  );
}
