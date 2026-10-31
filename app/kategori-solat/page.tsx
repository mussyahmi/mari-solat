'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ban, CircleCheck, Hourglass, Sparkles, Star, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/PageShell';
import { bakiMasaTeks, binaWaktu, fetchSolat, type WaktuSolat } from '@/lib/solat';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import {
  HURAIAN_KATEGORI,
  KATEGORI,
  julatKategori,
  kategoriPada,
  senaraiJulat,
  type KategoriId,
} from '@/lib/kategori';
import { palet, WARNA_WAKTU } from '@/lib/aksen';
import { cn } from '@/lib/utils';

const ms = {
  tajuk: 'Kategori Waktu',
  lede: 'Setiap waktu solat fardu terbahagi kepada lima kategori, dari yang paling afdal hingga yang hampir terlepas.',
  tiadaZonTajuk: 'Pilih zon anda dahulu',
  tiadaZonTeks: 'Kategori waktu dikira daripada waktu solat zon anda.',
  keTetapan: 'Pergi ke Tetapan',
  ralatTajuk: 'Data tidak dapat dimuatkan',
  ralatTeks: 'Sambungan ke pangkalan data waktu solat gagal. Semak sambungan internet anda, kemudian muat semula halaman.',
  sekarangDalam: (n: string) => `Sekarang dalam waktu ${n}`,
  bertukarKepada: (k: string) => `Bertukar kepada ${k} dalam`,
  tamatDalam: (n: string) => `Waktu ${n} tamat dalam`,
  sekarang: 'Sekarang',
  diLuar: 'Di luar waktu solat',
  bermulaPada: (n: string) => `Waktu ${n} bermula`,
  waktu: 'Waktu',
  bermula: 'Bermula',
  berakhir: 'Berakhir',
  kategoriIni: 'Kategori ini',
};
const en: typeof ms = {
  tajuk: 'Prayer Time Categories',
  lede: 'Every obligatory prayer time is divided into five categories, from the most virtuous to the one about to be missed.',
  tiadaZonTajuk: 'Choose your zone first',
  tiadaZonTeks: "The categories are calculated from your zone's prayer times.",
  keTetapan: 'Go to Settings',
  ralatTajuk: "Data couldn't be loaded",
  ralatTeks: "We couldn't reach the prayer times database. Check your internet connection, then reload the page.",
  sekarangDalam: n => `Now in ${n} time`,
  bertukarKepada: k => `Changes to ${k} in`,
  tamatDalam: n => `${n} time ends in`,
  sekarang: 'Now',
  diLuar: 'Outside prayer time',
  bermulaPada: n => `${n} time begins at`,
  waktu: 'Prayer',
  bermula: 'Begins',
  berakhir: 'Ends',
  kategoriIni: 'This category',
};
const TEKS = { ms, en };

// Warna tetap setiap kategori: hijau yang paling afdal hingga merah jambu
// yang hampir terlepas. Indeks ke dalam PALET.
const WARNA_KATEGORI: Record<KategoriId, number> = {
  fadhilat: 2, ikhtiar: 1, jawaz: 5, karahah: 4, tahrim: 3,
};

const IKON_KATEGORI: Record<KategoriId, LucideIcon> = {
  fadhilat: Sparkles, ikhtiar: Star, jawaz: CircleCheck, karahah: Hourglass, tahrim: Ban,
};

const warnaWaktu = (nama: string) => WARNA_WAKTU[nama.toLowerCase() as keyof typeof WARNA_WAKTU] ?? 0;

