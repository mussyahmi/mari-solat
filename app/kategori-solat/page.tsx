'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/PageShell';
import { bakiMasaTeks, binaWaktu, fetchSolat, type WaktuSolat } from '@/lib/solat';
import {
  KATEGORI,
  julatKategori,
  kategoriPada,
  senaraiJulat,
  type KategoriId,
} from '@/lib/kategori';

function fmt12(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export default function KategoriSolatPage() {
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
      tajuk="Kategori Waktu"
      lede="Setiap waktu solat fardu terbahagi kepada lima kategori, dari yang paling afdal hingga yang hampir terlepas."
    >
      {memuat ? (
        <div className="space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="space-y-6">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ) : tiadaZon ? (
        <Panduan
          tajuk="Pilih zon anda dahulu"
          teks="Kategori waktu dikira daripada waktu solat zon anda."
          pautan="Pergi ke Tetapan"
        />
      ) : ralat ? (
        <Panduan
          tajuk="Data tidak dapat dimuatkan"
          teks="Sambungan ke pangkalan data waktu solat gagal. Semak sambungan internet anda, kemudian muat semula halaman."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {/* Jawapan halaman ini ialah nama kategori — itu yang dicari orang.
              Kiraan detik memberitahu bila ia bertukar. */}
          <div className="flex flex-col items-start gap-2">
            {semasa && kategoriSemasa ? (
              <>
                <p className="text-muted-foreground">Sekarang dalam waktu {semasa.nama}</p>
                <p className="paparan text-[16vw] leading-none text-primary lg:text-[8vw]">
                  {KATEGORI.find(k => k.id === kategoriSemasa)!.title}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {kategoriSeterusnya ? (
                    <>
                      Bertukar kepada {kategoriSeterusnya.title} dalam{' '}
                      <span className="tabular font-semibold text-foreground">{bakiMasaTeks(bakiMs)}</span>
                    </>
                  ) : (
                    <>
                      Waktu {semasa.nama} tamat dalam{' '}
                      <span className="tabular font-semibold text-foreground">{bakiMasaTeks(bakiMs)}</span>
                    </>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Sekarang</p>
                <p className="paparan text-[12vw] leading-none text-muted-foreground lg:text-[6vw]">
                  Di luar waktu solat
                </p>
                {julatSeterusnya && (
                  <p className="mt-1 text-muted-foreground">
                    Waktu {julatSeterusnya.nama} bermula{' '}
                    <span className="tabular font-semibold text-foreground">{fmt12(julatSeterusnya.mula)}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {semasa && julat && (
            <dl className="flex flex-wrap gap-x-12 gap-y-4 border-t border-border/60 pt-5">
              <div>
                <dt className="text-sm text-muted-foreground">Waktu</dt>
                <dd className="paparan mt-1 text-2xl">{semasa.nama}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Bermula</dt>
                <dd className="angka-paparan mt-1 text-2xl">{fmt12(semasa.mula)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Berakhir</dt>
                <dd className="angka-paparan mt-1 text-2xl">{fmt12(semasa.tamat)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Kategori ini</dt>
                <dd className="angka-paparan mt-1 text-2xl">
                  {fmt12(julat[kategoriSemasa!].dari)} – {fmt12(julat[kategoriSemasa!].ke)}
                </dd>
              </div>
            </dl>
          )}

          {/* Kategori ialah julat masa yang berturutan, jadi lebarnya
              menunjukkan tempoh sebenar masing-masing. */}
          {semasa && julat && (
            <section>
              <div className="relative flex h-3 overflow-hidden rounded-full bg-muted">
                {KATEGORI.map(k => {
                  const w = julat[k.id];
                  const lebar = ((w.ke.getTime() - w.dari.getTime()) / jumlahMs) * 100;
                  const aktif = k.id === kategoriSemasa;
                  return (
                    <div
                      key={k.id}
                      style={{ width: `${lebar}%` }}
                      className={`h-full border-r border-background/70 last:border-r-0 ${
                        aktif ? 'bg-primary' : 'bg-primary/25'
                      }`}
                    />
                  );
                })}
                <div
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
                  style={{ left: `${Math.min(Math.max(kadarKini, 0), 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span className="tabular">{fmt12(semasa.mula)}</span>
                <span className="tabular">{fmt12(semasa.tamat)}</span>
              </div>
            </section>
          )}

          <ol className="divide-y divide-border/50">
            {KATEGORI.map(item => {
              const aktif = item.id === kategoriSemasa;
              const w = julat?.[item.id];
              return (
                <li key={item.id} className="flex gap-4 py-6">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${aktif ? 'bg-primary' : 'bg-border'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <p className={`paparan text-lg ${aktif ? 'text-primary' : ''}`}>{item.title}</p>
                      {w && (
                        <p className="angka-paparan text-sm text-muted-foreground">
                          {fmt12(w.dari)} – {fmt12(w.ke)}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 max-w-[52ch] leading-relaxed text-muted-foreground">{item.description}</p>
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
    <div className="max-w-md">
      <p className="paparan text-2xl ">{tajuk}</p>
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
