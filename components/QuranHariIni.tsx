'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ArrowRight, BookOpen } from 'lucide-react';
import { db } from '@/firebase';
import { useAkaun } from '@/components/AkaunProvider';
import { useTeks } from '@/components/BahasaProvider';
import KadQuran from '@/components/KadQuran';
import { adalahQuran, type Amalan, type LogHari, type LogTahun } from '@/lib/amalan';
import { todayStr } from '@/lib/qada';

const ms = {
  tajuk: 'Al-Quran',
  ajak: 'Jejak bacaan Al-Quran harian anda dan simpan tempat terakhir anda membaca.',
  mula: 'Mula di Jejak Amalan',
  gagal: 'Rekod tidak dapat disimpan.',
};
const en: typeof ms = {
  tajuk: 'Quran',
  ajak: 'Track your daily Quran reading and keep your place.',
  mula: 'Start in Ibadah Tracker',
  gagal: "Couldn't save your record.",
};
const TEKS = { ms, en };

/**
 * Kad bacaan Al-Quran di halaman utama. Ia membaca dan menulis amalan yang
 * sama seperti Jejak Amalan, jadi menanda di sini mengemas kini grid di sana.
 */
export default function QuranHariIni() {
  const t = useTeks(TEKS);
  const { user, memuat } = useAkaun();
  const [amalan, setAmalan] = useState<Amalan | null | undefined>(undefined);
  const [logMentah, setLogMentah] = useState<Record<string, LogTahun>>({});
  const hariIni = todayStr();

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'users', user.uid, 'amalan'), snap => {
      const semua = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Amalan).sort((x, y) => x.susunan - y.susunan);
      setAmalan(semua.find(adalahQuran) ?? null);
    }, () => setAmalan(null));
  }, [user]);

  // Baki dikira dari hari amalan bermula, jadi setiap tahun sejak itu diperlukan.
  const tahun = useMemo(() => {
    if (!amalan) return [];
    const senarai: string[] = [];
    for (let y = Number(amalan.mula.slice(0, 4)); y <= Number(hariIni.slice(0, 4)); y++) senarai.push(String(y));
    return senarai;
  }, [amalan, hariIni]);
  const idAmalan = amalan?.id;

  useEffect(() => {
    if (!user || !idAmalan) return;
    const henti = tahun.map(y => onSnapshot(doc(db, 'users', user.uid, 'amalan', idAmalan, 'tahun', y), snap => {
      setLogMentah(prev => ({ ...prev, [y]: (snap.data() ?? {}) as LogTahun }));
    }));
    return () => henti.forEach(f => f());
  }, [user, idAmalan, tahun]);

  const log = useMemo(() => Object.assign({}, ...Object.values(logMentah)) as LogTahun, [logMentah]);

  if (memuat || (user && amalan === undefined)) return null;

  const kepala = (
    <h2 className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-w3-lembut text-w3">
        <BookOpen className="size-5" />
      </span>
      <span className="paparan text-2xl">{t.tajuk}</span>
    </h2>
  );

  if (!user || !amalan) {
    return (
      <section>
        {kepala}
        <div className="kad mt-4 p-5">
          <p className="text-sm text-muted-foreground">{t.ajak}</p>
          <Link href="/amalan" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            {t.mula} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  const tulis = (isi: LogHari) => {
    setDoc(doc(db, 'users', user.uid, 'amalan', amalan.id, 'tahun', hariIni.slice(0, 4)), { [hariIni]: isi }, { merge: true })
      .catch(() => toast.error(t.gagal));
  };
  const ubah = (u: Partial<Amalan>) => {
    updateDoc(doc(db, 'users', user.uid, 'amalan', amalan.id), u).catch(() => toast.error(t.gagal));
  };

  return (
    <section>
      {kepala}
      <div className="mt-4">
        <KadQuran a={amalan} s={hariIni} hariIni={hariIni} log={log} onTulis={tulis} onUbah={ubah} tunjukNama={false} />
      </div>
    </section>
  );
}
