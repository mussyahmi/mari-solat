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
import ModulRingkas from "@/components/ModulRingkas";
import { bearingKiblat, namaArah } from "@/lib/kiblat";
import { KATEGORI, kategoriPada, julatKategori, julatSemasa } from "@/lib/kategori";
import { Compass, Layers, Moon } from "lucide-react";
import { formatGregorianDate, formatHijriDate } from "@/utils/format";
import {
  WAKTU,
  bakiMasa,
  bakiMasaTeks,
  binaWaktu,
  simpanCacheWaktu,
  fetchSolat,
  parseTime,
  type BakiMasa,
  type Waktu,
  type WaktuSolat,
} from "@/lib/solat";
import { isManualZone } from "@/lib/zoneState";
import { trackVisit } from "@/lib/track";
import { AZAN_PRAYERS, isGlobalAzanOn, isAzanEnabled, triggerAzan } from "@/lib/azan";
import { spring } from "@/lib/motion";

type Hari = "semalam" | "hariIni" | "esok";
type WaktuMengikutHari = Partial<Record<Hari, WaktuSolat>>;
type Seterusnya = { label: Waktu | null; masa: Date | null };

const HARI_LABEL: Record<Hari, string> = { semalam: "Semalam", hariIni: "Hari ini", esok: "Esok" };
const SENARAI_HARI: Hari[] = ["semalam", "hariIni", "esok"];

