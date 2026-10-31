'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { bahasaSemasa, KUNCI_BAHASA, type Bahasa, type Kamus } from '@/lib/bahasa';

type Konteks = { bahasa: Bahasa; tukar: (b: Bahasa) => void };

const KonteksBahasa = createContext<Konteks>({ bahasa: 'ms', tukar: () => {} });

export const useBahasa = () => useContext(KonteksBahasa);

/** Pilih kamus bahasa semasa. */
export function useTeks<T>(kamus: Kamus<T>): T {
  return kamus[useContext(KonteksBahasa).bahasa];
}

/**
 * Pelayan sentiasa memaparkan BM (ia tidak dapat membaca localStorage), jadi
 * bahasa sebenar dibaca selepas lekap. Bermula dengan 'ms' juga mengelakkan
 * ketidakpadanan penghidratan.
 */
export default function BahasaProvider({ children }: { children: React.ReactNode }) {
  const [bahasa, setBahasa] = useState<Bahasa>('ms');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBahasa(bahasaSemasa());
  }, []);

  useEffect(() => {
    document.documentElement.lang = bahasa;
  }, [bahasa]);

  const tukar = useCallback((b: Bahasa) => {
    setBahasa(b);
    try { localStorage.setItem(KUNCI_BAHASA, b); } catch { /* storan disekat */ }
    // Notifikasi tolak dikarang di pelayan, jadi token perlu tahu bahasanya.
    // Gagal secara senyap: tiada token bermakna tiada notifikasi untuk diubah.
    const token = (() => { try { return localStorage.getItem('msolat_fcm_token'); } catch { return null; } })();
    if (token) setDoc(doc(db, 'fcm_tokens', token), { bahasa: b }, { merge: true }).catch(() => {});
  }, []);

  return <KonteksBahasa.Provider value={{ bahasa, tukar }}>{children}</KonteksBahasa.Provider>;
}
