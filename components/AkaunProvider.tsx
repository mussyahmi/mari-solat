'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db } from '@/firebase';
import { isInAppBrowser } from '@/lib/utils';
import { PRAYERS, type QadaCounts } from '@/lib/qada';

type Akaun = {
  user: User | null;
  alias: string;
  /** Baki qada, atau null jika belum dimuatkan / tiada rekod. */
  bakiQada: number | null;
  memuat: boolean;
  masuk: () => Promise<void>;
  keluar: () => Promise<void>;
};

const KonteksAkaun = createContext<Akaun | null>(null);

export function useAkaun() {
  const nilai = useContext(KonteksAkaun);
  if (!nilai) throw new Error('useAkaun mesti berada dalam <AkaunProvider>');
  return nilai;
}

/**
 * Satu pendengar auth untuk seluruh aplikasi.
 *
 * Log masuk dahulunya hidup di dalam /qada-solat sahaja, yang menjadikan akaun
 * itu ciri satu halaman dan bukan ciri aplikasi — tiada cara untuk mengetahui
 * sama ada anda sudah log masuk tanpa pergi ke sana. Kepala dan papan pemuka
 * kini membaca dari sini.
 */
export default function AkaunProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [alias, setAlias] = useState('');
  const [bakiQada, setBakiQada] = useState<number | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u);
      setMemuat(false);
      if (!u) {
        setAlias('');
        setBakiQada(null);
        return;
      }
      const profil = await getDoc(doc(db, 'users', u.uid)).catch(() => null);
      if (profil?.exists()) setAlias(profil.data().alias ?? '');
    });
  }, []);

  // Baki qada ditonton dan bukan dibaca sekali, supaya melog qada pada
  // /qada-solat mengemas kini modul papan pemuka tanpa muat semula.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'users', user.uid, 'qada', 'counts'),
      snap => {
        if (!snap.exists()) { setBakiQada(null); return; }
        const data = snap.data() as Partial<QadaCounts>;
        setBakiQada(PRAYERS.reduce((jumlah, p) => jumlah + (data[p] ?? 0), 0));
      },
      () => setBakiQada(null)
    );
  }, [user]);

  const masuk = async () => {
    // Log masuk Google disekat dalam pelayar dalaman Instagram/Facebook, dan
    // popup itu gagal secara senyap. Katakan sebabnya.
    if (isInAppBrowser()) {
      toast.error('Log masuk Google tidak berfungsi dalam pelayar ini. Buka MariSolat dalam Safari atau Chrome.');
      return;
    }
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      toast.error('Log masuk gagal.');
    }
  };

  const keluar = async () => {
    await signOut(auth);
  };

  return (
    <KonteksAkaun.Provider value={{ user, alias, bakiQada, memuat, masuk, keluar }}>
      {children}
    </KonteksAkaun.Provider>
  );
}