export default function HalamanUtama() {

  const [zon, setZon] = useState<string | null>(null);
  const [waktuHari, setWaktuHari] = useState<WaktuMengikutHari>({});
  const [hari, setHari] = useState<Hari>("hariIni");
  const [seterusnya, setSeterusnya] = useState<Seterusnya>({ label: null, masa: null });
  const [tiadaZon, setTiadaZon] = useState(false);
  const [ralat, setRalat] = useState(false);
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(null);
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
          setKoordinat({ lat: latitude, lng: longitude });
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
      toast.error("Pelayar ini tidak menyokong geolokasi. Pilih zon anda di Tetapan.");
      setTiadaZon(true);
      return;
    }
    const hadMasa = setTimeout(() => setTiadaZon(true), 10_000);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearTimeout(hadMasa);
        try {
          const { latitude, longitude } = coords;
          setKoordinat({ lat: latitude, lng: longitude });
          const res = await fetch(`https://api.waktusolat.app/zones/${latitude}/${longitude}`);
          const data = await res.json();
          if (!res.ok || "error" in data) throw new Error();
          trackVisit(data.zone, { lat: latitude, lng: longitude });
          await muatZon(data.zone, `${data.zone} ${data.district}`);
        } catch {
          toast.error("Zon untuk lokasi anda tidak ditemui. Pilih zon di Tetapan.");
          setTiadaZon(true);
        }
      },
      () => {
        clearTimeout(hadMasa);
        toast.error("Lokasi tidak dapat dibaca. Pilih zon anda di Tetapan.");
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
      setRalat(true);
      toast.error("Waktu solat untuk zon ini gagal dimuatkan. Cuba lagi sebentar nanti.");
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
  const baki = useMemo<BakiMasa | null>(() => {
    if (!seterusnya.masa || !tunjukKiraan) return null;
    return bakiMasa(seterusnya.masa, new Date(Math.floor(kini.getTime() / 1000) * 1000));
  }, [seterusnya.masa, tunjukKiraan, kini]);

  // Modul menggunakan waktu hari ini, bukan hari yang sedang dilihat — ia
  // menjawab "apa yang benar sekarang", tanpa mengira tab mana yang dipilih.
  const waktuKini = waktuHari.hariIni;
  const kiblat = koordinat ? bearingKiblat(koordinat.lat, koordinat.lng) : null;

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

  const malamAktif = !!malam && kini >= malam.mula && kini < malam.tamat;

  return (
    <main
      className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 px-5 pb-8 lg:gap-8 lg:px-10"
    >
      {(
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div className="-ml-3 flex items-center gap-1 lg:-ml-3.5">
            {SENARAI_HARI.map(h => (
              <button
                key={h}
                onClick={() => setHari(h)}
                aria-pressed={hari === h}
                className="group relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring lg:px-3.5"
              >
                {hari === h && (
                  <motion.span
                    layoutId="pilHari"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring.susunAtur}
                  />
                )}
                <span
                  className={`relative transition-colors ${
                    hari === h
                      ? "font-semibold text-accent-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {HARI_LABEL[h]}
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
          <section
            className="flex flex-col gap-8 pb-6 pt-4 lg:pb-10"
          >
            <HeroWaktu
              waktu={waktuDipapar}
              seterusnya={seterusnya.label}
              baki={baki}
              tunjukKiraan={tunjukKiraan}
              hari={hari}
            />

            <dl className="flex flex-wrap gap-x-12 gap-y-4 border-t border-border/60 pt-5 text-sm">
              <div>
                <dt className="text-muted-foreground">Masihi</dt>
                <dd className="mt-1">{formatGregorianDate(waktuDipapar.gregorianDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hijri</dt>
                <dd className="mt-1">{formatHijriDate(waktuDipapar.hijriDate)}</dd>
              </div>
              {zon && (
                <div>
                  <dt className="text-muted-foreground">Zon</dt>
                  <dd className="mt-1">
                    <Link
                      href="/tetapan"
                      className="text-pretty underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      {zon}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>


          {<RelWaktu waktu={waktuDipapar} minit={minit} seterusnya={hariIni || esokAuto ? seterusnya.label : null} hariIni={hariIni} />}

          {(
            <div className="grid gap-3 sm:grid-cols-3">
              <ModulRingkas
                href="/kategori-solat"
                tajuk="Kategori waktu"
                ikon={<Layers className="size-4" />}
                aksen={!!kategori}
                nilai={kategori ? KATEGORI.find(k => k.id === kategori)!.title : "Di luar waktu"}
                nota={
                  kategoriTamat
                    ? <>Bertukar dalam <span className="tabular">{bakiMasaTeks(kategoriTamat.getTime() - kini.getTime())}</span></>
                    : "Tiada waktu fardu sedang berjalan"
                }
              />

              <ModulRingkas
                href="/satu-pertiga-malam"
                tajuk="Satu pertiga malam"
                ikon={<Moon className="size-4" />}
                aksen={malamAktif}
                nilai={malam ? fmtJam(malam.mula) : "—"}
                nota={
                  !malam
                    ? "Menunggu waktu"
                    : malamAktif
                      ? <>Berakhir dalam <span className="tabular">{bakiMasaTeks(malam.tamat.getTime() - kini.getTime())}</span></>
                      : <>Hingga <span className="tabular">{fmtJam(malam.tamat)}</span></>
                }
              />

              <ModulRingkas
                href="/arah-kiblat"
                tajuk="Arah kiblat"
                ikon={<Compass className="size-4" />}
                nilai={kiblat === null ? "—" : `${Math.round(kiblat)}°`}
                nota={kiblat === null ? "Benarkan lokasi untuk mengira" : `${namaArah(kiblat)} dari utara`}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}

function fmtJam(d: Date) {
  const j = d.getHours() % 12 || 12;
  return `${j}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

/* ── Hero ───────────────────────────────────────────────── */

function HeroWaktu({
  waktu,
  seterusnya,
  baki,
  tunjukKiraan,
  hari,
  atasLangit = false,
  className = '',
}: {
  waktu: WaktuSolat;
  seterusnya: Waktu | null;
  baki: BakiMasa | null;
  tunjukKiraan: boolean;
  hari: Hari;
  /** Di atas langit, teks mewarisi tinta panel dan bukan token antara muka. */
  atasLangit?: boolean;
  className?: string;
}) {
  const lembut = atasLangit ? 'opacity-70' : 'text-muted-foreground';
  const lebihLembut = atasLangit ? 'opacity-60' : 'text-muted-foreground';

  if (!tunjukKiraan || !seterusnya) {
    return (
      <div className={`text-center ${className}`}>
        <p className={`paparan text-5xl  lg:text-6xl ${atasLangit ? 'opacity-80' : 'text-muted-foreground'}`}>
          {HARI_LABEL[hari]}
        </p>
        <p className={`mt-2 text-sm ${lebihLembut}`}>Kiraan detik hanya berjalan untuk waktu yang belum masuk.</p>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 flex-col items-start gap-3 ${className}`}>
      <p className="paparan text-3xl leading-none lg:text-4xl">
        {seterusnya[0].toUpperCase() + seterusnya.slice(1)}
        <span className={`tabular ml-2.5 font-sans text-base font-normal ${lembut}`}>{waktu[seterusnya]}</span>
      </p>
      {baki && <KiraDetik baki={baki} lembut={lembut} />}
    </div>
  );
}

/* ── Kiraan detik ───────────────────────────────────────── */

function KiraDetik({ baki, lembut }: { baki: BakiMasa; lembut: string }) {
  const unit = [
    ...(baki.jam > 0 ? [{ nilai: String(baki.jam).padStart(2, "0"), label: "jam" }] : []),
    { nilai: String(baki.minit).padStart(2, "0"), label: "minit" },
    { nilai: String(baki.saat).padStart(2, "0"), label: "saat" },
  ];

  // Jurang antara kumpulan mesti jauh lebih besar daripada jurang antara digit
  // di dalamnya, jika tidak "40 56" terbaca sebagai satu nombor.
  return (
    <div className="flex items-start gap-6 lg:gap-8">
      {unit.map(({ nilai, label }) => (
        <div key={label} className="flex flex-col items-center gap-1.5">
          <div className="flex">
            {nilai.split("").map((digit, i) => (
              <span
                key={i}
                className="angka-paparan relative block h-[0.78em] w-[0.58em] overflow-hidden text-[15vw] leading-none lg:text-[12vw] [@media(max-height:760px)]:text-[9vw]"
              >
                <motion.span
                  key={digit}
                  initial={{ y: "-100%" }}
                  animate={{ y: "0%" }}
                  transition={spring.digit}
                  className="tabular absolute inset-0 flex items-center justify-center"
                >
                  {digit}
                </motion.span>
              </span>
            ))}
          </div>
          <span className={`text-xs ${lembut}`}>{label}</span>
        </div>
      ))}
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
    <div className="shrink-0">
      {/* Kelapan-lapan waktu mesti kelihatan serentak. Menatal mendatar
          menyembunyikan separuh hari pada skrin yang paling kerap dilihat. */}
      {/* ring dan bukan border: border mengambil ruang susun atur, jadi sel
          duduk 1px di dalamnya dan penanda `inset-0` tidak pernah dapat
          mencapai garis itu — waktu yang disorot kelihatan lebih pendek
          daripada jirannya. ring dilukis di luar kotak, jadi sel mengisi
          ketinggian penuh dan sorotan bertemu tepi. */}
      <ol className="grid grid-cols-4 overflow-hidden rounded-2xl ring-1 ring-border/60 lg:grid-cols-8">
        {WAKTU.map((nama, i) => {
          const akanDatang = seterusnya === nama;
          const asas = new Date(minit * 60_000);
          const berlalu = hariIni && !akanDatang && parseTime(waktu[nama], asas) < asas;
          const kandungan = (
            <>
              <span
                className={`relative flex items-center gap-1 text-xs ${
                  akanDatang ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                {nama[0].toUpperCase() + nama.slice(1)}
                {nama === "dhuha" && <Info className="size-3 opacity-50" />}
              </span>
              <span
                className={`tabular relative whitespace-nowrap text-sm font-semibold ${
                  akanDatang ? "text-primary" : berlalu ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {waktu[nama]}
              </span>
            </>
          );

          const kelas = "relative flex h-full w-full flex-col items-center gap-1 px-1.5 py-4 sm:px-2";

          // Pembahagi dilukis sebagai garis bertindih, bukan sempadan susun
          // atur. Sebagai `border-b`, garis itu menambah 1px kepada kotak sel
          // manakala penanda `inset-0` hanya mengisi kotak pelapik — jadi
          // waktu yang disorot pada baris pertama kelihatan 1px lebih pendek.
          // Empat lajur pada mudah alih, lapan pada desktop, jadi garis kanan
          // dan bawah berbeza mengikut susunan.
          const pembahagi = (
            <>
              {(i % 4 !== 3 || i === 3) && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-y-0 right-0 w-px bg-border/50 ${
                    i === 3 ? "hidden lg:block" : ""
                  }`}
                />
              )}
              {i < 4 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/50 lg:hidden"
                />
              )}
            </>
          );
          const penanda = akanDatang ? (
            <motion.span
              layoutId="waktuSeterusnya"
              className="absolute inset-0 bg-accent"
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
                    {pembahagi}
                  </DialogTrigger>
                  <KiraanDhuha subuh={waktu.subuh} syuruk={waktu.syuruk} dhuha={waktu.dhuha} />
                </Dialog>
              ) : (
                <div className={kelas}>
                  {penanda}
                  {kandungan}
                  {pembahagi}
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
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="paparan text-4xl ">Pilih zon anda</h1>
      <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
        Waktu solat berbeza mengikut zon. Benarkan akses lokasi supaya zon dikesan sendiri, atau pilih
        zon secara manual.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onCubaLagi}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
        >
          Kesan lokasi saya
        </button>
        <Link
          href="/tetapan"
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Pilih zon
        </Link>
      </div>
    </div>
  );
}

function GagalMuat({ onCubaLagi }: { onCubaLagi: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="paparan text-4xl ">Waktu solat tidak dapat dimuatkan</h1>
      <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
        Sambungan ke pangkalan data waktu solat gagal. Semak sambungan internet anda, kemudian cuba
        sekali lagi.
      </p>
      <button
        onClick={onCubaLagi}
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
      >
        Cuba lagi
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
      <div className="flex flex-col gap-8 pb-6 pt-4 lg:pb-10">
        <div className="flex flex-col items-start gap-3">
          <Skeleton className="h-8 w-52 lg:h-10 lg:w-64" />
          <Skeleton className="h-[15vw] w-full max-w-[62%] lg:h-[12vw]" />
        </div>
        <div className="flex flex-wrap gap-x-12 gap-y-4 border-t border-border/60 pt-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 overflow-hidden rounded-2xl ring-1 ring-border/60 lg:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-2 px-1.5 py-4 sm:px-2 ${
              i % 4 !== 3 ? 'border-r border-r-border/50' : ''
            } ${i === 3 ? 'lg:border-r lg:border-r-border/50' : ''} ${
              i < 4 ? 'border-b border-b-border/50 lg:border-b-0' : ''
            }`}
          >
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border/60 px-5 py-4">
            <Skeleton className="h-4 w-28" />
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
        <DialogTitle className="paparan text-2xl">Waktu dhuha</DialogTitle>
        <DialogDescription className="sr-only">
          Waktu mula, waktu tamat dan tempoh bagi dhuha, serta cara ia dikira.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 text-sm">
        <div>
          <p className="mb-2 font-semibold">Kenapa ia dikira</p>
          <p className="leading-relaxed text-muted-foreground">
            JAKIM tidak menerbitkan waktu dhuha, jadi ia dikira daripada syuruk dan subuh
            menggunakan formula falak yang biasa digunakan.
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold">Kiraannya</p>
          <p className="rounded-lg bg-muted px-4 py-3">Dhuha = Syuruk + ⅓ × (Syuruk − Subuh)</p>
          <div className="tabular mt-2 space-y-1 font-mono text-xs text-muted-foreground">
            <p>= {syuruk} + ⅓ × ({syuruk} − {subuh})</p>
            <p>= {syuruk} + ⅓ × {beza} minit</p>
            <p>= {syuruk} + {satuPertiga} minit</p>
            <p className="pt-1 font-semibold text-foreground">= {dhuha}</p>
          </div>
        </div>

        <p className="leading-relaxed text-muted-foreground">
          Ini satu daripada beberapa kaedah. Ada yang mengira dhuha berdasarkan ketinggian matahari
          di ufuk, jadi waktu yang anda lihat di tempat lain mungkin berbeza beberapa minit. Rujuk
          pihak berautoriti di kawasan anda jika ragu.
        </p>
      </div>
    </DialogContent>
  );
}
