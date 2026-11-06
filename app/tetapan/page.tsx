'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckIcon, ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, GiftIcon, InfoIcon, LanguagesIcon, LayoutGridIcon,
  Loader2Icon, LocateFixedIcon, MapPinIcon, PaletteIcon, PencilIcon, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import PageShell from '@/components/PageShell';
import { setManualZone } from '@/lib/zoneState';
import { RALAT_LOKASI } from '@/lib/lokasi';
import {
  AZAN_PRAYERS, PRAYER_LABELS,
  isGlobalAzanOn, setGlobalAzanOn,
  isAzanEnabled, setAzanEnabled,
  requestNotifPermission,
} from '@/lib/azan';
import { getFCMToken } from '@/lib/fcm';
import { auth, db } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { BAHASA, NAMA_BAHASA } from '@/lib/bahasa';
import PemilihAksen from '@/components/PemilihAksen';
import { APP_VERSION } from '@/lib/version';
import Link from 'next/link';
import { palet } from '@/lib/aksen';
import { cn } from '@/lib/utils';

/** Cip ikon berwarna — setiap bahagian tetapan mendapat warna paletnya sendiri. */
function CipIkon({ ikon: Ikon, i }: { ikon: LucideIcon; i: number }) {
  const p = palet(i);
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', p.lembut, p.teks)}>
      <Ikon className="size-5" strokeWidth={2} />
    </span>
  );
}

function KepalaKad({ ikon, i, tajuk }: { ikon: LucideIcon; i: number; tajuk: string }) {
  return (
    <div className="flex items-center gap-3">
      <CipIkon ikon={ikon} i={i} />
      <h2 className="paparan text-xl leading-none">{tajuk}</h2>
    </div>
  );
}

const ms = {
  tajuk: 'Tetapan',
  lede: 'Zon menentukan setiap waktu yang dipaparkan dalam aplikasi ini.',
  zonDitetapkan: (d: string) => `Zon ditetapkan ke ${d}.`,
  zonDikesan: (d: string) => `Zon dikesan: ${d}.`,
  notifDibenarkan: 'Notifikasi dibenarkan.',
  notifTidakDibenarkan: 'Notifikasi tidak dibenarkan.',
  benarkanDahulu: 'Benarkan notifikasi pelayar dahulu.',
  gagalDaftar: 'Gagal mendaftar notifikasi. Cuba semula.',
  tetapkanZonDahulu: 'Tetapkan zon waktu solat dahulu.',
  gagalSimpan: 'Gagal menyimpan tetapan notifikasi.',
  zonAnda: 'Zon anda',
  belumDipilih: 'Belum dipilih',
  pilihZon: 'Pilih zon',
  mengesan: 'Mengesan…',
  kesanLokasi: 'Kesan dari lokasi semasa',
  lokasiDikesan: 'Lokasi dikesan',
  caraTajuk: 'Cara zon dipilih',
  cara1:
    'JAKIM membahagikan Malaysia kepada zon waktu solat, setiap satu dengan kod tersendiri seperti WLY01. Waktu berbeza beberapa minit antara zon bersebelahan, jadi pilih zon tempat anda benar-benar berada.',
  cara2:
    'Mengesan dari lokasi semasa akan memilih zon terdekat secara automatik. Zon yang anda pilih sendiri tidak akan ditukar olehnya.',
  bahasa: 'Bahasa',
  rupa: 'Rupa',
  aplikasiLain: 'Aplikasi lain',
  apaBaru: 'Apa yang baru',
  versi: (v: string) => `Versi ${v} · lihat log perubahan`,
  kiraPoket: 'Jejak perbelanjaan mengikut kitaran gaji, bukan bulan kalendar.',
  semuaNegeri: '← Semua negeri',
  pilihNegeri: 'Pilih negeri dahulu.',
  ralatZon:
    'Senarai zon tidak dapat dimuatkan. Semak sambungan internet anda, kemudian cuba sekali lagi.',
  cubaLagi: 'Cuba lagi',
  memuatkan: 'Memuatkan senarai zon…',
};
const en: typeof ms = {
  tajuk: 'Settings',
  lede: 'Your zone sets every prayer time shown in this app.',
  zonDitetapkan: d => `Zone set to ${d}.`,
  zonDikesan: d => `Zone detected: ${d}.`,
  notifDibenarkan: 'Notifications allowed.',
  notifTidakDibenarkan: 'Notifications not allowed.',
  benarkanDahulu: 'Allow browser notifications first.',
  gagalDaftar: "Couldn't register for notifications. Please try again.",
  tetapkanZonDahulu: 'Set your prayer time zone first.',
  gagalSimpan: "Couldn't save notification settings.",
  zonAnda: 'Your zone',
  belumDipilih: 'Not chosen yet',
  pilihZon: 'Choose zone',
  mengesan: 'Detecting…',
  kesanLokasi: 'Detect from current location',
  lokasiDikesan: 'Detected location',
  caraTajuk: 'How zones work',
  cara1:
    'JAKIM divides Malaysia into prayer time zones, each with its own code such as WLY01. Times differ by a few minutes between neighbouring zones, so choose the zone where you actually are.',
  cara2:
    "Detecting from your current location picks the nearest zone automatically. It won't override a zone you chose yourself.",
  bahasa: 'Language',
  rupa: 'Appearance',
  aplikasiLain: 'Other apps',
  apaBaru: "What's new",
  versi: v => `Version ${v} · see the changelog`,
  kiraPoket: 'Track spending by pay cycle, not calendar month.',
  semuaNegeri: '← All states',
  pilihNegeri: 'Choose a state first.',
  ralatZon:
    "The zone list couldn't be loaded. Check your internet connection, then try again.",
  cubaLagi: 'Try again',
  memuatkan: 'Loading zone list…',
};
const TEKS = { ms, en };

