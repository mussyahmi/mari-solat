'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, MoonStar, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/PageShell';
import { formatTime } from '@/utils/format';
import { fetchSolat, parseTime, pecahMs } from '@/lib/solat';
import { useTeks } from '@/components/BahasaProvider';
import { palet, WARNA_WAKTU } from '@/lib/aksen';
import { cn } from '@/lib/utils';

type Keadaan = 'sebelum' | 'berlangsung' | 'tamat';

type Langkah = { tajuk: string; teks: string };
type Nilai = { maghrib: string; subuh: string; malamJ: number; malamM: number; pertigaJ: number; pertigaM: number; mula: string };

const ms = {
  tajuk: 'Satu Pertiga Malam',
  lede: 'Satu pertiga malam terakhir: waktu qiamullail dan doa mustajab. Ia dikira daripada maghrib hingga subuh, bukan daripada tengah malam.',
  tiadaZonTajuk: 'Pilih zon anda dahulu',
  tiadaZonTeks: 'Waktu satu pertiga malam dikira daripada waktu maghrib dan subuh zon anda.',
  ralatTajuk: 'Data tidak dapat dimuatkan',
  ralatTeks: 'Sambungan ke pangkalan data waktu solat gagal. Semak sambungan internet anda, kemudian muat semula halaman.',
  keTetapan: 'Pergi ke Tetapan',
  berakhirDalam: 'Berakhir dalam',
  telahBerlalu: 'Telah berlalu',
  bermulaDalam: 'Bermula dalam',
  sedangBerjalan: 'Satu pertiga malam terakhir sedang berjalan.',
  telahBerakhir: 'Waktu satu pertiga malam telah berakhir untuk malam ini.',
  sehinggaMasuk: 'Sehingga masuk satu pertiga malam terakhir.',
  tempohMalam: 'Tempoh malam',
  satuPertiga: 'Satu pertiga malam',
  tempoh: (j: number, m: number) => `${j}j ${m}m`,
  terakhirBermula: (w: string) => `Satu pertiga terakhir bermula ${w}`,
  caraDikira: 'Cara ia dikira',
  pengenalan: (maghrib: React.ReactNode, subuh: React.ReactNode) => (
    <>
      Malam dalam kiraan ini bermula pada {maghrib} dan
      berakhir pada {subuh}, bukan dari tengah malam.
      Sebab itu waktu satu pertiga terakhir berubah sedikit setiap hari, mengikut peredaran
      matahari di zon anda.
    </>
  ),
  kataMaghrib: 'maghrib',
  kataSubuh: 'subuh',
  langkahTajuk: 'Langkah demi langkah',
  langkah: (n: Nilai): Langkah[] => [
    {
      tajuk: 'Ambil waktu maghrib dan subuh',
      teks: `Maghrib malam ini ${n.maghrib}, dan subuh esok ${n.subuh}. Subuh yang digunakan ialah subuh keesokan harinya, kerana malam melangkaui tengah malam.`,
    },
    {
      tajuk: 'Kira tempoh malam',
      teks: `Subuh tolak maghrib. Untuk malam ini: ${n.subuh} − ${n.maghrib} = ${n.malamJ} jam ${n.malamM} minit.`,
    },
    {
      tajuk: 'Bahagi kepada tiga',
      teks: `Setiap satu pertiga ialah ${n.pertigaJ} jam ${n.pertigaM} minit. Ketiga-tiga bahagian sama panjang.`,
    },
    {
      tajuk: 'Tolak satu bahagian daripada subuh',
      teks: `${n.subuh} tolak ${n.pertigaJ} jam ${n.pertigaM} minit = ${n.mula} AM. Itulah permulaan sepertiga terakhir, dan ia berterusan sehingga masuk subuh.`,
    },
  ],
  bukanTengahMalam: 'Kenapa bukan tengah malam?',
  tengahMalam: (w: React.ReactNode) => (
    <>
      Tengah malam jam 12:00 ialah pembahagian jam moden, bukan pembahagian malam. Kerana
      panjang malam berubah sepanjang tahun, titik tengah malam yang sebenar jarang jatuh
      tepat pada pukul 12. Untuk malam ini, pertengahan malam sebenarnya sekitar{' '}
      {w}
      .
    </>
  ),
  kenapaDisebut: 'Kenapa waktu ini disebut',
  sebab: 'Satu pertiga malam terakhir ialah waktu yang digalakkan untuk qiamullail dan tahajud, dan disebut dalam hadis sebagai waktu doa lebih hampir untuk dimakbulkan.',
  sumber: 'Waktu dikira daripada data JAKIM untuk zon anda. Imsak dan dhuha di halaman lain juga dikira daripada waktu yang sama.',
  jam: 'jam',
  minit: 'minit',
  saat: 'saat',
};
const en: typeof ms = {
  tajuk: 'Last Third of the Night',
  lede: 'The last third of the night: the time for qiamullail and answered doa. It is counted from Maghrib to Subuh, not from midnight.',
  tiadaZonTajuk: 'Choose your zone first',
  tiadaZonTeks: "The last third of the night is calculated from your zone's Maghrib and Subuh times.",
  ralatTajuk: "Data couldn't be loaded",
  ralatTeks: "We couldn't reach the prayer times database. Check your internet connection, then reload the page.",
  keTetapan: 'Go to Settings',
  berakhirDalam: 'Ends in',
  telahBerlalu: 'Has passed',
  bermulaDalam: 'Begins in',
  sedangBerjalan: 'The last third of the night is under way.',
  telahBerakhir: 'The last third of the night has ended for tonight.',
  sehinggaMasuk: 'Until the last third of the night begins.',
  tempohMalam: 'Length of night',
  satuPertiga: 'One third of the night',
  tempoh: (j, m) => `${j}h ${m}m`,
  terakhirBermula: w => `Last third begins ${w}`,
  caraDikira: 'How it is calculated',
  pengenalan: (maghrib, subuh) => (
    <>
      In this calculation the night begins at {maghrib} and ends at {subuh}, not at
      midnight. That is why the last third shifts slightly every day, following the sun&apos;s
      path over your zone.
    </>
  ),
  kataMaghrib: 'Maghrib',
  kataSubuh: 'Subuh',
  langkahTajuk: 'Step by step',
  langkah: n => [
    {
      tajuk: 'Take the Maghrib and Subuh times',
      teks: `Maghrib tonight is ${n.maghrib}, and Subuh tomorrow is ${n.subuh}. We use the next day's Subuh, because the night runs past midnight.`,
    },
    {
      tajuk: 'Work out the length of the night',
      teks: `Subuh minus Maghrib. For tonight: ${n.subuh} − ${n.maghrib} = ${n.malamJ} hr ${n.malamM} min.`,
    },
    {
      tajuk: 'Divide by three',
      teks: `Each third is ${n.pertigaJ} hr ${n.pertigaM} min. All three parts are the same length.`,
    },
    {
      tajuk: 'Subtract one third from Subuh',
      teks: `${n.subuh} minus ${n.pertigaJ} hr ${n.pertigaM} min = ${n.mula} AM. That is when the last third begins, and it lasts until Subuh.`,
    },
  ],
  bukanTengahMalam: 'Why not midnight?',
  tengahMalam: w => (
    <>
      12:00 midnight is a division of the modern clock, not of the night. Because the length
      of the night changes through the year, the true middle of the night rarely falls exactly
      at 12. Tonight, the actual midpoint of the night is around{' '}
      {w}
      .
    </>
  ),
  kenapaDisebut: 'Why this time matters',
  sebab: 'The last third of the night is the recommended time for qiamullail and tahajud, and is mentioned in hadith as the time when doa is closest to being answered.',
  sumber: 'Times are calculated from JAKIM data for your zone. Imsak and Dhuha on other pages are calculated from the same times.',
  jam: 'hours',
  minit: 'minutes',
  saat: 'seconds',
};
const TEKS = { ms, en };

