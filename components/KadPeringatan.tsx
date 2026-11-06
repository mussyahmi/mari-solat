'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Heart, ScrollText, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ambilTeks, bacaSimpanan, NAMA_KITAB, pautan, PERISTIWA_SIMPAN, togolSimpan, TOPIK,
  type Peringatan, type Teks,
} from '@/lib/peringatan';
import { cn } from '@/lib/utils';
import { palet } from '@/lib/aksen';

const ms = {
  quran: 'Al-Quran',
  hadis: 'Hadis',
  semua: 'Kedua-dua',
  bacaQuran: 'Baca di Quran.com',
  bacaHadis: 'Baca di Sunnah.com',
  indonesia: 'Terjemahan Bahasa Indonesia (tiada terjemahan Melayu rasmi)',
  bacaPenuh: 'Baca penuh',
  ringkas: 'Ringkaskan',
  simpan: 'Simpan',
  buang: 'Buang dari simpanan',
  gagal: 'Teks tidak dapat dimuatkan. Semak sambungan internet.',
  kongsi: 'Kongsi',
  disalin: 'Disalin. Tampal untuk berkongsi.',
};
const en: typeof ms = {
  quran: 'Quran',
  hadis: 'Hadith',
  semua: 'Both',
  bacaQuran: 'Read on Quran.com',
  bacaHadis: 'Read on Sunnah.com',
  indonesia: 'Indonesian translation (no official Malay translation exists)',
  bacaPenuh: 'Read in full',
  ringkas: 'Show less',
  simpan: 'Save',
  buang: 'Remove from saved',
  gagal: "Couldn't load the text. Check your internet connection.",
  kongsi: 'Share',
  disalin: 'Copied. Paste to share.',
};
const TEKS = { ms, en };

type Mod = 'en' | 'bm' | 'dua';

// Al-Quran hijau, hadis jingga — seperti dalam kebanyakan aplikasi rujukan,
// supaya jenis sumber terbaca sebelum teksnya.
const GAYA = {
  quran: { jalur: 'var(--w3)', teks: 'text-w3', isi: 'bg-w3', lembut: 'bg-w3-lembut', tint: 'var(--w3-lembut)', Ikon: BookOpen },
  hadis: { jalur: 'var(--w5)', teks: 'text-w5', isi: 'bg-w5', lembut: 'bg-w5-lembut', tint: 'var(--w5-lembut)', Ikon: ScrollText },
} as const;

/** Bintang lapan (rub el hizb) untuk corak latar di sudut kad. */
const BINTANG = 'M50 0 L61 26 L85 15 L74 39 L100 50 L74 61 L85 85 L61 74 L50 100 L39 74 L15 85 L26 61 L0 50 L26 39 L15 15 L39 26 Z';

const ANGKA_ARAB = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const angkaArab = (n: number) => String(n).split('').map(d => ANGKA_ARAB[Number(d)]).join('');

/** Satu ayat atau hadis, dengan teks diambil dari sumber asalnya. */
/** Urutan warna pastel untuk kad berturutan — kad bersebelahan sentiasa berbeza warna. */
const PUTARAN = [3, 0, 1, 4, 5, 2];

