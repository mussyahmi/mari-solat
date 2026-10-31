'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { amiri } from './amiri';
import { berperingkat, naikMasuk, spring } from '@/lib/motion';
import { toast } from 'sonner';
import { Minus, RotateCcw, Check } from 'lucide-react';
import { useTeks } from '@/components/BahasaProvider';
import { teksSemasa } from '@/lib/bahasa';
import { palet } from '@/lib/aksen';
import { cn } from '@/lib/utils';

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

const ms = {
  bebas: 'Bebas',
  lede: 'Tekan untuk kira selawat, zikir, atau tasbih harian.',
  kiraanBebas: 'Kiraan bebas',
  tambah: 'Tambah kiraan',
  tolakSatu: 'Tolak satu',
  tolak: 'Tolak',
  sahkan: 'Tekan sekali lagi untuk sahkan',
  kosongkanKiraan: 'Kosongkan kiraan',
  pasti: 'Pasti?',
  kosongkan: 'Kosongkan',
  sasaran: 'Sasaran',
  baki: 'Baki',
  pusingan: 'Pusingan',
  tersimpan: 'Kiraan tersimpan',
  bilPusingan: (n: number) => `${n} pusingan`,
  lengkap: 'Tasbih lengkap, Alhamdulillah',
  lengkapHuraian: (nama: string, n: number) => `${nama} · pusingan ${n}`,
  dikosongkan: 'Kiraan dikosongkan',
};
const en: typeof ms = {
  bebas: 'Free',
  lede: 'Tap to count selawat, zikir, or your daily tasbih.',
  kiraanBebas: 'Free count',
  tambah: 'Add to count',
  tolakSatu: 'Subtract one',
  tolak: 'Subtract',
  sahkan: 'Tap again to confirm',
  kosongkanKiraan: 'Reset count',
  pasti: 'Sure?',
  kosongkan: 'Reset',
  sasaran: 'Target',
  baki: 'Remaining',
  pusingan: 'Rounds',
  tersimpan: 'Saved counts',
  bilPusingan: n => `${n} ${n === 1 ? 'round' : 'rounds'}`,
  lengkap: 'Tasbih complete, Alhamdulillah',
  lengkapHuraian: (nama, n) => `${nama} · round ${n}`,
  dikosongkan: 'Count cleared',
};
const TEKS = { ms, en };

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
  const t = useTeks(TEKS);
  const namaPreset = (p: Preset) => (p.id === 'bebas' ? t.bebas : p.name);

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
  /** Setiap zikir mendapat warna palet sendiri mengikut kedudukannya. */
  const warnaPreset = (p: Preset) => palet(PRESETS.indexOf(p));
  const w = warnaPreset(preset);

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
        const teks = teksSemasa(TEKS);
        toast.success(teks.lengkap, {
          description: teks.lengkapHuraian(PRESETS.find(p => p.id === id)?.name ?? '', (prev.cycles[id] ?? 0) + 1),
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
    toast.success(t.dikosongkan);
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
            {t.lede}
          </p>
        </motion.header>

        {/* Pemilih zikir: baris cip pil yang boleh ditatal mendatar. Cip aktif
            mengambil warna zikir itu, sama seperti gelang di bawah. */}
        <motion.div
          variants={naikMasuk}
          className="-mx-5 mt-8 overflow-x-auto px-5 py-1 lg:mx-0 lg:px-0"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex w-max items-center gap-2">
            {PRESETS.map(p => {
              const aktif = p.id === preset.id;
              const wp = warnaPreset(p);
              return (
                <button
                  key={p.id}
                  onClick={() => switchPreset(p.id)}
                  aria-pressed={aktif}
                  className={cn(
                    'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors',
                    aktif
                      ? cn('font-semibold', wp.lembut, wp.teks)
                      : 'bg-card text-muted-foreground shadow-sm hover:text-foreground',
                  )}
                >
                  <span className={cn('size-2 rounded-full', wp.pekat)} aria-hidden />
                  {namaPreset(p)}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={naikMasuk} className="flex select-none flex-col items-center pt-10">
          {/* Lafaz ialah perkara yang dibaca, jadi ia mendapat saiz sebenar
              dan bukan sekadar kapsyen di atas bulatan. */}
          {preset.arabic ? (
            <p dir="rtl" lang="ar" className="font-arab max-w-[22ch] text-center text-3xl leading-[1.9] lg:text-4xl">
              {preset.arabic}
            </p>
          ) : (
            <p className="paparan text-2xl">{t.kiraanBebas}</p>
          )}

          <motion.button
            type="button"
            onClick={increment}
            whileTap={{ scale: 0.955 }}
            transition={spring.ketik}
            className="group relative mt-10 w-[min(74vw,320px)] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            aria-label={t.tambah}
          >
            <span
              key={`complete-${completeKey}`}
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                animation: completeKey > 0 ? 'tasbihComplete 700ms ease-out' : undefined,
                background: `radial-gradient(circle, oklch(from ${w.css} l c h / 0.35), transparent 70%)`,
              }}
            />

            {/* Cakera putih di bawah gelang, seperti kad bulat di atas latar. */}
            <span
              className="pointer-events-none absolute inset-[4%] rounded-full bg-card"
              style={{ boxShadow: 'var(--bayang-kad)' }}
            />

            <svg viewBox="0 0 300 300" className="relative block w-full" aria-hidden>
              <circle
                cx="150" cy="150" r={RING_RADIUS}
                fill="none"
                stroke={`oklch(from ${w.css} l c h / 0.18)`}
                strokeWidth="8"
              />
              {hasTarget && (
                <circle
                  cx="150" cy="150" r={RING_RADIUS}
                  fill="none"
                  stroke={w.css}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 150 150)"
                  style={{ transition: 'stroke-dashoffset 250ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}
              <defs>
                <radialGradient id="inner-fill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor={`oklch(from ${w.css} l c h / 0.1)`} />
                  <stop offset="100%" stopColor={`oklch(from ${w.css} l c h / 0)`} />
                </radialGradient>
              </defs>
              <circle cx="150" cy="150" r={RING_RADIUS - 8} fill="url(#inner-fill)" />
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
                <span dir="rtl" lang="ar" className={cn('font-arab mt-2 text-2xl', w.teks)}>
                  {toArabic(count)}
                </span>
              )}
            </div>
          </motion.button>

          <div className="mt-12 flex items-center gap-3">
            <button
              onClick={decrement}
              disabled={count === 0}
              aria-label={t.tolakSatu}
              className="flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm shadow-sm transition-colors hover:bg-muted disabled:opacity-30"
            >
              <Minus className="size-4" />
              {t.tolak}
            </button>
            <button
              onClick={handleReset}
              aria-label={resetArmed ? t.sahkan : t.kosongkanKiraan}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-colors',
                resetArmed
                  ? 'bg-amaran-lembut font-semibold text-amaran'
                  : 'bg-card shadow-sm hover:bg-muted',
              )}
            >
              {resetArmed ? <Check className="size-4" /> : <RotateCcw className="size-4" />}
              {resetArmed ? t.pasti : t.kosongkan}
            </button>
          </div>
        </motion.div>

        {/* Statistik sebagai jubin berwarna lembut. */}
        <motion.dl
          variants={naikMasuk}
          className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-2.5 sm:gap-3"
        >
          {([
            [t.sasaran, hasTarget ? preset.target : '—', 0],
            [t.baki, hasTarget ? preset.target - count : '—', 2],
            [t.pusingan, cycles, 4],
          ] as const).map(([label, nilai, anjak]) => {
            const wt = palet(PRESETS.indexOf(preset) + anjak);
            return (
              <div key={label} className={cn('rounded-3xl p-4', wt.lembut)}>
                <dd className={cn('angka-paparan text-3xl leading-none', wt.teks)}>{nilai}</dd>
                <dt className="mt-2 text-xs leading-snug text-foreground/70 sm:text-sm">{label}</dt>
              </div>
            );
          })}
        </motion.dl>

        {/* Sebelum ini senarai ini tersembunyi di dalam helaian "Pilih" yang
            hanya mengulang baris tab di atas. Ia kini kekal di halaman. */}
        {tersimpan.length > 0 && (
          <motion.section variants={naikMasuk} className="mx-auto mt-14 max-w-md">
            <h2 className="paparan text-2xl">{t.tersimpan}</h2>
            <div className="kad mt-5 divide-y divide-border/50 px-4">
              {tersimpan.map(p => (
                <button
                  key={p.id}
                  onClick={() => switchPreset(p.id)}
                  className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={cn('size-2.5 shrink-0 rounded-full', warnaPreset(p).pekat)} aria-hidden />
                    <span className={p.id === preset.id ? cn('font-semibold', warnaPreset(p).teks) : 'transition-colors hover:text-foreground'}>
                      {namaPreset(p)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="angka-paparan text-xl">{state.counts[p.id] ?? 0}</span>
                    {p.target > 0 && (
                      <span className="text-sm text-muted-foreground"> / {p.target}</span>
                    )}
                    {(state.cycles[p.id] ?? 0) > 0 && (
                      <span className="ml-3 text-sm text-muted-foreground">
                        {t.bilPusingan(state.cycles[p.id] ?? 0)}
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
