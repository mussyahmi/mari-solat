'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Minus, RotateCcw, Maximize2, Minimize2, ListPlus, Check } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
  const [focusMode, setFocusMode] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [completeKey, setCompleteKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  // Focus mode chrome control
  useEffect(() => {
    document.body.classList.toggle('focus-mode', focusMode);
    return () => document.body.classList.remove('focus-mode');
  }, [focusMode]);

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
    setSheetOpen(false);
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
  const RING_RADIUS = 138;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS;
  const dashOffset = RING_CIRC * (1 - progress);

  return (
    <div className="min-h-full lg:flex">
      {!focusMode && <Sidebar />}

      <main
        className={`flex-1 min-w-0 flex flex-col ${
          focusMode
            ? 'px-4 py-6 h-[100dvh]'
            : 'px-4 py-8 lg:px-10 lg:py-10 max-w-3xl mx-auto lg:mx-0 lg:max-w-none'
        }`}
      >
        {!focusMode && (
          <header className="mb-6 lg:mb-8">
            <h1 className="text-3xl font-display tracking-tight">Tasbih</h1>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Tekan untuk kira selawat, zikir, atau tasbih harian.
            </p>
          </header>
        )}

        {/* Preset chips */}
        {!focusMode && (
          <div className="mb-2 -mx-4 lg:mx-0">
            <div
              className="flex gap-2 overflow-x-auto px-4 lg:px-0 pb-2"
              style={{ scrollbarWidth: 'none' }}
            >
              {PRESETS.map(p => {
                const active = p.id === preset.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => switchPreset(p.id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main counter area */}
        <div className="flex-1 flex flex-col items-center justify-center select-none">
          {/* Preset meta */}
          <div className="text-center mb-6 lg:mb-8 min-h-[3.5rem]">
            {preset.arabic && (
              <p
                dir="rtl"
                lang="ar"
                className="text-xl lg:text-2xl text-foreground/80 leading-relaxed"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {preset.arabic}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-semibold mt-2">
              {preset.name}
              {hasTarget && <span className="text-muted-foreground/40"> · sasaran {preset.target}</span>}
            </p>
          </div>

          {/* Cycle dots */}
          <CycleDots cycles={cycles} />

          {/* Tap circle */}
          <button
            type="button"
            onClick={increment}
            className="relative my-6 group focus:outline-none"
            aria-label="Tambah kiraan"
          >
            {/* Outer pulse on cycle complete */}
            <span
              key={`complete-${completeKey}`}
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                animation: completeKey > 0 ? 'tasbihComplete 700ms ease-out' : undefined,
                background: 'radial-gradient(circle, oklch(from var(--primary) l c h / 0.35), transparent 70%)',
              }}
            />

            {/* SVG progress ring */}
            <svg
              width="300"
              height="300"
              viewBox="0 0 300 300"
              className="block transition-transform duration-100 group-active:scale-[0.985]"
            >
              {/* Outer decorative ring (faint) */}
              <circle
                cx="150"
                cy="150"
                r="148"
                fill="none"
                stroke="oklch(from var(--border) l c h / 0.5)"
                strokeWidth="1"
                strokeDasharray="1 4"
              />
              {/* Track */}
              <circle
                cx="150"
                cy="150"
                r={RING_RADIUS}
                fill="none"
                stroke="oklch(from var(--muted-foreground) l c h / 0.15)"
                strokeWidth="2"
              />
              {/* Progress */}
              {hasTarget && (
                <circle
                  cx="150"
                  cy="150"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 150 150)"
                  style={{ transition: 'stroke-dashoffset 250ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}
              {/* Inner fill — subtle gradient */}
              <defs>
                <radialGradient id="inner-fill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="oklch(from var(--primary) l c h / 0.06)" />
                  <stop offset="100%" stopColor="oklch(from var(--primary) l c h / 0)" />
                </radialGradient>
              </defs>
              <circle cx="150" cy="150" r={RING_RADIUS - 6} fill="url(#inner-fill)" />
            </svg>

            {/* Count overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                key={`count-${pulseKey}`}
                className="font-display tabular-nums leading-none text-foreground"
                style={{
                  fontSize: count >= 1000 ? '5rem' : count >= 100 ? '6rem' : '7rem',
                  animation: pulseKey > 0 ? 'digitIn 180ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                }}
              >
                {count}
              </span>
              <span className="text-2xl text-muted-foreground/40 tabular-nums mt-1" style={{ fontFamily: 'var(--font-display)' }}>
                {toArabic(count)}
              </span>
            </div>
          </button>

          {/* Hint */}
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-semibold mt-2">
            {hasTarget ? `${preset.target - count} lagi untuk lengkap` : 'Tekan di mana-mana sahaja'}
          </p>
        </div>

        {/* Bottom actions */}
        <div className={`shrink-0 ${focusMode ? 'mt-4' : 'mt-8'} flex items-center justify-center gap-1.5`}>
          <ActionButton onClick={decrement} disabled={count === 0} label="Tolak satu">
            <Minus className="size-4" />
          </ActionButton>

          <ActionButton
            onClick={handleReset}
            label={resetArmed ? 'Tekan sekali lagi untuk sahkan' : 'Kosongkan'}
            variant={resetArmed ? 'warn' : 'default'}
          >
            {resetArmed ? <Check className="size-4" /> : <RotateCcw className="size-4" />}
            {resetArmed && <span className="ml-2 text-xs">Pasti?</span>}
          </ActionButton>

          {!focusMode && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                  aria-label="Pilih zikir"
                >
                  <ListPlus className="size-4" />
                  <span>Pilih</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle className="font-display tracking-tight text-2xl">Pilih Zikir</SheetTitle>
                  <SheetDescription>Tukar zikir aktif. Kiraan setiap zikir disimpan berasingan.</SheetDescription>
                </SheetHeader>
                <div className="divide-y divide-border/50 px-4 pb-6">
                  {PRESETS.map(p => {
                    const active = p.id === preset.id;
                    const pCount = state.counts[p.id] ?? 0;
                    const pCycles = state.cycles[p.id] ?? 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => switchPreset(p.id)}
                        className="w-full text-left py-4 flex items-center justify-between gap-4 group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${active ? 'text-primary' : 'text-foreground group-hover:text-primary transition-colors'}`}>
                              {p.name}
                            </span>
                            {active && <Check className="size-3.5 text-primary" />}
                          </div>
                          {p.arabic && (
                            <p
                              dir="rtl"
                              lang="ar"
                              className="text-base text-muted-foreground/70 mt-1 truncate"
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              {p.arabic}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {pCount}{p.target > 0 && <span className="text-muted-foreground/40"> / {p.target}</span>}
                          </p>
                          {pCycles > 0 && (
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              {pCycles} pusingan
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          )}

          <ActionButton onClick={() => setFocusMode(f => !f)} label={focusMode ? 'Keluar mod fokus' : 'Mod fokus'}>
            {focusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </ActionButton>
        </div>
      </main>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  label,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  variant?: 'default' | 'warn';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center h-10 min-w-10 px-3 rounded-full transition-colors text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed ${
        variant === 'warn'
          ? 'bg-primary/15 text-primary'
          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

function CycleDots({ cycles }: { cycles: number }) {
  if (cycles <= 0) {
    return <div className="h-2" />;
  }
  // Show up to 7 dots, then "+N" overflow
  const visible = Math.min(cycles, 7);
  const overflow = cycles - visible;
  return (
    <div className="flex items-center gap-1.5 h-2">
      {Array.from({ length: visible }).map((_, i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-primary/70"
        />
      ))}
      {overflow > 0 && (
        <span className="ml-1 text-[10px] tabular-nums text-muted-foreground/60 font-semibold">
          +{overflow}
        </span>
      )}
    </div>
  );
}