function fmt12(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export default function KategoriSolatPage() {
  const t = useTeks(TEKS);
  const huraian = useTeks(HURAIAN_KATEGORI);
  const { bahasa } = useBahasa();
  const [memuat, setMemuat] = useState(true);
  const [tiadaZon, setTiadaZon] = useState(false);
  const [ralat, setRalat] = useState(false);
  const [kini, setKini] = useState(() => new Date());
  const [waktuHari, setWaktuHari] = useState<{
    semalam?: WaktuSolat;
    hariIni?: WaktuSolat;
    esok?: WaktuSolat;
  }>({});

  useEffect(() => {
    const jam = setInterval(() => setKini(new Date()), 1000);
    return () => clearInterval(jam);
  }, []);

  useEffect(() => {
    const zon = localStorage.getItem('msolat_zone_code');
    if (!zon) {
      setTiadaZon(true);
      setMemuat(false);
      return;
    }

    (async () => {
      try {
        const hariIni = new Date();
        const semalam = new Date(hariIni);
        semalam.setDate(hariIni.getDate() - 1);
        const esok = new Date(hariIni);
        esok.setDate(hariIni.getDate() + 1);

        const [td, tm, yd] = await Promise.all([
          fetchSolat(zon, hariIni),
          fetchSolat(zon, esok),
          fetchSolat(zon, semalam),
        ]);

        setWaktuHari({
          semalam: binaWaktu(yd.prayerTime),
          hariIni: binaWaktu(td.prayerTime),
          esok: binaWaktu(tm.prayerTime),
        });
      } catch {
        setRalat(true);
      } finally {
        setMemuat(false);
      }
    })();
  }, []);

  // Julat dahulunya dibina di sini dengan salinan logik halaman utama, dan
  // kedua-duanya terpesong: senarai ini termasuk Isyak, senarai satu lagi
  // tidak. Kedua-duanya kini membaca dari lib/kategori.
  const senarai = waktuHari.hariIni
    ? senaraiJulat(waktuHari.hariIni, kini, { semalam: waktuHari.semalam, esok: waktuHari.esok })
    : [];
  const semasa = senarai.find(w => kini >= w.mula && kini < w.tamat) ?? null;
  const julat = semasa ? julatKategori(semasa.mula, semasa.tamat) : null;
  const kategoriSemasa: KategoriId | null = julat ? kategoriPada(julat, kini) : null;
  const tamatKategori = kategoriSemasa && julat ? julat[kategoriSemasa].ke : null;
  const bakiMs = tamatKategori ? Math.max(tamatKategori.getTime() - kini.getTime(), 0) : 0;

  const indeksSemasa = kategoriSemasa ? KATEGORI.findIndex(k => k.id === kategoriSemasa) : -1;
  const kategoriSeterusnya = indeksSemasa >= 0 ? KATEGORI[indeksSemasa + 1] ?? null : null;
  const julatSeterusnya = senarai.find(w => w.mula > kini) ?? null;

  const jumlahMs = semasa ? semasa.tamat.getTime() - semasa.mula.getTime() : 0;
  const kadarKini = semasa ? ((kini.getTime() - semasa.mula.getTime()) / jumlahMs) * 100 : 0;

  return (
    <PageShell
      tajuk={t.tajuk}
      lede={t.lede}
    >
      {memuat ? (
        <div className="space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="space-y-6">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-3xl" />
            ))}
          </div>
        </div>
      ) : tiadaZon ? (
        <Panduan
          tajuk={t.tiadaZonTajuk}
          teks={t.tiadaZonTeks}
          pautan={t.keTetapan}
        />
      ) : ralat ? (
        <Panduan
          tajuk={t.ralatTajuk}
          teks={t.ralatTeks}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Jawapan halaman ini ialah nama kategori — itu yang dicari orang.
              Kiraan detik memberitahu bila ia bertukar. */}
          {semasa && kategoriSemasa ? (
            (() => {
              const p = palet(WARNA_KATEGORI[kategoriSemasa]);
              const pw = palet(warnaWaktu(semasa.nama));
              const Ikon = IKON_KATEGORI[kategoriSemasa];
              return (
                <div className={cn('flex flex-col items-start gap-3 rounded-3xl p-5 sm:p-6', p.lembut)}>
                  <p className="flex items-center gap-2 text-sm text-foreground/70">
                    <span className={cn('size-2 rounded-full', pw.pekat)} />
                    {t.sekarangDalam(semasa.nama)}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl text-primary-foreground sm:size-16', p.pekat)}>
                      <Ikon className="size-7" strokeWidth={2} />
                    </span>
                    <p className={cn('paparan text-[14vw] leading-none sm:text-6xl lg:text-7xl', p.teks)}>
                      {KATEGORI.find(k => k.id === kategoriSemasa)!.title}
                    </p>
                  </div>
                  <p className="text-foreground/70">
                    {kategoriSeterusnya ? t.bertukarKepada(kategoriSeterusnya.title) : t.tamatDalam(semasa.nama)}{' '}
                    <span className="tabular font-semibold text-foreground">{bakiMasaTeks(bakiMs, bahasa)}</span>
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="kad flex flex-col items-start gap-2 p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">{t.sekarang}</p>
              <p className="paparan text-4xl leading-tight text-muted-foreground lg:text-5xl">
                {t.diLuar}
              </p>
              {julatSeterusnya && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                  {t.bermulaPada(julatSeterusnya.nama)}{' '}
                  <span
                    className={cn(
                      'tabular rounded-full px-3 py-0.5 text-sm font-semibold',
                      palet(warnaWaktu(julatSeterusnya.nama)).lembut,
                      palet(warnaWaktu(julatSeterusnya.nama)).teks
                    )}
                  >
                    {fmt12(julatSeterusnya.mula)}
                  </span>
                </p>
              )}
            </div>
          )}

          {semasa && julat && (
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {(
                [
                  [t.waktu, semasa.nama, warnaWaktu(semasa.nama), 'paparan'],
                  [t.bermula, fmt12(semasa.mula), 4, 'angka-paparan'],
                  [t.berakhir, fmt12(semasa.tamat), 0, 'angka-paparan'],
                  [
                    t.kategoriIni,
                    `${fmt12(julat[kategoriSemasa!].dari)} – ${fmt12(julat[kategoriSemasa!].ke)}`,
                    WARNA_KATEGORI[kategoriSemasa!],
                    'angka-paparan',
                  ],
                ] as const
              ).map(([label, nilai, w, fon]) => (
                <div key={label} className="kad p-4">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className={cn(fon, 'mt-1.5 text-xl leading-tight sm:text-2xl', palet(w).teks)}>{nilai}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Kategori ialah julat masa yang berturutan, jadi lebarnya
              menunjukkan tempoh sebenar masing-masing. */}
          {semasa && julat && (
            <section className="kad p-5">
              <div className="relative flex h-4 gap-1">
                {KATEGORI.map(k => {
                  const w = julat[k.id];
                  const lebar = ((w.ke.getTime() - w.dari.getTime()) / jumlahMs) * 100;
                  const aktif = k.id === kategoriSemasa;
                  const css = palet(WARNA_KATEGORI[k.id]).css;
                  return (
                    <div
                      key={k.id}
                      style={{
                        width: `${lebar}%`,
                        background: aktif ? css : `oklch(from ${css} l c h / 0.35)`,
                      }}
                      className="h-full min-w-1.5 rounded-full"
                    />
                  );
                })}
                <div
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow-sm ring-[3px] ring-foreground"
                  style={{ left: `${Math.min(Math.max(kadarKini, 0), 100)}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span className="tabular">{fmt12(semasa.mula)}</span>
                <span className="tabular">{fmt12(semasa.tamat)}</span>
              </div>
            </section>
          )}

          <ol className="kad divide-y divide-border/50 px-4 sm:px-5">
            {KATEGORI.map(item => {
              const aktif = item.id === kategoriSemasa;
              const w = julat?.[item.id];
              const p = palet(WARNA_KATEGORI[item.id]);
              const Ikon = IKON_KATEGORI[item.id];
              return (
                <li key={item.id} className="flex gap-4 py-5">
                  <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', p.lembut, p.teks)}>
                    <Ikon className="size-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className={cn('paparan text-lg', aktif && p.teks)}>{item.title}</p>
                      {aktif && (
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary-foreground', p.pekat)}>
                          {t.sekarang}
                        </span>
                      )}
                      {w && (
                        <p className="angka-paparan text-sm text-muted-foreground">
                          {fmt12(w.dari)} – {fmt12(w.ke)}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 max-w-[52ch] leading-relaxed text-muted-foreground">{huraian[item.id]}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </PageShell>
  );
}

function Panduan({ tajuk, teks, pautan }: { tajuk: string; teks: string; pautan?: string }) {
  return (
    <div className="kad max-w-md p-6">
      <p className="paparan text-2xl">{tajuk}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{teks}</p>
      {pautan && (
        <Link
          href="/tetapan"
          className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
        >
          {pautan}
        </Link>
      )}
    </div>
  );
}
