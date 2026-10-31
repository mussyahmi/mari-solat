'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ambilTeks, bacaSimpanan, NAMA_KITAB, pautan, PERISTIWA_SIMPAN, togolSimpan,
  type Peringatan, type Teks,
} from '@/lib/peringatan';
import { cn } from '@/lib/utils';

const ms = {
  quran: 'Al-Quran',
  hadis: 'Hadis',
  semua: 'Kedua-dua',
  bacaQuran: 'Baca di Quran.com',
  bacaHadis: 'Baca di Sunnah.com',
  indonesia: 'Terjemahan Bahasa Indonesia — tiada terjemahan Melayu rasmi',
  bacaPenuh: 'Baca penuh',
  ringkas: 'Ringkaskan',
  simpan: 'Simpan',
  buang: 'Buang dari simpanan',
  gagal: 'Teks tidak dapat dimuatkan. Semak sambungan internet.',
};
const en: typeof ms = {
  quran: 'Quran',
  hadis: 'Hadith',
  semua: 'Both',
  bacaQuran: 'Read on Quran.com',
  bacaHadis: 'Read on Sunnah.com',
  indonesia: 'Indonesian translation — no official Malay translation exists',
  bacaPenuh: 'Read in full',
  ringkas: 'Show less',
  simpan: 'Save',
  buang: 'Remove from saved',
  gagal: "Couldn't load the text. Check your internet connection.",
};
const TEKS = { ms, en };

type Mod = 'en' | 'bm' | 'dua';

// Al-Quran hijau, hadis jingga — seperti dalam kebanyakan aplikasi rujukan,
// supaya jenis sumber terbaca sebelum teksnya.
const GAYA = {
  quran: { jalur: 'var(--w3)', teks: 'text-w3', isi: 'bg-w3' },
  hadis: { jalur: 'var(--w5)', teks: 'text-w5', isi: 'bg-w5' },
} as const;

/** Satu ayat atau hadis, dengan teks diambil dari sumber asalnya. */
export default function KadPeringatan({ p }: { p: Peringatan }) {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [teks, setTeks] = useState<Teks | null>(null);
  const [gagal, setGagal] = useState(false);
  const [mod, setMod] = useState<Mod>('dua');
  const [penuh, setPenuh] = useState(false);
  const [disimpan, setDisimpan] = useState(false);
  const g = GAYA[p.jenis];

  useEffect(() => {
    let batal = false;
    ambilTeks(p).then(x => { if (!batal) setTeks(x); }).catch(() => { if (!batal) setGagal(true); });
    return () => { batal = true; };
  }, [p]);

  useEffect(() => {
    const kemas = () => setDisimpan(bacaSimpanan().includes(p.id));
    kemas();
    window.addEventListener(PERISTIWA_SIMPAN, kemas);
    return () => window.removeEventListener(PERISTIWA_SIMPAN, kemas);
  }, [p.id]);

  const rujukan = p.jenis === 'quran'
    ? `${teks?.surah ?? ''} ${p.surah}:${p.ayat}`.trim()
    : `${NAMA_KITAB[p.kitab]} ${p.rasmi}`;

  // Bahasa antara muka didahulukan; yang satu lagi menjadi petikan di bawah.
  const utama: 'en' | 'bm' = mod === 'dua' ? (bahasa === 'en' ? 'en' : 'bm') : mod;
  const kedua: 'en' | 'bm' | null = mod === 'dua' ? (utama === 'en' ? 'bm' : 'en') : null;
  // Hadis membawa sanad penuh, jadi ia dipendekkan sehingga diminta.
  const panjang = p.jenis === 'hadis' && !penuh;

  const blokTeks = (k: 'en' | 'bm', petikan: boolean) => teks && (
    <div className={cn(petikan && 'mt-4 border-l-[3px] pl-4')} style={petikan ? { borderColor: g.jalur } : undefined}>
      <p className={cn(
        'whitespace-pre-line text-pretty',
        petikan ? 'text-[15px] leading-relaxed text-foreground/80' : 'text-[17px] leading-relaxed',
        panjang && (petikan ? 'line-clamp-4' : 'line-clamp-6'),
      )}>
        {teks[k]}
      </p>
      {k === 'bm' && p.jenis === 'hadis' && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{t.indonesia}</p>
      )}
    </div>
  );

  return (
    <article className="kad overflow-hidden border-t-4 p-5" style={{ borderTopColor: g.jalur }}>
      <header className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className={cn('font-semibold', g.teks)}>{p.jenis === 'quran' ? t.quran : t.hadis}</span>
          <span className="ml-2 text-muted-foreground">{rujukan}</span>
        </p>
        <button
          type="button"
          onClick={() => setDisimpan(togolSimpan(p.id).includes(p.id))}
          aria-label={disimpan ? t.buang : t.simpan}
          aria-pressed={disimpan}
          className="-m-1.5 shrink-0 rounded-full p-1.5 transition-transform active:scale-90"
        >
          <Heart className={cn('size-5', disimpan ? 'fill-w4 text-w4' : 'text-muted-foreground')} />
        </button>
      </header>

      <div className="mt-4">
        {gagal ? (
          <p className="text-sm text-muted-foreground">{t.gagal}</p>
        ) : !teks ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            {teks.arab && (
              <p dir="rtl" lang="ar" className="font-arab mb-4 text-right text-2xl leading-[2]">{teks.arab}</p>
            )}
            {blokTeks(utama, false)}
            {kedua && blokTeks(kedua, true)}
            {p.jenis === 'hadis' && (
              <button type="button" onClick={() => setPenuh(v => !v)} className={cn('mt-3 text-sm font-medium', g.teks)}>
                {penuh ? t.ringkas : t.bacaPenuh}
              </button>
            )}
          </>
        )}
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {([['en', 'EN'], ['bm', 'BM'], ['dua', t.semua]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMod(k)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                mod === k ? cn(g.isi, 'text-white') : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <a
          href={pautan(p)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          {p.jenis === 'quran' ? t.bacaQuran : t.bacaHadis}
        </a>
      </footer>
    </article>
  );
}
