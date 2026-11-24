import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const BRAND_TITLE = 'Cinematic Arts';

export function IntroSplash() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    setReducedMotion(prefersReduced);

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return;

    setVisible(true);
    const duration = prefersReduced ? 850 : 2900;
    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          exit={
            reducedMotion
              ? { opacity: 0, transition: { duration: 0.25 } }
              : {
                  y: '-100%',
                  opacity: 0.92,
                  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
                }
          }
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0c0d0f] px-6 text-[#f4f4f5]"
          aria-label="Cinematic Arts intro"
        >
          {/* Light sweep overlay */}
          {!reducedMotion && (
            <div
              aria-hidden="true"
              className="ca-intro-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent"
            />
          )}

          <div className="relative text-center">
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reducedMotion ? 0.25 : 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/25 bg-white/[0.04] backdrop-blur-xl shadow-2xl"
            >
              <span className="font-display text-4xl font-semibold tracking-wider text-[#d98a2b]">
                CA
              </span>
            </motion.div>

            <h2
              className="font-display text-3xl font-medium tracking-wide sm:text-5xl"
              aria-label={BRAND_TITLE}
            >
              {reducedMotion ? (
                <span>{BRAND_TITLE}</span>
              ) : (
                BRAND_TITLE.split('').map((ch, idx) => (
                  <span
                    key={idx}
                    style={{ animationDelay: `${220 + idx * 42}ms` }}
                    className="ca-intro-letter"
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                ))
              )}
            </h2>

            {/* Thin gold line drawing beneath the brand name */}
            <div
              aria-hidden="true"
              className={`${
                reducedMotion ? 'opacity-70' : 'ca-intro-gold-line'
              } mx-auto mt-3.5 h-[1.5px] w-36 bg-gradient-to-r from-transparent via-[#d98a2b] to-transparent`}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0.1 : 1.15, duration: 0.5 }}
              className="mt-3 text-xs text-zinc-400"
            >
              Peshawar, Pakistan
            </motion.p>
          </div>

          <button
            type="button"
            onClick={() => setVisible(false)}
            className="btn-press mt-10 min-h-[44px] rounded-xl border border-white/15 px-5 py-2 text-xs font-medium text-zinc-300 hover:border-white/35 hover:text-white"
          >
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
