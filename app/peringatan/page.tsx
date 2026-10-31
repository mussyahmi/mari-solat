'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import PageShell from '@/components/PageShell';
import KadPeringatan from '@/components/KadPeringatan';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { palet } from '@/lib/aksen';
import { bacaSimpanan, PERISTIWA_SIMPAN, SEMUA, TOPIK, type IdTopik } from '@/lib/peringatan';
import { cn } from '@/lib/utils';

const ms = {
  tajuk: 'Peringatan',
  lede: 'Ayat Al-Quran dan hadis sahih mengikut topik. Teks diambil terus daripada sumber asal — terjemahan Basmeih bagi Al-Quran, Sahih al-Bukhari dan Sahih Muslim bagi hadis.',
  semua: 'Semua',
  disimpan: 'Disimpan',
  tiadaSimpan: 'Belum ada yang disimpan. Tekan ikon hati pada mana-mana peringatan untuk menyimpannya di sini.',
  sebelum: 'Halaman sebelum',
  selepas: 'Halaman seterusnya',
  halaman: (n: number) => `Halaman ${n}`,
  julat: (a: number, b: number, n: number) => `${a}–${b} daripada ${n}`,
};
const en: typeof ms = {
  tajuk: 'Reminders',
  lede: 'Quran verses and authentic hadith by topic. Text comes straight from the original sources — Sahih International for the Quran, Sahih al-Bukhari and Sahih Muslim for hadith.',
  semua: 'All',
  disimpan: 'Saved',
  tiadaSimpan: 'Nothing saved yet. Tap the heart on any reminder to keep it here.',
  sebelum: 'Previous page',
  selepas: 'Next page',
  halaman: n => `Page ${n}`,
  julat: (a, b, n) => `${a}–${b} of ${n}`,
};
const TEKS = { ms, en };

type Tapis = 'semua' | 'disimpan' | IdTopik;

/** Enam sehalaman: cukup untuk dibaca sekali duduk, dan hanya enam kad mengambil teks serentak. */
const SEHALAMAN = 6;

export default function PeringatanPage() {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [tapis, setTapis] = useState<Tapis>('semua');
  const [simpanan, setSimpanan] = useState<string[]>([]);
  const [halaman, setHalaman] = useState(1);

  useEffect(() => {
    const kemas = () => setSimpanan(bacaSimpanan());
    kemas();
    window.addEventListener(PERISTIWA_SIMPAN, kemas);
    return () => window.removeEventListener(PERISTIWA_SIMPAN, kemas);
  }, []);

  const senarai = tapis === 'semua' ? SEMUA
    : tapis === 'disimpan' ? simpanan.map(id => SEMUA.find(p => p.id === id)).filter(p => p !== undefined)
      : SEMUA.filter(p => p.topik.includes(tapis));

  const jumlahHalaman = Math.max(1, Math.ceil(senarai.length / SEHALAMAN));
  // Membuang simpanan boleh mengecilkan senarai di bawah halaman semasa.
  const semasa = Math.min(halaman, jumlahHalaman);
  const pergi = (n: number) => {
    setHalaman(n);
    document.querySelector('main')?.closest('[tabindex]')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cip = (id: Tapis, label: React.ReactNode, warna?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => { setTapis(id); setHalaman(1); }}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors',
        tapis === id
          ? warna === undefined ? 'bg-foreground font-semibold text-background' : cn(palet(warna).lembut, palet(warna).teks, 'font-semibold')
          : 'bg-card text-foreground/80 shadow-sm hover:text-foreground'
      )}
    >
      {label}
    </button>
  );

  return (
    <PageShell tajuk={t.tajuk} lede={t.lede}>
      <div className="flex flex-wrap gap-2">
        {cip('semua', t.semua)}
        {TOPIK.map(x => cip(x.id, <><span className={cn('size-2 rounded-full', tapis === x.id ? 'bg-current' : palet(x.warna).pekat)} aria-hidden />{x.nama[bahasa]}</>, x.warna))}
        {cip('disimpan', <><Heart className="size-3.5" /> {t.disimpan}</>, 3)}
      </div>

      <div className="mt-6 grid max-w-3xl gap-4">
        {tapis === 'disimpan' && senarai.length === 0 && (
          <p className="kad p-5 text-sm text-muted-foreground">{t.tiadaSimpan}</p>
        )}
        {senarai.slice((semasa - 1) * SEHALAMAN, semasa * SEHALAMAN).map((p, i) => <KadPeringatan key={p.id} p={p} kedudukan={i} />)}
      </div>

      {jumlahHalaman > 1 && (
        <nav className="mt-8 flex max-w-3xl flex-col items-center gap-3" aria-label={t.halaman(semasa)}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => pergi(semasa - 1)}
              disabled={semasa === 1}
              aria-label={t.sebelum}
              className="flex size-10 items-center justify-center rounded-full bg-card shadow-sm transition-colors hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            {nomborHalaman(semasa, jumlahHalaman).map((n, i) => n === null ? (
              <span key={`jarak${i}`} className="w-6 text-center text-sm text-muted-foreground">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => pergi(n)}
                aria-label={t.halaman(n)}
                aria-current={n === semasa ? 'page' : undefined}
                className={cn(
                  'size-10 rounded-full text-sm font-semibold tabular-nums transition-colors',
                  n === semasa ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card text-foreground/70 shadow-sm hover:text-foreground'
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pergi(semasa + 1)}
              disabled={semasa === jumlahHalaman}
              aria-label={t.selepas}
              className="flex size-10 items-center justify-center rounded-full bg-card shadow-sm transition-colors hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t.julat((semasa - 1) * SEHALAMAN + 1, Math.min(semasa * SEHALAMAN, senarai.length), senarai.length)}
          </p>
        </nav>
      )}
    </PageShell>
  );
}

/** Halaman pertama, terakhir dan jiran halaman semasa; selebihnya "…" supaya muat pada telefon. */
function nomborHalaman(semasa: number, jumlah: number): (number | null)[] {
  if (jumlah <= 5) return Array.from({ length: jumlah }, (_, i) => i + 1);
  const set = new Set([1, jumlah, semasa - 1, semasa, semasa + 1].filter(n => n >= 1 && n <= jumlah));
  const susun = [...set].sort((a, b) => a - b);
  const hasil: (number | null)[] = [];
  susun.forEach((n, i) => {
    if (i > 0 && n - susun[i - 1] > 1) hasil.push(null);
    hasil.push(n);
  });
  return hasil;
}