export default function KadPeringatan({ p, kedudukan }: { p: Peringatan; kedudukan?: number }) {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [teks, setTeks] = useState<Teks | null>(null);
  const [gagal, setGagal] = useState(false);
  const [mod, setMod] = useState<Mod>('dua');
  const [penuh, setPenuh] = useState(false);
  const [disimpan, setDisimpan] = useState(false);
  // Warna berputar mengikut kedudukan kad dalam senarai, supaya halaman
  // berwarna-warni semasa ditatal walaupun semua kad satu topik; tanpa
  // kedudukan, warna topik digunakan. Ikon masih membezakan Al-Quran dan hadis.
  const w = palet(kedudukan !== undefined ? PUTARAN[kedudukan % PUTARAN.length] : TOPIK.find(x => x.id === p.topik[0])?.warna ?? 0);
  const g = { ...GAYA[p.jenis], jalur: w.css, teks: w.teks, isi: w.pekat, lembut: w.lembut, tint: w.css.replace(')', '-lembut)') }; // var(--wN) → var(--wN-lembut)

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
        petikan ? 'text-[15px] leading-relaxed text-foreground/75' : 'text-[17px] leading-relaxed text-foreground/90',
        panjang && (petikan ? 'line-clamp-4' : 'line-clamp-6'),
      )}>
        {teks[k]}
      </p>
      {k === 'bm' && p.jenis === 'hadis' && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{t.indonesia}</p>
      )}
    </div>
  );

  const kongsi = async () => {
    if (!teks) return;
    const isi = `${teks.arab ? `${teks.arab}\n\n` : ''}${teks[utama]}\n\n(${rujukan})\n${pautan(p)}`;
    try {
      if (navigator.share) { await navigator.share({ text: isi }); return; }
      await navigator.clipboard.writeText(isi);
      toast.success(t.disalin);
    } catch { /* dibatalkan pengguna */ }
  };

  const { Ikon } = g;

  return (
    // Wash warna sumber di bahagian atas kad, pudar ke putih — Al-Quran hijau, hadis jingga.
    <article
      className="relative isolate overflow-hidden rounded-3xl border p-5 shadow-[var(--bayang-kad)]"
      style={{
        background: `linear-gradient(170deg, ${g.tint} 0%, var(--card) 62%)`,
        borderColor: `oklch(from ${g.jalur} l c h / 0.3)`,
      }}
    >
      {/* Corak bintang lapan yang pudar di sudut — hiasan, bukan kandungan. */}
      <svg viewBox="0 0 100 100" className={cn('pointer-events-none absolute -right-10 -top-10 -z-10 size-44 rotate-12 opacity-[0.16]', g.teks)} aria-hidden>
        <path d={BINTANG} fill="currentColor" />
        <path d={BINTANG} fill="none" stroke="currentColor" strokeWidth="3" transform="translate(50 50) scale(.55) translate(-50 -50)" />
      </svg>

      <header className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, oklch(from ${g.jalur} calc(l + 0.16) c calc(h - 30)), oklch(from ${g.jalur} calc(l + 0.04) c h))` }}
        >
          <Ikon className="size-5" />
        </span>
        <p className="min-w-0 flex-1 leading-tight">
          <span className={cn('block text-xs font-bold uppercase tracking-widest', g.teks)}>{p.jenis === 'quran' ? t.quran : t.hadis}</span>
          <span className="mt-0.5 block truncate text-sm font-medium text-foreground/80">{rujukan}</span>
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

      <div className="mt-5">
        {gagal ? (
          <p className="text-sm text-muted-foreground">{t.gagal}</p>
        ) : !teks ? (
          <div className="space-y-2">
            <Skeleton className="mx-auto h-8 w-4/5" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            {teks.arab && p.jenis === 'quran' && (
              <>
                {/* Ayat sebagai pusat kad, ditutup penanda nombor ayat tradisional. */}
                <p dir="rtl" lang="ar" className="font-arab text-center text-[1.7rem] leading-[2.1] text-foreground">
                  {teks.arab}{' '}
                  <span className={cn('whitespace-nowrap text-[1.4rem]', g.teks)}>﴿{angkaArab(p.ayat)}﴾</span>
                </p>
                <div className={cn('my-4 flex items-center gap-3', g.teks)} aria-hidden>
                  <span className="h-px flex-1 bg-current opacity-20" />
                  <span className="text-xs">✦</span>
                  <span className="h-px flex-1 bg-current opacity-20" />
                </div>
              </>
            )}
            {p.jenis === 'hadis' ? (
              <div className="relative pl-7">
                <span className={cn('paparan absolute -left-1 -top-3 text-5xl leading-none opacity-30', g.teks)} aria-hidden>“</span>
                {blokTeks(utama, false)}
              </div>
            ) : (
              blokTeks(utama, false)
            )}
            {kedua && blokTeks(kedua, true)}
            {p.jenis === 'hadis' && (
              <button type="button" onClick={() => setPenuh(v => !v)} className={cn('mt-3 text-sm font-semibold', g.teks)}>
                {penuh ? t.ringkas : t.bacaPenuh}
              </button>
            )}
          </>
        )}
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: `oklch(from ${g.jalur} l c h / 0.2)` }}>
        <div className={cn('flex gap-1 rounded-full p-1', g.lembut)}>
          {([['en', 'EN'], ['bm', 'BM'], ['dua', t.semua]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMod(k)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                mod === k ? cn(g.isi, 'text-white shadow-sm') : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={kongsi} disabled={!teks} className={cn('flex items-center gap-1.5 text-sm font-semibold disabled:opacity-40', g.teks)}>
            <Share2 className="size-4" /> {t.kongsi}
          </button>
          <a
            href={pautan(p)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {p.jenis === 'quran' ? 'Quran.com' : 'Sunnah.com'}
          </a>
        </div>
      </footer>
    </article>
  );
}
