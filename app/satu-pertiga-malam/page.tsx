'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/PageShell';
import { formatTime } from '@/utils/format';
import { fetchSolat, parseTime, pecahMs } from '@/lib/solat';

type Keadaan = 'sebelum' | 'berlangsung' | 'tamat';

function fmt12(d: Date) {
  const h = d.getHours() % 12 || 12;
  return `${h}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function SatuPertigaMalamPage() {
  const [memuat, setMemuat] = useState(true);
  const [tiadaZon, setTiadaZon] = useState(false);
  const [ralat, setRalat] = useState(false);
  const [kini, setKini] = useState(() => new Date());

  const [labelMaghrib, setLabelMaghrib] = useState('');
  const [labelSubuh, setLabelSubuh] = useState('');
  const [mulaSatuPertiga, setMulaSatuPertiga] = useState<Date | null>(null);
  const [subuh, setSubuh] = useState<Date | null>(null);
  const [maghrib, setMaghrib] = useState<Date | null>(null);
  const [tempohMalam, setTempohMalam] = useState(0);
  const [tempohSatuPertiga, setTempohSatuPertiga] = useState(0);

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

        const subuhHariIni = parseTime(formatTime(td.prayerTime.fajr));
        // Selepas tengah malam tetapi sebelum fajar, malam yang sedang
        // berjalan ialah maghrib semalam hingga subuh hari ini.
        const selepasTengahMalam = new Date() < subuhHariIni;

        const m = selepasTengahMalam
          ? parseTime(formatTime(yd.prayerTime.maghrib), semalam)
          : parseTime(formatTime(td.prayerTime.maghrib));
        const s = selepasTengahMalam
          ? subuhHariIni
          : parseTime(formatTime(tm.prayerTime.fajr), esok);

        const malamMs = s.getTime() - m.getTime();
        const satuPertigaMs = malamMs / 3;

        setLabelMaghrib(formatTime(selepasTengahMalam ? yd.prayerTime.maghrib : td.prayerTime.maghrib));
        setLabelSubuh(formatTime(selepasTengahMalam ? td.prayerTime.fajr : tm.prayerTime.fajr));
        setMaghrib(m);
        setSubuh(s);
        setMulaSatuPertiga(new Date(s.getTime() - satuPertigaMs));
        setTempohMalam(Math.round(malamMs / 60_000));
        setTempohSatuPertiga(Math.round(satuPertigaMs / 60_000));
      } catch {
        setRalat(true);
      } finally {
        setMemuat(false);
      }
    })();
  }, []);

  const keadaan: Keadaan | null =
    !mulaSatuPertiga || !subuh ? null : kini < mulaSatuPertiga ? 'sebelum' : kini < subuh ? 'berlangsung' : 'tamat';

  const julat = maghrib && subuh ? subuh.getTime() - maghrib.getTime() : 0;
  const kadarKini =
    maghrib && julat ? Math.min(Math.max(((kini.getTime() - maghrib.getTime()) / julat) * 100, 0), 100) : null;
  const kadarMula =
    maghrib && mulaSatuPertiga && julat ? ((mulaSatuPertiga.getTime() - maghrib.getTime()) / julat) * 100 : null;

  return (
    <PageShell
      tajuk="Satu Pertiga Malam"
      lede="Satu pertiga malam terakhir — waktu qiamullail dan doa mustajab. Ia dikira daripada maghrib hingga subuh, bukan daripada tengah malam."
    >
      {memuat ? (
        <div className="space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 w-80" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : tiadaZon ? (
        <Panduan
          tajuk="Pilih zon anda dahulu"
          teks="Waktu satu pertiga malam dikira daripada waktu maghrib dan subuh zon anda."
          pautan
        />
      ) : ralat ? (
        <Panduan
          tajuk="Data tidak dapat dimuatkan"
          teks="Sambungan ke pangkalan data waktu solat gagal. Semak sambungan internet anda, kemudian muat semula halaman."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {/* Fakta halaman ini bukan julat statik — ia berapa lama lagi.
              Jadi ia mendapat layanan kiraan detik yang sama seperti hero
              di halaman utama. */}
          <div className="flex flex-col items-start gap-2">
            <p className="paparan text-2xl leading-none lg:text-3xl">
              {keadaan === 'berlangsung'
                ? 'Berakhir dalam'
                : keadaan === 'tamat'
                  ? 'Telah berlalu'
                  : 'Bermula dalam'}
              <span className="tabular ml-3 font-sans text-base font-normal text-muted-foreground">
                {fmt12(mulaSatuPertiga!)} – {fmt12(subuh!)} AM
              </span>
            </p>

            {keadaan === 'tamat' ? (
              <p className="angka-paparan text-[14vw] leading-none text-muted-foreground lg:text-[8vw]">
                &mdash;
              </p>
            ) : (
              <KiraTurun
                ms={
                  keadaan === 'berlangsung'
                    ? subuh!.getTime() - kini.getTime()
                    : mulaSatuPertiga!.getTime() - kini.getTime()
                }
                aktif={keadaan === 'berlangsung'}
              />
            )}

            <p className="text-muted-foreground">
              {keadaan === 'berlangsung'
                ? 'Satu pertiga malam terakhir sedang berjalan.'
                : keadaan === 'tamat'
                  ? 'Waktu satu pertiga malam telah berakhir untuk malam ini.'
                  : 'Sehingga masuk satu pertiga malam terakhir.'}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-12 gap-y-4 border-t border-border/60 pt-5">
            <div>
              <dt className="text-sm text-muted-foreground">Maghrib</dt>
              <dd className="angka-paparan mt-1 text-2xl">{labelMaghrib}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Subuh</dt>
              <dd className="angka-paparan mt-1 text-2xl">{labelSubuh}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Tempoh malam</dt>
              <dd className="angka-paparan mt-1 text-2xl">
                {Math.floor(tempohMalam / 60)}j {tempohMalam % 60}m
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Satu pertiga malam</dt>
              <dd className="angka-paparan mt-1 text-2xl">
                {Math.floor(tempohSatuPertiga / 60)}j {tempohSatuPertiga % 60}m
              </dd>
            </div>
          </dl>

          {/* Jalur malam: satu garis masa nipis, bukan blok pekat. */}
          {kadarMula !== null && (
            <section>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 right-0 bg-primary" style={{ left: `${kadarMula}%` }} />
                {keadaan !== 'tamat' && kadarKini !== null && (
                  <div
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
                    style={{ left: `${Math.min(Math.max(kadarKini, 0), 100)}%` }}
                  />
                )}
              </div>
              <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                <span>Maghrib</span>
                <span className="text-primary">Satu pertiga terakhir bermula {fmt12(mulaSatuPertiga!)}</span>
                <span>Subuh</span>
              </div>
            </section>
          )}

          <section className="max-w-[68ch]">
            <h2 className="paparan text-2xl">Cara ia dikira</h2>

            <p className="mt-4 leading-relaxed text-muted-foreground">
              Malam dalam kiraan ini bermula pada <span className="text-foreground">maghrib</span> dan
              berakhir pada <span className="text-foreground">subuh</span> — bukan dari tengah malam.
              Sebab itu waktu satu pertiga terakhir berubah sedikit setiap hari, mengikut peredaran
              matahari di zon anda.
            </p>

            <h3 className="paparan mt-8 text-lg">Langkah demi langkah</h3>
            <ol className="mt-3 space-y-4">
              {[
                {
                  tajuk: 'Ambil waktu maghrib dan subuh',
                  teks: `Maghrib malam ini ${labelMaghrib}, dan subuh esok ${labelSubuh}. Subuh yang digunakan ialah subuh keesokan harinya, kerana malam melangkaui tengah malam.`,
                },
                {
                  tajuk: 'Kira tempoh malam',
                  teks: `Subuh tolak maghrib. Untuk malam ini: ${labelSubuh} − ${labelMaghrib} = ${Math.floor(tempohMalam / 60)} jam ${tempohMalam % 60} minit.`,
                },
                {
                  tajuk: 'Bahagi kepada tiga',
                  teks: `Setiap satu pertiga ialah ${Math.floor(tempohSatuPertiga / 60)} jam ${tempohSatuPertiga % 60} minit. Ketiga-tiga bahagian sama panjang.`,
                },
                {
                  tajuk: 'Tolak satu bahagian daripada subuh',
                  teks: `${labelSubuh} tolak ${Math.floor(tempohSatuPertiga / 60)} jam ${tempohSatuPertiga % 60} minit = ${fmt12(mulaSatuPertiga!)} AM. Itulah permulaan sepertiga terakhir, dan ia berterusan sehingga masuk subuh.`,
                },
              ].map((langkah, i) => (
                <li key={langkah.tajuk} className="flex gap-4">
                  <span className="angka-paparan shrink-0 text-xl text-foreground/35">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{langkah.tajuk}</p>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{langkah.teks}</p>
                  </div>
                </li>
              ))}
            </ol>

            <h3 className="paparan mt-8 text-lg">Kenapa bukan tengah malam?</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Tengah malam jam 12:00 ialah pembahagian jam moden, bukan pembahagian malam. Kerana
              panjang malam berubah sepanjang tahun, titik tengah malam yang sebenar jarang jatuh
              tepat pada pukul 12. Untuk malam ini, pertengahan malam sebenarnya sekitar{' '}
              <span className="text-foreground">
                {fmt12(new Date(maghrib!.getTime() + (subuh!.getTime() - maghrib!.getTime()) / 2))}
              </span>
              .
            </p>

            <h3 className="paparan mt-8 text-lg">Kenapa waktu ini disebut</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Satu pertiga malam terakhir ialah waktu yang digalakkan untuk qiamullail dan tahajud, dan
              disebut dalam hadis sebagai waktu doa lebih hampir untuk dimakbulkan.
            </p>

            <p className="mt-6 text-sm text-muted-foreground">
              Waktu dikira daripada data JAKIM untuk zon anda. Imsak dan dhuha di halaman lain juga
              dikira daripada waktu yang sama.
            </p>
          </section>
        </div>
      )}
    </PageShell>
  );
}

function Panduan({ tajuk, teks, pautan }: { tajuk: string; teks: string; pautan?: boolean }) {
  return (
    <div className="max-w-md">
      <p className="paparan text-2xl ">{tajuk}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{teks}</p>
      {pautan && (
        <Link
          href="/tetapan"
          className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
        >
          Pergi ke Tetapan
        </Link>
      )}
    </div>
  );
}

/** Kiraan detik dalam layanan yang sama seperti hero halaman utama. */
function KiraTurun({ ms, aktif }: { ms: number; aktif: boolean }) {
  const { jam, minit, saat } = pecahMs(ms);
  const unit = [
    ...(jam > 0 ? [{ nilai: String(jam).padStart(2, '0'), label: 'jam' }] : []),
    { nilai: String(minit).padStart(2, '0'), label: 'minit' },
    { nilai: String(saat).padStart(2, '0'), label: 'saat' },
  ];
  return (
    <div className="flex items-start gap-3 lg:gap-4">
      {unit.map(({ nilai, label }) => (
        <div key={label} className="flex flex-col items-center gap-1.5">
          <span className={`angka-paparan text-[14vw] leading-none lg:text-[8vw] ${aktif ? 'text-primary' : ''}`}>
            {nilai}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
