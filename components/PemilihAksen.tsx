'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Moon, Sun } from 'lucide-react';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { AKSEN, aksenSemasa, tetapkanAksen, type Aksen } from '@/lib/aksen';
import { SAIZ_TEKS, saizSemasa, tetapkanSaiz, type SaizTeks } from '@/lib/saiz-teks';
import { cn } from '@/lib/utils';

const ms = { warna: 'Warna tema', mod: 'Mod', cerah: 'Cerah', gelap: 'Gelap', saiz: 'Saiz teks' };
const en: typeof ms = { warna: 'Theme colour', mod: 'Mode', cerah: 'Light', gelap: 'Dark', saiz: 'Text size' };
const TEKS = { ms, en };

/** Pilihan warna tema dan mod cerah/gelap, untuk halaman Tetapan. */
export default function PemilihAksen() {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const { resolvedTheme, setTheme } = useTheme();
  const [aksen, setAksen] = useState<Aksen>('hijau');
  const [saiz, setSaiz] = useState<SaizTeks>('normal');
  const [lekap, setLekap] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAksen(aksenSemasa());
    setSaiz(saizSemasa());
    setLekap(true);
  }, []);

  const pilih = (a: Aksen) => { setAksen(a); tetapkanAksen(a); };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{t.warna}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {AKSEN.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => pilih(a.id)}
              aria-label={a.nama[bahasa]}
              aria-pressed={aksen === a.id}
              title={a.nama[bahasa]}
              className={cn(
                'flex size-10 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105',
                lekap && aksen === a.id && 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
              )}
              style={{ background: `oklch(0.6 0.15 ${a.rona})` }}
            >
              {lekap && aksen === a.id && <Check className="size-5" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{t.mod}</p>
        <div className="mt-3 flex w-full rounded-full bg-muted p-1">
          {(['light', 'dark'] as const).map(m => {
            const aktif = lekap && resolvedTheme === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setTheme(m)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition-colors',
                  aktif ? 'bg-card font-semibold text-foreground shadow-sm dark:bg-accent dark:text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'light' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {m === 'light' ? t.cerah : t.gelap}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{t.saiz}</p>
        <div className="mt-3 grid grid-cols-3 rounded-2xl bg-muted p-1">
          {SAIZ_TEKS.map((z, i) => {
            const aktif = lekap && saiz === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => { setSaiz(z.id); tetapkanSaiz(z.id); }}
                aria-pressed={aktif}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition-colors',
                  aktif ? 'bg-card text-foreground shadow-sm dark:bg-accent dark:text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* "Aa" dalam saiz berbeza menunjukkan pilihan tanpa perlu dibaca. */}
                <span className="font-semibold leading-none" style={{ fontSize: `${14 + i * 3}px` }}>Aa</span>
                <span className="text-xs">{z.nama[bahasa]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
