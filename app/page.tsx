"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PeringatanHariIni from "@/components/PeringatanHariIni";
import QuranHariIni from "@/components/QuranHariIni";
import KadIstighfar from "@/components/KadIstighfar";
import HeroLangit from "@/components/HeroLangit";
import SolatHariIni from "@/components/SolatHariIni";
import { useBahasa, useTeks } from "@/components/BahasaProvider";
import { KATEGORI, kategoriPada, julatKategori, julatSemasa } from "@/lib/kategori";
import {
  CalendarDays,
  MapPin,
  MoonStar,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { palet, WARNA_WAKTU } from "@/lib/aksen";
import { formatGregorianDate, formatHijriDate, tarikhApi } from "@/utils/format";
import { HARI } from "@/lib/bahasa";
import {
  WAKTU,
  binaWaktu,
  simpanCacheWaktu,
  fetchSolat,
  parseTime,
  type Waktu,
  type WaktuSolat,
} from "@/lib/solat";
import { isManualZone } from "@/lib/zoneState";
import { RALAT_LOKASI, susulanPilihZon } from "@/lib/lokasi";
import { trackVisit } from "@/lib/track";
import { AZAN_PRAYERS, isGlobalAzanOn, isAzanEnabled, triggerAzan } from "@/lib/azan";
import { spring } from "@/lib/motion";

type Hari = "semalam" | "hariIni" | "esok";
type WaktuMengikutHari = Partial<Record<Hari, WaktuSolat>>;
type Seterusnya = { label: Waktu | null; masa: Date | null };

const ms = {
  hari: { semalam: "Semalam", hariIni: "Hari ini", esok: "Esok" } as Record<Hari, string>,
  masihi: "Masihi",
  hijri: "Hijri",
  zon: "Zon",
  sekilas: 'Sekilas pandang',
  nafasIstighfar: 'Nafas Istighfar',
  kategoriWaktu: "Kategori waktu",
  diLuarWaktu: "Di luar waktu",
  bertukarDalam: "Bertukar dalam",
  tiadaFardu: "Tiada waktu fardu sedang berjalan",
  satuPertigaMalam: "Satu pertiga malam",
  menungguWaktu: "Menunggu waktu",
  berakhirDalam: "Berakhir dalam",
  hingga: "Hingga",
  qadaSolat: "Qada solat",
  belumAdaRekod: "Belum ada rekod",
  tiadaBaki: "Tiada baki tertinggal",
  solatLagi: "solat lagi untuk diqada",
  arahKiblat: "Arah kiblat",
  benarkanLokasi: "Benarkan lokasi untuk mengira",
  dariUtara: (arah: string) => `${arah} dari utara`,
  kiraanHanya: "Kiraan detik hanya berjalan untuk waktu yang belum masuk.",
  jam: "jam",
  minit: "minit",
  saat: "saat",
  pilihZonTajuk: "Pilih zon anda",
  pilihZonHurai:
    "Waktu solat berbeza mengikut zon. Benarkan akses lokasi supaya zon dikesan sendiri, atau pilih zon secara manual.",
  kesanLokasi: "Kesan lokasi saya",
  pilihZon: "Pilih zon",
  gagalTajuk: "Waktu solat tidak dapat dimuatkan",
  gagalHurai:
    "Sambungan ke pangkalan data waktu solat gagal. Semak sambungan internet anda, kemudian cuba sekali lagi.",
  cubaLagi: "Cuba lagi",
  dhuhaTajuk: "Waktu dhuha",
  dhuhaSr: "Waktu mula, waktu tamat dan tempoh bagi dhuha, serta cara ia dikira.",
  kenapaDikira: "Kenapa ia dikira",
  kenapaHurai:
    "JAKIM tidak menerbitkan waktu dhuha, jadi ia dikira daripada syuruk dan subuh menggunakan formula falak yang biasa digunakan.",
  kiraannya: "Kiraannya",
  nMinit: (n: number) => `${n} minit`,
  kaedahLain:
    "Ini satu daripada beberapa kaedah. Ada yang mengira dhuha berdasarkan ketinggian matahari di ufuk, jadi waktu yang anda lihat di tempat lain mungkin berbeza beberapa minit. Rujuk pihak berautoriti di kawasan anda jika ragu.",
};
const en: typeof ms = {
  hari: { semalam: "Yesterday", hariIni: "Today", esok: "Tomorrow" },
  masihi: "Gregorian",
  hijri: "Hijri",
  zon: "Zone",
  sekilas: 'At a glance',
  nafasIstighfar: 'Istighfar Breathing',
  kategoriWaktu: "Prayer time category",
  diLuarWaktu: "Outside prayer time",
  bertukarDalam: "Changes in",
  tiadaFardu: "No obligatory prayer time in progress",
  satuPertigaMalam: "Last third of the night",
  menungguWaktu: "Waiting for prayer times",
  berakhirDalam: "Ends in",
  hingga: "Until",
  qadaSolat: "Qada prayers",
  belumAdaRekod: "No records yet",
  tiadaBaki: "Nothing left to make up",
  solatLagi: "prayers left to make up",
  arahKiblat: "Qibla direction",
  benarkanLokasi: "Allow location access to calculate",
  dariUtara: arah => `${arah}, from north`,
  kiraanHanya: "The countdown only runs for prayer times still to come.",
  jam: "hours",
  minit: "minutes",
  saat: "seconds",
  pilihZonTajuk: "Choose your zone",
  pilihZonHurai:
    "Prayer times differ by zone. Allow location access so your zone is detected automatically, or choose a zone manually.",
  kesanLokasi: "Detect my location",
  pilihZon: "Choose zone",
  gagalTajuk: "Prayer times couldn't be loaded",
  gagalHurai:
    "We couldn't reach the prayer times database. Check your internet connection, then try again.",
  cubaLagi: "Try again",
  dhuhaTajuk: "Dhuha time",
  dhuhaSr: "When dhuha starts and ends, how long it lasts, and how it is calculated.",
  kenapaDikira: "Why it is calculated",
  kenapaHurai:
    "JAKIM doesn't publish a dhuha time, so it is calculated from syuruk and subuh using a commonly used astronomical formula.",
  kiraannya: "The calculation",
  nMinit: n => `${n} ${n === 1 ? "minute" : "minutes"}`,
  kaedahLain:
    "This is one of several methods. Some calculate dhuha from the sun's height above the horizon, so times you see elsewhere may differ by a few minutes. Check with the authorities in your area if in doubt.",
};
const TEKS = { ms, en };
const SENARAI_HARI: Hari[] = ["semalam", "hariIni", "esok"];

export default function HalamanUtama() {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();

  const [zon, setZon] = useState<string | null>(null);
  const [waktuHari, setWaktuHari] = useState<WaktuMengikutHari>({});
  const [hari, setHari] = useState<Hari>("hariIni");
  const [seterusnya, setSeterusnya] = useState<Seterusnya>({ label: null, masa: null });
  const [tiadaZon, setTiadaZon] = useState(false);
  const [ralat, setRalat] = useState(false);
  const [dilaraskan, setDilaraskan] = useState(false);

  const [kini, setKini] = useState(() => new Date());
  // Kebanyakan skrin hanya berubah setiap minit; hanya kiraan detik perlukan
  // saat. Memisahkannya mengelakkan render semula setiap saat pada peranti
  // perlahan.
  const minit = Math.floor(kini.getTime() / 60_000);
  useEffect(() => {
    const jam = setInterval(() => setKini(new Date()), 1000);
    return () => clearInterval(jam);
  }, []);


  /* ── Azan ─────────────────────────────────────────────── */
  const terakhirDibunyikan = useRef("");
  useEffect(() => {
    const waktu = waktuHari.hariIni;
    if (!waktu) return;
    const hhmm = `${kini.getHours()}:${String(kini.getMinutes()).padStart(2, "0")}`;
    for (const solat of AZAN_PRAYERS) {
      const t = parseTime(waktu[solat as Waktu]);
      const tHHMM = `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;
      const id = `${solat}-${kini.toDateString()}-${tHHMM}`;
      if (hhmm === tHHMM && terakhirDibunyikan.current !== id && isGlobalAzanOn() && isAzanEnabled(solat)) {
        terakhirDibunyikan.current = id;
        triggerAzan(solat);
      }
    }
  }, [kini, waktuHari]);

  /* ── Muat zon dan waktu ───────────────────────────────── */
  useEffect(() => {
    const kod = localStorage.getItem("msolat_zone_code");
    const nama = localStorage.getItem("msolat_zone_name");

    if (!kod || !nama) {
      mintaLokasi();
      return;
    }

    muatZon(kod, nama);
    if (isManualZone() || !navigator.geolocation) return;

    // Semak senyap sama ada pengguna kini berada dalam zon yang berbeza.
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;
          const res = await fetch(`https://api.waktusolat.app/zones/${latitude}/${longitude}`);
          const data = await res.json();
          if (!res.ok || "error" in data) return;
          trackVisit(data.zone, { lat: latitude, lng: longitude });
          if (data.zone !== kod) await muatZon(data.zone, `${data.zone} ${data.district}`);
        } catch {
          /* senyap — zon tersimpan masih boleh digunakan */
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  const mintaLokasi = () => {
    setTiadaZon(false);
    if (!navigator.geolocation) {
      toast.error(RALAT_LOKASI.tidakDisokong(susulanPilihZon()));
      setTiadaZon(true);
      return;
    }
    const hadMasa = setTimeout(() => setTiadaZon(true), 10_000);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearTimeout(hadMasa);
        try {
          const { latitude, longitude } = coords;
          const res = await fetch(`https://api.waktusolat.app/zones/${latitude}/${longitude}`);
          const data = await res.json();
          if (!res.ok || "error" in data) throw new Error();
          trackVisit(data.zone, { lat: latitude, lng: longitude });
          await muatZon(data.zone, `${data.zone} ${data.district}`);
        } catch {
          toast.error(`${RALAT_LOKASI.tiadaZon} ${susulanPilihZon()}`);
          setTiadaZon(true);
        }
      },
      () => {
        clearTimeout(hadMasa);
        toast.error(RALAT_LOKASI.tidakDibaca(susulanPilihZon()));
        setTiadaZon(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const muatZon = async (kod: string, nama: string) => {
    try {
      setRalat(false);
      setZon(nama);
      localStorage.setItem("msolat_zone_code", kod);
      localStorage.setItem("msolat_zone_name", nama);

      const tarikh: Record<Hari, Date> = {
        semalam: new Date(Date.now() - 86_400_000),
        hariIni: new Date(),
        esok: new Date(Date.now() + 86_400_000),
      };
      const hasil = await Promise.all(
        SENARAI_HARI.map(h => fetchSolat(kod, tarikh[h]).then(d => [h, binaWaktu(d.prayerTime)] as const))
      );
      const peta = Object.fromEntries(hasil) as WaktuMengikutHari;
      setWaktuHari(peta);
      if (peta.hariIni) simpanCacheWaktu(peta.hariIni);
    } catch {
      // Tiada toast di sini: <GagalMuat /> sudah mengambil alih skrin dengan
      // penjelasan dan butang cuba lagi. Toast hanya akan menyatakan kegagalan
      // yang sama sekali lagi, kemudian hilang.
      setRalat(true);
    }
  };

  /* ── Waktu seterusnya ─────────────────────────────────── */
  useEffect(() => {
    const waktu = waktuHari.hariIni;
    if (!waktu) return;

    if (hari === "semalam" || (hari === "esok" && kini < parseTime(waktu.isyak))) {
      setSeterusnya({ label: null, masa: null });
      return;
    }

    const urutan: Waktu[] = ["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"];
    for (const nama of urutan) {
      const t = parseTime(waktu[nama]);
      if (hari === "esok") t.setDate(t.getDate() + 1);
      if (t > kini) {
        setSeterusnya({ label: nama, masa: t });
        return;
      }
    }

    // Selepas isyak — sasaran seterusnya ialah subuh esok.
    const subuhEsok = parseTime(waktuHari.esok?.subuh ?? waktu.subuh);
    subuhEsok.setDate(subuhEsok.getDate() + 1);
    setSeterusnya({ label: null, masa: subuhEsok });
  }, [waktuHari, hari, kini]);

  // Selepas isyak, tunjukkan waktu esok tanpa pengguna perlu menukarnya.
  useEffect(() => {
    if (!waktuHari.hariIni || !waktuHari.esok || dilaraskan || hari !== "hariIni") return;
    if (seterusnya.label === null && seterusnya.masa !== null) {
      setHari("esok");
      setDilaraskan(true);
    }
  }, [waktuHari, hari, seterusnya, dilaraskan]);

  const waktuDipapar = waktuHari[hari];
  const hariIni = hari === "hariIni";
  const esokAuto = hari === "esok" && dilaraskan;
  const tunjukKiraan = (hariIni || esokAuto) && !!seterusnya.label;

  // Modul menggunakan waktu hari ini, bukan hari yang sedang dilihat — ia
  // menjawab "apa yang benar sekarang", tanpa mengira tab mana yang dipilih.
  const waktuKini = waktuHari.hariIni;

  const julatSolat = waktuKini
    ? julatSemasa(waktuKini, kini, { semalam: waktuHari.semalam, esok: waktuHari.esok })
    : null;
  const julat = julatSolat ? julatKategori(julatSolat.mula, julatSolat.tamat) : null;
  const kategori = julat ? kategoriPada(julat, kini) : null;
  const kategoriTamat = kategori && julat ? julat[kategori].ke : null;

  const malam = useMemo(() => {
    if (!waktuKini || !waktuHari.esok) return null;
    const subuhIni = parseTime(waktuKini.subuh, kini);
    const selepasTengahMalam = kini < subuhIni;
    const m = parseTime(waktuKini.maghrib, kini);
    if (!selepasTengahMalam) m.setDate(m.getDate());
    const s2 = selepasTengahMalam ? subuhIni : parseTime(waktuHari.esok.subuh, new Date(kini.getTime() + 86_400_000));
    const mula = selepasTengahMalam ? new Date(m.getTime() - 86_400_000) : m;
    const jumlah = s2.getTime() - mula.getTime();
    if (jumlah <= 0) return null;
    return { mula: new Date(s2.getTime() - jumlah / 3), tamat: s2 };
  }, [waktuKini, waktuHari.esok, kini]);


  return (
    <main
      className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 px-5 pb-8 lg:gap-5 lg:px-10"
    >
      {(
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center rounded-full bg-muted p-1">
            {SENARAI_HARI.map(h => (
              <button
                key={h}
                onClick={() => setHari(h)}
                aria-pressed={hari === h}
                className="group relative whitespace-nowrap rounded-full px-4 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                {hari === h && (
                  <motion.span
                    layoutId="pilHari"
                    className="absolute inset-0 rounded-full bg-card shadow-sm dark:bg-accent"
                    transition={spring.susunAtur}
                  />
                )}
                <span
                  className={`relative transition-colors ${
                    hari === h
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {t.hari[h]}
                </span>
              </button>
            ))}
          </div>

        </div>
      )}

      {tiadaZon && !waktuDipapar ? (
        <TiadaZon onCubaLagi={mintaLokasi} />
      ) : ralat && !waktuDipapar ? (
        <GagalMuat
          onCubaLagi={() => {
            const kod = localStorage.getItem("msolat_zone_code");
            const nama = localStorage.getItem("msolat_zone_name");
            if (kod && nama) muatZon(kod, nama);
            else mintaLokasi();
          }}
        />
      ) : !waktuDipapar ? (
        <RangkaMuat />
      ) : (
        <>
          {/* Pada skrin lebar hero duduk di dalam mangkuk lengkung, jadi
              gambar dan angkanya dibaca sebagai satu gubahan. Pada telefon
              lengkung terlalu rendah untuk itu, jadi hero jatuh ke bawahnya. */}
          {/* Susun atur bersifat editorial: hero dijajarkan kiri dan data
              sokongan duduk sebagai lajur kanan. Susunan bersimetri di
              tengah tiada ketegangan — semuanya berat yang sama. */}
          <section className="flex flex-col gap-3">
            {tunjukKiraan && seterusnya.label && seterusnya.masa ? (
              <HeroLangit
                waktu={waktuDipapar}
                seterusnya={seterusnya.label}
                masa={seterusnya.masa}
                kini={kini}
                zon={zon}
                kategori={kategori ? { nama: KATEGORI.find(k => k.id === kategori)!.title, tamat: kategoriTamat } : null}
                malam={malam}
              />
            ) : (
              // Semalam dan esok: kad langit yang sama tanpa kiraan detik —
              // fajar untuk esok, senja untuk semalam.
              <HeroLangit
                waktu={waktuDipapar}
                kini={kini}
                zon={zon}
                kategori={null}
                malam={null}
                paparan={{
                  tajuk: t.hari[hari],
                  // Hari dalam minggu + tarikh penuh: jelas hari mana yang sedang dilihat.
                  keterangan: `${HARI[bahasa][tarikhApi(waktuDipapar.gregorianDate).getDay()]}, ${formatGregorianDate(waktuDipapar.gregorianDate, bahasa)} · ${formatHijriDate(waktuDipapar.hijriDate)}`,
                  fasa: hari === 'semalam' ? 'maghrib' : 'syuruk',
                }}
              />
            )}

            {/* Tarikh dan zon: satu kad, setiap baris dengan cip warnanya. */}
            <dl className="kad grid gap-4 p-5 text-sm sm:grid-cols-3">
              <BarisTarikh ikon={CalendarDays} warna={5} label={t.masihi}>
                {formatGregorianDate(waktuDipapar.gregorianDate, bahasa)}
              </BarisTarikh>
              <BarisTarikh ikon={MoonStar} warna={0} label={t.hijri}>
                {formatHijriDate(waktuDipapar.hijriDate)}
              </BarisTarikh>
              {zon && (
                <BarisTarikh ikon={MapPin} warna={2} label={t.zon}>
                  <Link
                    href="/tetapan"
                    className="text-pretty underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {zon}
                  </Link>
                </BarisTarikh>
              )}
            </dl>
          </section>


          {/* Grid lapan waktu untuk setiap hari; hari ini juga mendapat kad lima
              waktu yang boleh ditanda di bawahnya. */}
          <RelWaktu waktu={waktuDipapar} minit={minit} seterusnya={hariIni || esokAuto ? seterusnya.label : null} hariIni={hariIni} />
          {hariIni && <SolatHariIni waktu={waktuDipapar} kini={kini} />}

          {/* Kategori waktu dan satu pertiga malam kini dalam kad langit; kiblat
              dan qada dibuang dari halaman utama — kedua-duanya di bar bawah. */}

          <div className="mt-10">
            <QuranHariIni />
          </div>

          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-w2-lembut text-w2">
                <Wind className="size-5" />
              </span>
              <span className="paparan text-2xl">{t.nafasIstighfar}</span>
            </h2>
            <KadIstighfar />
          </section>

          <div className="mt-10">
            <PeringatanHariIni />
          </div>
        </>
      )}
    </main>
  );
}

function BarisTarikh({
  ikon: Ikon,
  warna,
  label,
  children,
}: {
  ikon: LucideIcon;
  warna: number;
  label: string;
  children: React.ReactNode;
}) {
  const p = palet(warna);
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${p.lembut} ${p.teks}`}>
        <Ikon className="size-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
    </div>
  );
}

/* ── Rel waktu ──────────────────────────────────────────── */

const RelWaktu = memo(function RelWaktu({
  waktu,
  minit,
  seterusnya,
  hariIni,
}: {
  waktu: WaktuSolat;
  minit: number;
  seterusnya: Waktu | null;
  hariIni: boolean;
}) {
  return (
    <div className="kad shrink-0 p-2">
      {/* Kelapan-lapan waktu mesti kelihatan serentak. Menatal mendatar
          menyembunyikan separuh hari pada skrin yang paling kerap dilihat. */}
      {/* Setiap waktu ada titik warnanya sendiri (WARNA_WAKTU), dan waktu
          seterusnya diisi dengan rona lembut yang sama. Sel dipisahkan oleh
          jurang, bukan garis, jadi sorotan bulat tidak bertembung dengan
          pembahagi. */}
      <ol className="grid grid-cols-4 gap-1 lg:grid-cols-8">
        {WAKTU.map(nama => {
          const p = palet(WARNA_WAKTU[nama]);
          const akanDatang = seterusnya === nama;
          const asas = new Date(minit * 60_000);
          const berlalu = hariIni && !akanDatang && parseTime(waktu[nama], asas) < asas;
          const kandungan = (
            <>
              <span
                className={`relative flex items-center gap-1.5 text-xs ${
                  akanDatang ? `font-semibold ${p.teks}` : "text-muted-foreground"
                }`}
              >
                <span aria-hidden className={`size-2 shrink-0 rounded-full ${p.pekat} ${berlalu ? "opacity-40" : ""}`} />
                {nama[0].toUpperCase() + nama.slice(1)}
                {nama === "dhuha" && <Info className="size-3 opacity-50" />}
              </span>
              <span
                className={`tabular relative whitespace-nowrap text-sm font-semibold ${
                  akanDatang ? p.teks : berlalu ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {waktu[nama]}
              </span>
            </>
          );

          const kelas = "relative flex h-full w-full flex-col items-center gap-1.5 rounded-2xl px-1 py-3.5 sm:px-2";

          const penanda = akanDatang ? (
            <motion.span
              layoutId="waktuSeterusnya"
              className={`absolute inset-0 rounded-2xl ${p.lembut}`}
              transition={spring.susunAtur}
            />
          ) : null;

          return (
            <li key={nama} className="contents">
              {nama === "dhuha" ? (
                <Dialog>
                  <DialogTrigger className={`${kelas} cursor-pointer hover:bg-muted/60`}>
                    {penanda}
                    {kandungan}
                  </DialogTrigger>
                  <KiraanDhuha subuh={waktu.subuh} syuruk={waktu.syuruk} dhuha={waktu.dhuha} />
                </Dialog>
              ) : (
                <div className={kelas}>
                  {penanda}
                  {kandungan}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
});

/* ── Keadaan sokongan ───────────────────────────────────── */

function TiadaZon({ onCubaLagi }: { onCubaLagi: () => void }) {
  const t = useTeks(TEKS);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="paparan text-4xl ">{t.pilihZonTajuk}</h1>
      <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
        {t.pilihZonHurai}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onCubaLagi}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
        >
          {t.kesanLokasi}
        </button>
        <Link
          href="/tetapan"
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {t.pilihZon}
        </Link>
      </div>
    </div>
  );
}

function GagalMuat({ onCubaLagi }: { onCubaLagi: () => void }) {
  const t = useTeks(TEKS);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="paparan text-4xl ">{t.gagalTajuk}</h1>
      <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
        {t.gagalHurai}
      </p>
      <button
        onClick={onCubaLagi}
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
      >
        {t.cubaLagi}
      </button>
    </div>
  );
}

/**
 * Mesti mencerminkan susun atur sebenar, bukan susun atur terdahulu.
 * Rangka lama masih melukis panel lengkung yang sudah tiada, jadi halaman
 * melompat apabila data tiba.
 */
function RangkaMuat() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-muted/60 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-2xl" />
            <Skeleton className="h-8 w-40 lg:h-10" />
          </div>
          <Skeleton className="h-[15vw] w-full max-w-[62%] lg:h-[12vw]" />
        </div>
        <div className="kad grid gap-4 p-5 sm:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="kad grid grid-cols-4 gap-1 p-2 lg:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 px-1 py-3.5 sm:px-2">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="kad flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-2xl" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Kiraan dhuha ───────────────────────────────────────── */

function KiraanDhuha({ subuh, syuruk, dhuha }: { subuh: string; syuruk: string; dhuha: string }) {
  const t = useTeks(TEKS);
  const keMinit = (t: string) => {
    const [jm, tengahHari] = t.split(" ");
    const [j, m] = jm.split(":").map(Number);
    let jam = j;
    if (tengahHari === "PM" && jam !== 12) jam += 12;
    if (tengahHari === "AM" && jam === 12) jam = 0;
    return jam * 60 + m;
  };
  const beza = keMinit(syuruk) - keMinit(subuh);
  const satuPertiga = Math.round(beza / 3);

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="paparan text-2xl">{t.dhuhaTajuk}</DialogTitle>
        <DialogDescription className="sr-only">
          {t.dhuhaSr}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 text-sm">
        <div>
          <p className="mb-2 font-semibold">{t.kenapaDikira}</p>
          <p className="leading-relaxed text-muted-foreground">
            {t.kenapaHurai}
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold">{t.kiraannya}</p>
          <p className="rounded-2xl bg-muted px-4 py-3">Dhuha = Syuruk + ⅓ × (Syuruk − Subuh)</p>
          <div className="tabular mt-2 space-y-1 font-mono text-xs text-muted-foreground">
            <p>= {syuruk} + ⅓ × ({syuruk} − {subuh})</p>
            <p>= {syuruk} + ⅓ × {t.nMinit(beza)}</p>
            <p>= {syuruk} + {t.nMinit(satuPertiga)}</p>
            <p className="pt-1 font-semibold text-foreground">= {dhuha}</p>
          </div>
        </div>

        <p className="leading-relaxed text-muted-foreground">
          {t.kaedahLain}
        </p>
      </div>
    </DialogContent>
  );
}