// Warna cip nombor bagi setiap langkah kiraan, bergilir supaya bersebelahan berbeza.
const WARNA_LANGKAH = [5, 0, 1, 3];

function fmt12(d: Date) {
  const h = d.getHours() % 12 || 12;
  return `${h}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function SatuPertigaMalamPage() {
  const t = useTeks(TEKS);
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
      tajuk={t.tajuk}
      lede={t.lede}
    >
      {memuat ? (
        <div className="space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 w-80" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : tiadaZon ? (
        <Panduan
          tajuk={t.tiadaZonTajuk}
          teks={t.tiadaZonTeks}
          pautan
        />
      ) : ralat ? (
        <Panduan
          tajuk={t.ralatTajuk}
          teks={t.ralatTeks}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Fakta halaman ini bukan julat statik — ia berapa lama lagi.
              Jadi ia mendapat layanan kiraan detik yang sama seperti hero
              di halaman utama. Kad bertema malam: biru ke ungu. */}
          <div className="flex flex-col items-start gap-4 rounded-3xl bg-linear-to-br from-w6-lembut to-w1-lembut p-5 sm:p-7">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-w1 text-primary-foreground">
                  <MoonStar className="size-5" strokeWidth={2} />
                </span>
                <p className="paparan text-2xl leading-none lg:text-3xl">
                  {keadaan === 'berlangsung'
                    ? t.berakhirDalam
                    : keadaan === 'tamat'
                      ? t.telahBerlalu
                      : t.bermulaDalam}
                </p>
              </div>
              <span className="tabular rounded-full bg-card/80 px-3 py-1 text-sm font-semibold text-w1">
                {fmt12(mulaSatuPertiga!)} – {fmt12(subuh!)} AM
              </span>
            </div>

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

            <p className="text-foreground/70">
              {keadaan === 'berlangsung'
                ? t.sedangBerjalan
                : keadaan === 'tamat'
                  ? t.telahBerakhir
                  : t.sehinggaMasuk}
            </p>

            {/* Jalur malam: maghrib ke subuh, sepertiga terakhir diwarnakan. */}
            {kadarMula !== null && (
              <div className="mt-2 w-full">
                <div className="relative h-3 rounded-full bg-card/80">
                  <div className="absolute inset-y-0 right-0 rounded-full bg-w1" style={{ left: `${kadarMula}%` }} />
                  {keadaan !== 'tamat' && kadarKini !== null && (
                    <div
                      className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow-sm ring-[3px] ring-w6"
                      style={{ left: `${Math.min(Math.max(kadarKini, 0), 100)}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex justify-between gap-2 text-xs text-foreground/70 sm:text-sm">
                  <span>Maghrib</span>
                  <span className="text-center font-semibold text-w1">{t.terakhirBermula(fmt12(mulaSatuPertiga!))}</span>
                  <span>Subuh</span>
                </div>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {(
              [
                ['Maghrib', labelMaghrib, WARNA_WAKTU.maghrib],
                ['Subuh', labelSubuh, WARNA_WAKTU.subuh],
                [t.tempohMalam, t.tempoh(Math.floor(tempohMalam / 60), tempohMalam % 60), 5],
                [t.satuPertiga, t.tempoh(Math.floor(tempohSatuPertiga / 60), tempohSatuPertiga % 60), 1],
              ] as const
            ).map(([label, nilai, w]) => (
              <div key={label} className={cn('rounded-3xl p-4 sm:p-5', palet(w).lembut)}>
                <dd className={cn('angka-paparan text-2xl leading-none sm:text-3xl', palet(w).teks)}>{nilai}</dd>
                <dt className="mt-2 text-xs leading-snug text-foreground/70 sm:text-sm">{label}</dt>
              </div>
            ))}
          </dl>

          <section className="kad max-w-3xl p-5 sm:p-6">
            <h2 className="paparan text-2xl">{t.caraDikira}</h2>

            <p className="mt-3 leading-relaxed text-muted-foreground">
              {t.pengenalan(
                <span className="font-medium text-w4">{t.kataMaghrib}</span>,
                <span className="font-medium text-w1">{t.kataSubuh}</span>
              )}
            </p>

            <h3 className="paparan mt-7 text-lg">{t.langkahTajuk}</h3>
            <ol className="mt-3 divide-y divide-border/50">
              {t.langkah({
                maghrib: labelMaghrib,
                subuh: labelSubuh,
                malamJ: Math.floor(tempohMalam / 60),
                malamM: tempohMalam % 60,
                pertigaJ: Math.floor(tempohSatuPertiga / 60),
                pertigaM: tempohSatuPertiga % 60,
                mula: fmt12(mulaSatuPertiga!),
              }).map((langkah, i) => {
                const p = palet(WARNA_LANGKAH[i % WARNA_LANGKAH.length]);
                return (
                  <li key={langkah.tajuk} className="flex gap-4 py-4 first:pt-1 last:pb-0">
                    <span className={cn('angka-paparan flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg', p.lembut, p.teks)}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{langkah.tajuk}</p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">{langkah.teks}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
            <section className="kad p-5 sm:p-6">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-w6-lembut text-w6">
                <Clock className="size-5" strokeWidth={2} />
              </span>
              <h3 className="paparan mt-4 text-lg">{t.bukanTengahMalam}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {t.tengahMalam(
                  <span className="font-semibold text-w6">
                    {fmt12(new Date(maghrib!.getTime() + (subuh!.getTime() - maghrib!.getTime()) / 2))}
                  </span>
                )}
              </p>
            </section>

            <section className="kad p-5 sm:p-6">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-w1-lembut text-w1">
                <Sparkles className="size-5" strokeWidth={2} />
              </span>
              <h3 className="paparan mt-4 text-lg">{t.kenapaDisebut}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {t.sebab}
              </p>
            </section>
          </div>

          <p className="max-w-3xl px-1 text-sm text-muted-foreground">
            {t.sumber}
          </p>
        </div>
      )}
    </PageShell>
  );
}

function Panduan({ tajuk, teks, pautan }: { tajuk: string; teks: string; pautan?: boolean }) {
  const t = useTeks(TEKS);
  return (
    <div className="kad max-w-md p-6">
      <p className="paparan text-2xl">{tajuk}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{teks}</p>
      {pautan && (
        <Link
          href="/tetapan"
          className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
        >
          {t.keTetapan}
        </Link>
      )}
    </div>
  );
}

/** Kiraan detik dalam layanan yang sama seperti hero halaman utama. */
function KiraTurun({ ms, aktif }: { ms: number; aktif: boolean }) {
  const t = useTeks(TEKS);
  const { jam, minit, saat } = pecahMs(ms);
  const unit = [
    ...(jam > 0 ? [{ nilai: String(jam).padStart(2, '0'), label: t.jam }] : []),
    { nilai: String(minit).padStart(2, '0'), label: t.minit },
    { nilai: String(saat).padStart(2, '0'), label: t.saat },
  ];
  return (
    <div className="flex items-start gap-3 lg:gap-4">
      {unit.map(({ nilai, label }) => (
        <div key={label} className="flex flex-col items-center gap-1.5">
          <span className={`angka-paparan text-[14vw] leading-none lg:text-[8vw] ${aktif ? 'text-w1' : 'text-w6'}`}>
            {nilai}
          </span>
          <span className="text-xs text-foreground/60">{label}</span>
        </div>
      ))}
    </div>
  );
}
