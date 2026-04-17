'use client';

import { useState, useEffect } from 'react';
import { Loader2Icon, MapPinIcon, PencilIcon } from 'lucide-react';
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
import Sidebar from '@/components/Sidebar';
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
    toast.success('Zon dikemaskini.');
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
          toast.success('Zon dikesan daripada lokasi anda.');
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

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-10 lg:px-10 lg:py-12 max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
        <header className="mb-10">
          <h1 className="text-3xl font-display tracking-tight">Tetapan</h1>
          <p className="text-sm text-muted-foreground/70 mt-2">Urus zon waktu solat anda.</p>
        </header>

        <div className="divide-y divide-border/50">

          {/* Zone */}
          <div className="py-5">
            <p className="text-xs text-muted-foreground/50 uppercase tracking-widest mb-3 font-semibold">Zon Waktu Solat</p>
            <div className="flex items-center justify-between gap-4">
              {zone
                ? <p className="text-sm font-medium">{zone}</p>
                : <p className="text-sm text-muted-foreground">Tiada zon dipilih</p>
              }
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => { setSelectedNegeri(''); setShowZoneSelector(true); }}>
                <PencilIcon className="size-3.5 mr-1.5" />Tukar
              </Button>
            </div>
          </div>

          {/* Detect location */}
          <div className="py-5">
            <p className="text-xs text-muted-foreground/50 uppercase tracking-widest mb-3 font-semibold">Lokasi Semasa</p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {coords
                  ? <span className="font-mono text-foreground">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                  : 'Kesan zon secara automatik berdasarkan lokasi semasa.'
                }
              </p>
              <Button variant="outline" size="sm" onClick={detectLocation} disabled={isLocating} className="shrink-0">
                {isLocating
                  ? <><Loader2Icon className="animate-spin size-3.5 mr-1.5" />Mengesan...</>
                  : <><MapPinIcon className="size-3.5 mr-1.5" />Guna Lokasi Semasa</>
                }
              </Button>
            </div>
          </div>

          {/* Azan global toggle */}
          {/* <div className="py-4">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Azan</p>
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
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Azan Setiap Solat</p>
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
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-1">Notifikasi Push</p>
              <p className="text-xs text-muted-foreground/50 mb-3">Terima notifikasi walaupun aplikasi ditutup.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Azan waktu solat</p>
                    <p className="text-xs text-muted-foreground/50">Berdasarkan zon anda</p>
                  </div>
                  <Switch
                    checked={pushAzanOn}
                    disabled={pushLoading}
                    onCheckedChange={v => savePushToken(v, pushQadaOn)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Peringatan qada harian</p>
                    <p className="text-xs text-muted-foreground/50">Setiap hari jam 9 malam</p>
                  </div>
                  <Switch
                    checked={pushQadaOn}
                    disabled={pushLoading}
                    onCheckedChange={v => savePushToken(pushAzanOn, v)}
                  />
                </div>
              </div>
            </div>
          )} */}

        </div>
      </main>

      {/* Zone selector dialog */}
      <Dialog open={showZoneSelector} onOpenChange={open => { setShowZoneSelector(open); if (!open) setSelectedNegeri(''); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            {selectedNegeri ? (
              <>
                <DialogTitle>{selectedNegeri}</DialogTitle>
                <DialogDescription asChild>
                  <button className="text-left text-xs text-primary mt-0.5" onClick={() => setSelectedNegeri('')}>
                    ← Kembali
                  </button>
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle>Pilih Zon</DialogTitle>
                <DialogDescription>Pilih negeri dahulu.</DialogDescription>
              </>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {!selectedNegeri ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {negeriList.map(negeri => (
                  <button
                    key={negeri}
                    onClick={() => setSelectedNegeri(negeri)}
                    className="text-sm text-left px-3 py-2.5 rounded-lg border border-border hover:bg-muted transition"
                  >
                    {negeri}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {allZones.filter(z => z.negeri === selectedNegeri).map(z => (
                  <button
                    key={z.jakimCode}
                    onClick={() => handleZoneSelect(z)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:bg-muted transition"
                  >
                    <span className="text-sm font-medium">{z.jakimCode}</span>
                    <span className="text-sm text-muted-foreground"> · {z.daerah}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
