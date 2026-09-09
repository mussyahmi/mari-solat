'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLinkIcon, Loader2Icon, MapPinIcon, PencilIcon } from 'lucide-react';
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

export default function TetapanPage() {
  const router = useRouter();
  const [zone, setZone] = useState<string | null>(null);
  const [allZones, setAllZones] = useState<any[]>([]);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [selectedNegeri, setSelectedNegeri] = useState('');
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

  useEffect(() => {
    const savedName = localStorage.getItem('msolat_zone_name');
    if (savedName) setZone(savedName);

    fetch('https://api.waktusolat.app/zones')
      .then(r => r.json())
      .then(setAllZones)
      .catch(() => toast.error('Gagal memuatkan senarai zon.'));

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
    toast.success(`Zon ditetapkan ke ${zoneData.daerah}.`);
    router.push('/');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolokasi tidak disokong oleh pelayar anda.');
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
          toast.success(`Zon dikesan: ${data.district}.`);
          router.push('/');
        } catch {
          toast.error('Tiada zon ditemui untuk lokasi ini.');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        toast.error('Tidak dapat mengakses lokasi.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRequestNotif = async () => {
    const result = await requestNotifPermission();
    setNotifPermission(result);
    if (result === 'granted') toast.success('Notifikasi dibenarkan.');
    else toast.error('Notifikasi tidak dibenarkan.');
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
        toast.error('Benarkan notifikasi pelayar dahulu.');
        setPushLoading(false);
        return;
      }
      setNotifPermission('granted');

      const token = fcmToken ?? await getFCMToken();
      if (!token) {
        toast.error('Gagal mendaftar notifikasi. Cuba semula.');
        setPushLoading(false);
        return;
      }
      setFcmToken(token);
      localStorage.setItem('msolat_fcm_token', token);

      const zoneCode = localStorage.getItem('msolat_zone_code') ?? '';
      if (azanEnabled && !zoneCode) {
        toast.error('Tetapkan zon waktu solat dahulu.');
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
          updatedAt: new Date(),
        });
      }

      setPushAzanOn(azanEnabled);
      setPushQadaOn(qadaEnabled);
    } catch {
      toast.error('Gagal menyimpan tetapan notifikasi.');
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
      tajuk="Tetapan"
      lede="Zon menentukan setiap waktu yang dipaparkan dalam aplikasi ini."
    >
      {/* Zon ialah satu-satunya fakta halaman ini, jadi ia diberi layanan
          yang sama seperti nombor hero di halaman lain. */}
      <div className="flex flex-col items-start gap-3">
        <p className="paparan text-2xl leading-none lg:text-3xl">Zon anda</p>
        {namaZon ? (
          <>
            <p className="paparan text-5xl leading-none lg:text-6xl">{namaZon}</p>
            {kodZon && <p className="text-muted-foreground">{kodZon}</p>}
          </>
        ) : (
          <p className="paparan text-5xl leading-none text-muted-foreground lg:text-6xl">
            Belum dipilih
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          onClick={() => { setSelectedNegeri(''); setShowZoneSelector(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
        >
          <PencilIcon className="size-4" />
          Pilih zon
        </button>
        <button
          onClick={detectLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-muted disabled:opacity-40"
        >
          {isLocating ? <Loader2Icon className="size-4 animate-spin" /> : <MapPinIcon className="size-4" />}
          {isLocating ? 'Mengesan…' : 'Kesan dari lokasi semasa'}
        </button>
      </div>

      {coords && (
        <dl className="mt-10 max-w-md border-t border-border/60 pt-5">
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-sm text-muted-foreground">Lokasi dikesan</dt>
            <dd className="tabular font-mono text-sm">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </dd>
          </div>
        </dl>
      )}

      <section className="mt-20 max-w-[68ch]">
        <h2 className="paparan text-2xl">Cara zon dipilih</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          JAKIM membahagikan Malaysia kepada zon waktu solat, setiap satu dengan
          kod tersendiri seperti WLY01. Waktu berbeza beberapa minit antara zon
          bersebelahan, jadi pilih zon tempat anda benar-benar berada.
        </p>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Mengesan dari lokasi semasa akan memilih zon terdekat secara
          automatik. Zon yang anda pilih sendiri tidak akan ditukar olehnya.
        </p>
      </section>

      {/* Satu-satunya rujukan kepada aplikasi lain dalam keseluruhan MariSolat,
          dan ia diletakkan di sini dengan sengaja: Tetapan ialah tempat orang
          datang untuk melihat tentang aplikasi ini. Ia tidak diletakkan pada
          halaman waktu solat, halaman ilmu atau tasbih — promosi di sebelah
          kiraan detik azan atau bacaan zikir menjatuhkan nada aplikasi. */}
      <section className="mt-20 max-w-[68ch]">
        <h2 className="paparan text-2xl">Aplikasi lain</h2>
        <a
          href="https://kirapoket.web.app"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 flex items-baseline justify-between gap-6 border-t border-border/50 py-4 transition-colors hover:text-primary"
        >
          <span className="min-w-0">
            <span className="text-lg">KiraPoket</span>
            <span className="mt-1 block leading-relaxed text-muted-foreground">
              Jejak perbelanjaan mengikut kitaran gaji, bukan bulan kalendar.
            </span>
          </span>
          <ExternalLinkIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </a>
      </section>

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
        <DialogContent className="flex max-h-[80vh] max-w-lg flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">
              {selectedNegeri || 'Pilih zon'}
            </DialogTitle>
            <DialogDescription asChild>
              {selectedNegeri ? (
                <button
                  className="text-left text-sm text-primary transition-opacity hover:opacity-80"
                  onClick={() => setSelectedNegeri('')}
                >
                  ← Semua negeri
                </button>
              ) : (
                <span>Pilih negeri dahulu.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            {!selectedNegeri ? (
              <div className="divide-y divide-border/50 border-t border-border/50">
                {negeriList.map(negeri => (
                  <button
                    key={negeri}
                    onClick={() => setSelectedNegeri(negeri)}
                    className="w-full py-3.5 text-left transition-colors hover:text-primary"
                  >
                    {negeri}
                  </button>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/50 border-t border-border/50">
                {allZones.filter(z => z.negeri === selectedNegeri).map(z => (
                  <button
                    key={z.jakimCode}
                    onClick={() => handleZoneSelect(z)}
                    className="flex w-full items-baseline justify-between gap-6 py-3.5 text-left transition-colors hover:text-primary"
                  >
                    {/* Satu zon boleh meliputi tujuh daerah. Memotongnya
                        menyembunyikan daerah yang mungkin sedang dicari
                        pengguna, jadi ia dibiarkan membalut. */}
                    <span className="min-w-0 text-pretty leading-relaxed">{z.daerah}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">{z.jakimCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
