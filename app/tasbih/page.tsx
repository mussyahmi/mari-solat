'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { amiri } from './amiri';
import { berperingkat, naikMasuk, spring } from '@/lib/motion';
import { toast } from 'sonner';
import { Minus, RotateCcw, Check } from 'lucide-react';

type Preset = {
  id: string;
  name: string;
  arabic?: string;
  target: number; // 0 = no target / freeform
};

const PRESETS: Preset[] = [
  { id: 'selawat',        name: 'Selawat',           arabic: 'اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ', target: 100 },
  { id: 'subhanallah',    name: 'Subhanallah',       arabic: 'سُبْحَانَ ٱللَّٰهِ',              target: 33  },
  { id: 'alhamdulillah',  name: 'Alhamdulillah',     arabic: 'ٱلْحَمْدُ لِلَّٰهِ',              target: 33  },
  { id: 'allahuakbar',    name: 'Allahu Akbar',      arabic: 'ٱللَّٰهُ أَكْبَرُ',               target: 34  },
  { id: 'lailaha',        name: 'La ilaha illallah', arabic: 'لَا إِلٰهَ إِلَّا ٱللَّٰهُ',         target: 100 },
  { id: 'istighfar',      name: 'Astaghfirullah',    arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ',            target: 100 },
  { id: 'hawqala',        name: 'La hawla wa la quwwata illa billah', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّٰهِ', target: 100 },
  { id: 'bebas',          name: 'Bebas',                                                                  target: 0   },
];

const STORAGE_KEY = 'msolat_tasbih_v1';

type StoredState = {
  active: string;
  counts: Record<string, number>;
  cycles: Record<string, number>;
};

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabic = (n: number) =>
  n.toString().split('').map(d => ARABIC_DIGITS[parseInt(d, 10)] ?? d).join('');

function loadState(): StoredState {
  if (typeof window === 'undefined') return { active: 'selawat', counts: {}, cycles: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: 'selawat', counts: {}, cycles: {} };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      active: parsed.active ?? 'selawat',
      counts: parsed.counts ?? {},
      cycles: parsed.cycles ?? {},
    };
  } catch {
    return { active: 'selawat', counts: {}, cycles: {} };
  }
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function TasbihPage() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<StoredState>({ active: 'selawat', counts: {}, cycles: {} });
  const [resetArmed, setResetArmed] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [completeKey, setCompleteKey] = useState(0);

  // Hydrate from localStorage (deferred to effect to avoid SSR/CSR mismatch)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on change (after hydration)
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  // Disarm reset after a moment
  useEffect(() => {
    if (!resetArmed) return;
    const t = setTimeout(() => setResetArmed(false), 2500);
    return () => clearTimeout(t);
  }, [resetArmed]);

  const preset = PRESETS.find(p => p.id === state.active) ?? PRESETS[0];
  const count = state.counts[preset.id] ?? 0;
  const cycles = state.cycles[preset.id] ?? 0;
  const hasTarget = preset.target > 0;
  const progress = hasTarget ? Math.min(count / preset.target, 1) : 0;

  const vibrate = (ms: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(ms); } catch {}
    }
  };

  const increment = useCallback(() => {
    setState(prev => {
      const id = prev.active;
      const current = prev.counts[id] ?? 0;
      const target = PRESETS.find(p => p.id === id)?.target ?? 0;
      const next = current + 1;

      if (target > 0 && next >= target) {
        // Cycle complete
        setCompleteKey(k => k + 1);
        vibrate([20, 40, 80]);
        toast.success('Tasbih lengkap, Alhamdulillah', {
          description: `${PRESETS.find(p => p.id === id)?.name} · pusingan ${(prev.cycles[id] ?? 0) + 1}`,
          duration: 2500,
        });
        return {
          ...prev,
          counts: { ...prev.counts, [id]: 0 },
          cycles: { ...prev.cycles, [id]: (prev.cycles[id] ?? 0) + 1 },
        };
      }

      vibrate(12);
      setPulseKey(k => k + 1);
      return { ...prev, counts: { ...prev.counts, [id]: next } };
    });
  }, []);

  const decrement = useCallback(() => {
    setState(prev => {
      const id = prev.active;
      const current = prev.counts[id] ?? 0;
      if (current <= 0) return prev;
      vibrate(8);
      return { ...prev, counts: { ...prev.counts, [id]: current - 1 } };
    });
  }, []);

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    setState(prev => ({
      ...prev,
      counts: { ...prev.counts, [prev.active]: 0 },
      cycles: { ...prev.cycles, [prev.active]: 0 },
    }));
    setResetArmed(false);
    vibrate([10, 30, 10]);
    toast.success('Kiraan dikosongkan');
  };

  const switchPreset = (id: string) => {
    setState(prev => ({ ...prev, active: id }));
  };

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        increment();
      } else if (e.code === 'Backspace' || e.code === 'ArrowDown') {
        e.preventDefault();
        decrement();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [increment, decrement]);

  // SVG ring math
  /** Zikir yang pernah dikira — satu-satunya yang berbaloi disenaraikan. */
  const tersimpan = PRESETS.filter(
    p => (state.counts[p.id] ?? 0) > 0 || (state.cycles[p.id] ?? 0) > 0
  );

  const RING_RADIUS = 138;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS;
  const dashOffset = RING_CIRC * (1 - progress);

  return (
    <div className={`${amiri.variable}`}>
      <motion.main
        variants={berperingkat()}
        initial="sembunyi"
        animate="tunjuk"
        className="mx-auto w-full max-w-7xl px-5 pb-16 pt-4 lg:px-10"
      >
        <motion.header variants={naikMasuk}>
          <h1 className="paparan text-4xl lg:text-5xl">Tasbih</h1>
          <p className="mt-3 max-w-[52ch] text-pretty text-lg leading-relaxed text-muted-foreground">
            Tekan untuk kira selawat, zikir, atau tasbih harian.
          </p>
        </motion.header>

        {/* Pemilih zikir menggunakan baris tab yang sama seperti halaman utama
            dan qada, bukan cip berwarna yang hanya wujud di halaman ini. */}
        <motion.div
          variants={naikMasuk}
          className="-mx-5 mt-10 overflow-x-auto px-5 lg:mx-0 lg:px-0"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="-ml-3 flex w-max items-center border-b border-border/60 lg:-ml-3.5">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => switchPreset(p.id)}
                className="group relative shrink-0 px-3 py-3 text-sm whitespace-nowrap transition-colors lg:px-3.5"
              >
                {p.id === preset.id && (
                  <motion.span
                    layoutId="tabZikir"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                    transition={spring.susunAtur}
                  />
                )}
                <span className={p.id === preset.id ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={naikMasuk} className="flex select-none flex-col items-center pt-12">
          {/* Lafaz ialah perkara yang dibaca, jadi ia mendapat saiz sebenar
              dan bukan sekadar kapsyen di atas bulatan. */}
          {preset.arabic ? (
            <p dir="rtl" lang="ar" className="font-arab max-w-[22ch] text-center text-3xl leading-[1.9] lg:text-4xl">
              {preset.arabic}
            </p>
          ) : (
            <p className="paparan text-2xl">Kiraan bebas</p>
          )}

          <motion.button
            type="button"
            onClick={increment}
            whileTap={{ scale: 0.955 }}
            transition={spring.ketik}
            className="group relative mt-10 w-[min(74vw,320px)] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            aria-label="Tambah kiraan"
          >
            <span
              key={`complete-${completeKey}`}
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                animation: completeKey > 0 ? 'tasbihComplete 700ms ease-out' : undefined,
                background: 'radial-gradient(circle, oklch(from var(--primary) l c h / 0.35), transparent 70%)',
              }}
            />

            <svg viewBox="0 0 300 300" className="block w-full" aria-hidden>
              <circle
                cx="150" cy="150" r={RING_RADIUS}
                fill="none"
                stroke="oklch(from var(--muted-foreground) l c h / 0.18)"
                strokeWidth="2"
              />
              {hasTarget && (
                <circle
                  cx="150" cy="150" r={RING_RADIUS}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 150 150)"
                  style={{ transition: 'stroke-dashoffset 250ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}
              <defs>
                <radialGradient id="inner-fill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="oklch(from var(--primary) l c h / 0.07)" />
                  <stop offset="100%" stopColor="oklch(from var(--primary) l c h / 0)" />
                </radialGradient>
              </defs>
              <circle cx="150" cy="150" r={RING_RADIUS - 6} fill="url(#inner-fill)" />
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                key={`count-${pulseKey}`}
                className="angka-paparan leading-none"
                style={{
                  fontSize:
                    count >= 1000 ? 'clamp(3rem, 12vw, 5rem)'
                      : count >= 100 ? 'clamp(3.5rem, 15vw, 6rem)'
                        : 'clamp(4rem, 18vw, 7rem)',
                  animation: pulseKey > 0 ? 'digitIn 180ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                }}
              >
                {count}
              </span>
              {/* Sifar dalam angka Arab ialah satu titik, yang di bawah angka
                  besar hanya kelihatan seperti habuk — jadi ia bermula pada 1. */}
              {count > 0 && (
                <span dir="rtl" lang="ar" className="font-arab mt-2 text-2xl text-muted-foreground">
                  {toArabic(count)}
                </span>
              )}
            </div>
          </motion.button>

          <div className="mt-12 flex items-center gap-3">
            <button
              onClick={decrement}
              disabled={count === 0}
              aria-label="Tolak satu"
              className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:bg-muted disabled:opacity-30"
            >
              <Minus className="size-4" />
              Tolak
            </button>
            <button
              onClick={handleReset}
              aria-label={resetArmed ? 'Tekan sekali lagi untuk sahkan' : 'Kosongkan kiraan'}
              className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition-colors ${
                resetArmed
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {resetArmed ? <Check className="size-4" /> : <RotateCcw className="size-4" />}
              {resetArmed ? 'Pasti?' : 'Kosongkan'}
            </button>
          </div>
        </motion.div>

        <motion.dl
          variants={naikMasuk}
          className="mx-auto mt-14 max-w-md divide-y divide-border/50 border-t border-border/60 sm:flex sm:justify-center sm:gap-x-12 sm:divide-y-0 sm:pt-5"
        >
          <div className="flex items-center justify-between py-3.5 sm:block sm:py-0">
            <dt className="text-sm text-muted-foreground">Sasaran</dt>
            <dd className="angka-paparan text-2xl sm:mt-1">{hasTarget ? preset.target : '—'}</dd>
          </div>
          <div className="flex items-center justify-between py-3.5 sm:block sm:py-0">
            <dt className="text-sm text-muted-foreground">Baki</dt>
            <dd className="angka-paparan text-2xl sm:mt-1">{hasTarget ? preset.target - count : '—'}</dd>
          </div>
          <div className="flex items-center justify-between py-3.5 sm:block sm:py-0">
            <dt className="text-sm text-muted-foreground">Pusingan</dt>
            <dd className="angka-paparan text-2xl sm:mt-1">{cycles}</dd>
          </div>
        </motion.dl>

        {/* Sebelum ini senarai ini tersembunyi di dalam helaian "Pilih" yang
            hanya mengulang baris tab di atas. Ia kini kekal di halaman. */}
        {tersimpan.length > 0 && (
          <motion.section variants={naikMasuk} className="mx-auto mt-20 max-w-md">
            <h2 className="paparan text-2xl">Kiraan tersimpan</h2>
            <div className="mt-5 divide-y divide-border/50 border-t border-border/50">
              {tersimpan.map(p => (
                <button
                  key={p.id}
                  onClick={() => switchPreset(p.id)}
                  className="flex w-full items-center justify-between gap-6 py-4 text-left"
                >
                  <span className={p.id === preset.id ? 'font-semibold text-primary' : 'transition-colors hover:text-foreground'}>
                    {p.name}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="angka-paparan text-xl">{state.counts[p.id] ?? 0}</span>
                    {p.target > 0 && (
                      <span className="text-sm text-muted-foreground"> / {p.target}</span>
                    )}
                    {(state.cycles[p.id] ?? 0) > 0 && (
                      <span className="ml-3 text-sm text-muted-foreground">
                        {state.cycles[p.id]} pusingan
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </motion.section>
        )}
      </motion.main>
    </div>
  );
}