export default function TetapanPage() {
  const router = useRouter();
  const t = useTeks(TEKS);
  const { bahasa, tukar } = useBahasa();
  const [zone, setZone] = useState<string | null>(null);
  const [allZones, setAllZones] = useState<any[]>([]);
  const [ralatZon, setRalatZon] = useState(false);
  const [memuatZon, setMemuatZon] = useState(true);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [selectedNegeri, setSelectedNegeri] = useState('');
  const senaraiZonRef = useRef<HTMLDivElement | null>(null);
  const [adaLagiBawah, setAdaLagiBawah] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [azanOn, setAzanOn] = useState(false);
  const [prayerToggles, setPrayerToggles] = useState<Record<string, boolean>>({});
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [user, setUser] = useState<User | null>(null);
  const [pushAzanOn, setPushAzanOn] = useState(false);
  const [pushQadaOn, setPushQadaOn] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Senarai negeri dipotong tepat di sempadan baris pada skrin biasa, jadi
  // tiada petunjuk bahawa ada lagi di bawah. Pembayang ini hilang sebaik
  // sahaja pengguna sampai ke hujung senarai.
  const semakLagiBawah = useCallback(() => {
    const el = senaraiZonRef.current;
    if (!el) return;
    setAdaLagiBawah(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);

  useEffect(() => {
    if (!showZoneSelector) return;
    const id = requestAnimationFrame(semakLagiBawah);
    window.addEventListener('resize', semakLagiBawah);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', semakLagiBawah);
    };
  }, [showZoneSelector, selectedNegeri, memuatZon, ralatZon, allZones, semakLagiBawah]);

  useEffect(() => {
    const savedName = localStorage.getItem('msolat_zone_name');
    if (savedName) setZone(savedName);

    muatSenaraiZon();

    setAzanOn(isGlobalAzanOn());
    setPrayerToggles(Object.fromEntries(AZAN_PRAYERS.map(p => [p, isAzanEnabled(p)])));
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (!u) return;
      // Load preferences using cached token — avoid calling getToken() on every page load
      const cached = localStorage.getItem('msolat_fcm_token');
      if (!cached) return;
      setFcmToken(cached);
      const snap = await getDoc(doc(db, 'fcm_tokens', cached)).catch(() => null);
      if (snap?.exists()) {
        setPushAzanOn(snap.data().azanEnabled ?? true);
        setPushQadaOn(snap.data().qadaReminderEnabled ?? true);
      }
    });
    return unsub;
  }, []);

  // Dahulunya kegagalan ini hanya toast, jadi dialog terbuka kosong tanpa
  // penjelasan dan tiada cara untuk mencuba semula.
  const muatSenaraiZon = () => {
    setMemuatZon(true);
    setRalatZon(false);
    fetch('https://api.waktusolat.app/zones')
      .then(r => r.json())
      .then(setAllZones)
      .catch(() => setRalatZon(true))
      .finally(() => setMemuatZon(false));
  };

  const saveZone = (code: string, name: string, manual: boolean) => {
    localStorage.setItem('msolat_zone_code', code);
    localStorage.setItem('msolat_zone_name', name);
    setManualZone(manual);
    setZone(name);
  };

  const handleZoneSelect = (zoneData: any) => {
    saveZone(zoneData.jakimCode, `${zoneData.jakimCode} · ${zoneData.daerah}`, true);
    setShowZoneSelector(false);
    setSelectedNegeri('');
    toast.success(t.zonDitetapkan(zoneData.daerah));
    router.push('/');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error(RALAT_LOKASI.tidakDisokong());
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        try {
          const res = await fetch(`https://api.waktusolat.app/zones/${c.latitude}/${c.longitude}`);
          const data = await res.json();
          if (!res.ok || 'error' in data) throw new Error();
          saveZone(data.zone, `${data.zone} · ${data.district}`, false);
          toast.success(t.zonDikesan(data.district));
          router.push('/');
        } catch {
          toast.error(RALAT_LOKASI.tiadaZon);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        toast.error(RALAT_LOKASI.tidakDibaca());
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRequestNotif = async () => {
    const result = await requestNotifPermission();
    setNotifPermission(result);
    if (result === 'granted') toast.success(t.notifDibenarkan);
    else toast.error(t.notifTidakDibenarkan);
  };

  const togglePrayer = (prayer: string, value: boolean) => {
    setAzanEnabled(prayer, value);
    setPrayerToggles(prev => ({ ...prev, [prayer]: value }));
  };

  const savePushToken = async (azanEnabled: boolean, qadaEnabled: boolean) => {
    if (!user) return;
    setPushLoading(true);
    try {
      const permission = await requestNotifPermission();
      if (permission !== 'granted') {
        toast.error(t.benarkanDahulu);
        setPushLoading(false);
        return;
      }
      setNotifPermission('granted');

      const token = fcmToken ?? await getFCMToken();
      if (!token) {
        toast.error(t.gagalDaftar);
        setPushLoading(false);
        return;
      }
      setFcmToken(token);
      localStorage.setItem('msolat_fcm_token', token);

      const zoneCode = localStorage.getItem('msolat_zone_code') ?? '';
      if (azanEnabled && !zoneCode) {
        toast.error(t.tetapkanZonDahulu);
        setPushLoading(false);
        return;
      }

      if (!azanEnabled && !qadaEnabled) {
        await deleteDoc(doc(db, 'fcm_tokens', token));
      } else {
        await setDoc(doc(db, 'fcm_tokens', token), {
          uid: user.uid,
          zone: zoneCode,
          azanEnabled,
          azanPrayers: [...AZAN_PRAYERS],
          qadaReminderEnabled: qadaEnabled,
          bahasa,
          updatedAt: new Date(),
        });
      }

      setPushAzanOn(azanEnabled);
      setPushQadaOn(qadaEnabled);
    } catch {
      toast.error(t.gagalSimpan);
    } finally {
      setPushLoading(false);
    }
  };

  const negeriList = Array.from(new Set(allZones.map(z => z.negeri)));

  // Zon disimpan sebagai "WLY01 · Kuala Lumpur". Rentetan titik-tengah itu
  // ialah format storan, bukan sesuatu yang perlu dibaca begitu — jadi ia
  // dipecahkan semula kepada nama dan kod.
  const [kodZon, namaZon] = (() => {
    if (!zone) return [null, null] as const;
    const [kod, ...baki] = zone.split(' · ');
    return baki.length ? ([kod, baki.join(' · ')] as const) : ([null, kod] as const);
  })();

  return (
    <PageShell
      tajuk={t.tajuk}
      lede={t.lede}
    >
      {/* Zon ialah satu-satunya fakta halaman ini, jadi ia diberi layanan
          yang sama seperti nombor hero di halaman lain. */}
      <section className="kad max-w-2xl p-5 lg:p-7">
        <div className="flex items-center gap-3">
          <CipIkon ikon={MapPinIcon} i={2} />
          <p className="paparan text-xl leading-none">{t.zonAnda}</p>
        </div>
        <div className="mt-5 flex flex-col items-start gap-3">
          {namaZon ? (
            <>
              <p className="paparan text-4xl leading-[1.05] lg:text-5xl">{namaZon}</p>
              {kodZon && (
                <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
                  {kodZon}
                </span>
              )}
            </>
          ) : (
            <p className="paparan text-4xl leading-[1.05] text-muted-foreground lg:text-5xl">
              {t.belumDipilih}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => { setSelectedNegeri(''); setShowZoneSelector(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
          >
            <PencilIcon className="size-4" />
            {t.pilihZon}
          </button>
          <button
            onClick={detectLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {isLocating ? <Loader2Icon className="size-4 animate-spin" /> : <LocateFixedIcon className="size-4" />}
            {isLocating ? t.mengesan : t.kesanLokasi}
          </button>
        </div>

        {coords && (
          <dl className="mt-5 rounded-2xl bg-muted px-4 py-3">
            <div className="flex items-baseline justify-between gap-6">
              <dt className="text-sm text-muted-foreground">{t.lokasiDikesan}</dt>
              <dd className="tabular font-mono text-sm">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <div className="mt-4 grid max-w-2xl gap-4">
        <section className="kad p-5">
          <KepalaKad ikon={InfoIcon} i={5} tajuk={t.caraTajuk} />
          <p className="mt-4 leading-relaxed text-muted-foreground">{t.cara1}</p>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.cara2}</p>
        </section>

        <section className="kad p-5">
          <KepalaKad ikon={LanguagesIcon} i={0} tajuk={t.bahasa} />
          <div role="radiogroup" aria-label={t.bahasa} className="mt-4 inline-flex w-full rounded-full bg-muted p-1">
            {BAHASA.map(b => (
              <button
                key={b}
                role="radio"
                aria-checked={bahasa === b}
                lang={b}
                onClick={() => tukar(b)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                  bahasa === b ? 'bg-card font-semibold text-foreground shadow-sm dark:bg-accent dark:text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {bahasa === b && <CheckIcon className="size-4 shrink-0 text-primary" />}
                <span>{NAMA_BAHASA[b]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="kad p-5">
          <KepalaKad ikon={PaletteIcon} i={3} tajuk={t.rupa} />
          <div className="mt-4">
            <PemilihAksen />
          </div>
        </section>

        <Link href="/apa-baru" className="kad flex items-center gap-3 p-5 transition-colors hover:bg-muted/40">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', palet(2).lembut, palet(2).teks)}>
            <GiftIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t.apaBaru}</span>
            <span className="block text-sm text-muted-foreground">{t.versi(APP_VERSION)}</span>
          </span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </Link>

        {/* Satu-satunya rujukan kepada aplikasi lain dalam keseluruhan MariSolat,
            dan ia diletakkan di sini dengan sengaja: Tetapan ialah tempat orang
            datang untuk melihat tentang aplikasi ini. Ia tidak diletakkan pada
            halaman waktu solat, halaman ilmu atau tasbih — promosi di sebelah
            kiraan detik azan atau bacaan zikir menjatuhkan nada aplikasi. */}
        <section className="kad p-5">
          <KepalaKad ikon={LayoutGridIcon} i={4} tajuk={t.aplikasiLain} />
          <a
            href="https://kirapoket.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group -mx-2 mt-3 flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-muted"
          >
            {/* Disalin dari src/app/icon.tsx KiraPoket, sama seperti KiraPoket
                menyimpan public/marisolat-icon.png untuk arah sebaliknya. Fail
                tempatan, bukan pautan panas: tiada kebergantungan pada tapak lain
                dan tiada permintaan rentas-tapak semasa halaman dimuatkan. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kirapoket-icon.png"
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-2xl"
            />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">KiraPoket</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                {t.kiraPoket}
              </span>
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <ExternalLinkIcon className="size-4" />
            </span>
          </a>
        </section>
      </div>

      {/* Tetapan azan dan notifikasi push di bawah dimatikan sebelum kerja ini
          bermula, jadi ia dibiarkan seperti asal — bukan keputusan reka bentuk.
          Nyahkomen untuk menghidupkannya semula; gayanya perlu diselaraskan
          dengan senarai halaman lain jika itu berlaku. */}

      {/* Azan global toggle */}
      {/* <div className="py-4">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Azan</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">Mainkan azan waktu solat</p>
            <Switch checked={azanOn} onCheckedChange={v => { setGlobalAzanOn(v); setAzanOn(v); }} />
          </div>
          {notifPermission !== 'granted' && (
            <Button variant="outline" size="sm" onClick={handleRequestNotif}>
              Benarkan Notifikasi Pelayar
            </Button>
          )}
        </div>
      </div> */}

      {/* Per-prayer azan toggles */}
      {/* {azanOn && (
        <div className="py-4">
          <p className="mb-3 text-sm font-semibold text-muted-foreground">Azan Setiap Solat</p>
          <div className="space-y-3">
            {AZAN_PRAYERS.map(prayer => (
              <div key={prayer} className="flex items-center justify-between">
                <p className="text-sm">{PRAYER_LABELS[prayer]}</p>
                <Switch checked={prayerToggles[prayer] ?? true} onCheckedChange={v => togglePrayer(prayer, v)} />
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Push notifications */}
      {/* {user && (
        <div className="py-4">
          <p className="mb-1 text-sm font-semibold text-muted-foreground">Notifikasi Push</p>
          <p className="text-xs text-muted-foreground mb-3">Terima notifikasi walaupun aplikasi ditutup.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Azan waktu solat</p>
                <p className="text-xs text-muted-foreground">Berdasarkan zon anda</p>
              </div>
              <Switch checked={pushAzanOn} disabled={pushLoading} onCheckedChange={v => savePushToken(v, pushQadaOn)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Peringatan qada harian</p>
                <p className="text-xs text-muted-foreground">Setiap hari jam 9 malam</p>
              </div>
              <Switch checked={pushQadaOn} disabled={pushLoading} onCheckedChange={v => savePushToken(pushAzanOn, v)} />
            </div>
          </div>
        </div>
      )} */}

      {/* Pemilih zon */}
      <Dialog open={showZoneSelector} onOpenChange={open => { setShowZoneSelector(open); if (!open) setSelectedNegeri(''); }}>
        <DialogContent className="flex max-h-[80vh] max-w-lg flex-col overflow-hidden rounded-3xl">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">
              {selectedNegeri || t.pilihZon}
            </DialogTitle>
            <DialogDescription asChild>
              {selectedNegeri ? (
                <button
                  className="text-left text-sm text-primary transition-opacity hover:opacity-80"
                  onClick={() => setSelectedNegeri('')}
                >
                  {t.semuaNegeri}
                </button>
              ) : (
                <span>{t.pilihNegeri}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="relative -mx-1 flex min-h-0 flex-1 flex-col">
            <div
              ref={senaraiZonRef}
              onScroll={semakLagiBawah}
              className="flex-1 overflow-y-auto px-1"
            >
              {ralatZon ? (
                <div className="py-6">
                  <p className="leading-relaxed text-muted-foreground">
                    {t.ralatZon}
                  </p>
                  <button
                    onClick={muatSenaraiZon}
                    className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t.cubaLagi}
                  </button>
                </div>
              ) : memuatZon ? (
                <p className="py-6 text-muted-foreground">{t.memuatkan}</p>
              ) : !selectedNegeri ? (
                <div className="flex flex-col gap-0.5">
                  {negeriList.map(negeri => (
                    <button
                      key={negeri}
                      onClick={() => setSelectedNegeri(negeri)}
                      className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {negeri}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {allZones.filter(z => z.negeri === selectedNegeri).map(z => (
                    <button
                      key={z.jakimCode}
                      onClick={() => handleZoneSelect(z)}
                      className="group flex w-full items-center justify-between gap-6 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {/* Satu zon boleh meliputi tujuh daerah. Memotongnya
                          menyembunyikan daerah yang mungkin sedang dicari
                          pengguna, jadi ia dibiarkan membalut. */}
                      <span className="min-w-0 text-pretty leading-relaxed">{z.daerah}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground group-hover:bg-card">{z.jakimCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-background via-background/80 to-transparent pb-1 transition-opacity duration-300 ${adaLagiBawah ? 'opacity-100' : 'opacity-0'}`}
            >
              <ChevronDownIcon className="size-5 animate-bounce text-muted-foreground" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
