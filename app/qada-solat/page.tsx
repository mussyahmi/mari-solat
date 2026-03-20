'use client';

import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import Sidebar from '@/components/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const PRAYERS = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const;
type Prayer = typeof PRAYERS[number];
type QadaCounts = Record<Prayer, number>;

const DEFAULT: QadaCounts = { subuh: 0, zohor: 0, asar: 0, maghrib: 0, isyak: 0 };
const MALAY_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];

function formatMalayDate(date: Date) {
  return `${date.getDate()} ${MALAY_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function estimateCompletion(total: number, dailyRate: number): { days: number; date: string } | null {
  if (total <= 0 || dailyRate <= 0) return null;
  const days = Math.ceil(total / dailyRate);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return { days, date: formatMalayDate(date) };
}

export default function QadaSolatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState<QadaCounts>(DEFAULT);
  const [dailyRate, setDailyRate] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid, 'qada', 'counts'));
          if (snap.exists()) {
            const data = snap.data();
            setCounts({ ...DEFAULT, ...(data as QadaCounts) });
            if (typeof data.dailyRate === 'number') setDailyRate(data.dailyRate);
          }
        } catch {
          toast.error('Gagal memuatkan data.');
        }
      } else {
        setCounts(DEFAULT);
        setDailyRate(1);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const save = async (nextCounts: QadaCounts, nextRate: number) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'qada', 'counts'), { ...nextCounts, dailyRate: nextRate });
    } catch {
      toast.error('Gagal menyimpan.');
    }
  };

  const updateCount = async (prayer: Prayer, delta: number) => {
    const next = { ...counts, [prayer]: Math.max(0, counts[prayer] + delta) };
    setCounts(next);
    await save(next, dailyRate);
  };

  const updateRate = async (delta: number) => {
    const next = Math.max(1, dailyRate + delta);
    setDailyRate(next);
    await save(counts, next);
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      toast.error('Log masuk gagal.');
    }
  };

  const total = PRAYERS.reduce((sum, p) => sum + counts[p], 0);
  const estimation = estimateCompletion(total, dailyRate);

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 lg:px-8 py-10">

          {/* Header */}
          <div className="mb-10">
            <p className="text-xs text-muted-foreground/50 uppercase tracking-widest mb-1">Rekod</p>
            <h1 className="text-2xl font-semibold">Qada Solat</h1>
            <p className="text-sm text-muted-foreground/60 mt-1">Jejak solat yang perlu diganti.</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {PRAYERS.map(p => (
                <div key={p} className="flex items-center justify-between py-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
              ))}
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center py-16 gap-5">
              <p className="text-sm text-muted-foreground/60 text-center">
                Log masuk untuk menyimpan rekod qada anda merentas peranti.
              </p>
              <button
                onClick={login}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border transition"
              >
                <GoogleIcon />
                Log Masuk dengan Google
              </button>
            </div>
          ) : (
            <>
              {/* User row */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
                  )}
                  <span className="text-sm text-muted-foreground">{user.displayName}</span>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition"
                >
                  Log keluar
                </button>
              </div>

              {/* Prayer list */}
              <div className="divide-y divide-border/50">
                {PRAYERS.map(prayer => (
                  <div key={prayer} className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium capitalize">{prayer}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateCount(prayer, -1)}
                        disabled={counts[prayer] === 0}
                        className="size-8 rounded-full border border-border/50 flex items-center justify-center text-lg text-muted-foreground hover:text-foreground hover:border-border transition disabled:opacity-25"
                      >−</button>
                      <span className="text-base font-bold tabular-nums w-8 text-center">{counts[prayer]}</span>
                      <button
                        onClick={() => updateCount(prayer, 1)}
                        className="size-8 rounded-full border border-border/50 flex items-center justify-center text-lg text-muted-foreground hover:text-foreground hover:border-border transition"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-between">
                <p className="text-xs text-muted-foreground/50 uppercase tracking-widest">Jumlah</p>
                <p className="text-3xl font-bold tabular-nums">{total}</p>
              </div>

              {total === 0 ? (
                <p className="text-xs text-muted-foreground/40 text-center mt-8">
                  Tiada qada tertunggak. Alhamdulillah.
                </p>
              ) : (
                <div className="mt-8 pt-6 border-t border-border/40 space-y-5">

                  {/* Daily rate */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Kadar Harian</p>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">Berapa qada sehari?</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateRate(-1)}
                        disabled={dailyRate <= 1}
                        className="size-8 rounded-full border border-border/50 flex items-center justify-center text-lg text-muted-foreground hover:text-foreground hover:border-border transition disabled:opacity-25"
                      >−</button>
                      <span className="text-base font-bold tabular-nums w-8 text-center">{dailyRate}</span>
                      <button
                        onClick={() => updateRate(1)}
                        className="size-8 rounded-full border border-border/50 flex items-center justify-center text-lg text-muted-foreground hover:text-foreground hover:border-border transition"
                      >+</button>
                    </div>
                  </div>

                  {/* Estimation */}
                  {estimation && (
                    <div className="bg-muted/40 rounded-2xl px-5 py-4">
                      <p className="text-xs text-muted-foreground/50 uppercase tracking-widest mb-3">Anggaran Selesai</p>
                      <p className="text-2xl font-bold">
                        {estimation.days === 1 ? 'Esok' : `${estimation.days} hari lagi`}
                      </p>
                      <p className="text-sm text-muted-foreground/60 mt-1">{estimation.date}</p>
                    </div>
                  )}

                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
