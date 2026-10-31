'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { bahasaSemasa } from '@/lib/bahasa';
import { solatBaru } from '@/lib/amalan';
import { pastikanLalai } from '@/lib/amalan-lalai';
import { db } from '@/firebase';
import { useAkaun } from '@/components/AkaunProvider';
import type { Amalan, LogHari, LogTahun } from '@/lib/amalan';
import { todayStr } from '@/lib/qada';

/**
 * Amalan pengguna dan rekod HARI INI sahaja — untuk ringkasan di halaman
 * utama. Jejak Amalan memuatkan sejarah penuh; di sini hanya dokumen tahun
 * semasa diperlukan.
 */
export function useAmalanHariIni() {
  const { user } = useAkaun();
  const [amalan, setAmalan] = useState<Amalan[]>([]);
  const [log, setLog] = useState<Record<string, LogHari | undefined>>({});
  const hariIni = todayStr();
  const tahun = hariIni.slice(0, 4);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      collection(db, 'users', user.uid, 'amalan'),
      snap => {
        const semua = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Amalan).sort((a, b) => a.susunan - b.susunan);
        setAmalan(semua);
        pastikanLalai(user.uid, semua, bahasaSemasa());
      },
      () => setAmalan([]),
    );
  }, [user]);

  const kunci = amalan.map(a => a.id).join(',');
  useEffect(() => {
    if (!user || !kunci) return;
    const henti = kunci.split(',').map(id => onSnapshot(doc(db, 'users', user.uid, 'amalan', id, 'tahun', tahun), snap => {
      const data = (snap.data() ?? {}) as LogTahun;
      setLog(prev => ({ ...prev, [id]: data[hariIni] }));
    }));
    return () => henti.forEach(f => f());
  }, [user, kunci, tahun, hariIni]);

  const tulis = (a: Amalan, isi: LogHari) => {
    if (!user) return Promise.resolve();
    return setDoc(doc(db, 'users', user.uid, 'amalan', a.id, 'tahun', tahun), { [hariIni]: isi }, { merge: true });
  };

  const ciptaSolat = async (): Promise<Amalan | undefined> => {
    if (!user) return undefined;
    const ref = doc(collection(db, 'users', user.uid, 'amalan'));
    const baru = solatBaru(bahasaSemasa(), hariIni, Math.min(0, ...amalan.map(a => a.susunan)) - 1);
    await setDoc(ref, baru);
    return { id: ref.id, ...baru };
  };

  // Selepas log keluar, data lama tidak dipaparkan walaupun state belum dikosongkan.
  return { amalan: user ? amalan : [], log, tulis, ciptaSolat, adaAkaun: !!user };
}
