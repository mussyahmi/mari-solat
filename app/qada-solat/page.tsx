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

function estimateCompletion(total: number, dailyRate: number): { days: number; label: string; date: string } | null {
  if (total <= 0 || dailyRate <= 0) return null;
  const days = Math.ceil(total / dailyRate);
  const date = new Date();
  date.setDate(date.getDate() + days);

  let label: string;
  if (days === 1) {
    label = 'Esok';
  } else if (days < 30) {
    label = `${days} hari lagi`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    const rem = days % 30;
    label = rem > 0 ? `${months} bulan ${rem} hari lagi` : `${months} bulan lagi`;
  } else {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const rem = days % 365 % 30;
    if (months > 0 && rem > 0) label = `${years} tahun ${months} bulan ${rem} hari lagi`;
    else if (months > 0) label = `${years} tahun ${months} bulan lagi`;
    else if (rem > 0) label = `${years} tahun ${rem} hari lagi`;
    else label = `${years} tahun lagi`;
  }

  return { days, label, date: formatMalayDate(date) };
}

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayStr() { return localDateStr(new Date()); }
function yesterdayStr() { return localDateStr(new Date(Date.now() - 86400000)); }

export default function QadaSolatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState<QadaCounts>(DEFAULT);
  const [dailyRate, setDailyRate] = useState(1);
  const [initialTotal, setInitialTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastLogDate, setLastLogDate] = useState('');
  const [preLogCounts, setPreLogCounts] = useState<QadaCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<Prayer | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingInitial, setEditingInitial] = useState(false);
  const [editInitialValue, setEditInitialValue] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [logInputs, setLogInputs] = useState<QadaCounts>(DEFAULT);

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
            if (typeof data.initialTotal === 'number') setInitialTotal(data.initialTotal);
            const loadedLastLog = typeof data.lastLogDate === 'string' ? data.lastLogDate : '';
            const loadedStreak = typeof data.streak === 'number' ? data.streak : 0;
            const streakAlive = loadedLastLog === todayStr() || loadedLastLog === yesterdayStr();
            const effectiveStreak = streakAlive ? loadedStreak : 0;
            setStreak(effectiveStreak);
            setLastLogDate(loadedLastLog);
            if (!streakAlive && loadedStreak > 0) {
              const c = { ...DEFAULT, ...(data as QadaCounts) };
              await setDoc(doc(db, 'users', u.uid, 'qada', 'counts'), {
                ...c,
                dailyRate: data.dailyRate ?? 1,
                initialTotal: data.initialTotal ?? 0,
                streak: 0,
                lastLogDate: loadedLastLog,
              });
            }
          }
        } catch {
          toast.error('Gagal memuatkan data.');
        }
      } else {
        setCounts(DEFAULT);
        setDailyRate(1);
        setInitialTotal(0);
        setStreak(0);
        setLastLogDate('');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const save = async (
    nextCounts: QadaCounts, nextRate: number, nextInitial: number,
    nextStreak: number, nextLastLog: string,
  ) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'qada', 'counts'), {
        ...nextCounts, dailyRate: nextRate, initialTotal: nextInitial,
        streak: nextStreak, lastLogDate: nextLastLog,
      });
    } catch {
      toast.error('Gagal menyimpan.');
    }
  };

  const updateCount = async (prayer: Prayer, delta: number) => {
    const next = { ...counts, [prayer]: Math.max(0, counts[prayer] + delta) };
    setCounts(next);
    await save(next, dailyRate, initialTotal, streak, lastLogDate);
  };

  const commitPrayerEdit = async (prayer: Prayer) => {
    const val = Math.max(0, parseInt(editValue) || 0);
    const next = { ...counts, [prayer]: val };
    setCounts(next);
    setEditingPrayer(null);
    await save(next, dailyRate, initialTotal, streak, lastLogDate);
  };

  const updateRate = async (delta: number) => {
    const next = Math.max(1, dailyRate + delta);
    setDailyRate(next);
    await save(counts, next, initialTotal, streak, lastLogDate);
  };

  const commitInitialEdit = async () => {
    const val = Math.max(0, parseInt(editInitialValue) || 0);
    setInitialTotal(val);
    setEditingInitial(false);
    await save(counts, dailyRate, val, streak, lastLogDate);
  };

  const openLogForm = async () => {
    if (total === 0) {
      // Nothing to subtract — log directly
      if (saving) return;
      setSaving(true);
      const today = todayStr();
      const newStreak = lastLogDate === yesterdayStr() ? streak + 1 : 1;
      setStreak(newStreak);
      setLastLogDate(today);
      await save(counts, dailyRate, initialTotal, newStreak, today);
      setSaving(false);
      return;
    }
    setLogInputs(DEFAULT);
    setShowLogForm(true);
  };

  const confirmLog = async () => {
    if (saving) return;
    setSaving(true);
    const nextCounts = { ...counts };
    let totalSubtracted = 0;
    for (const prayer of PRAYERS) {
      const sub = Math.min(logInputs[prayer], counts[prayer]);
      nextCounts[prayer] = counts[prayer] - sub;
      totalSubtracted += sub;
    }
    const today = todayStr();
    const shouldIncrementStreak = totalSubtracted > 0 || total === 0;
    const newStreak = shouldIncrementStreak
      ? (lastLogDate === yesterdayStr() ? streak + 1 : 1)
      : streak;
    const nextLastLog = shouldIncrementStreak ? today : lastLogDate;
    setPreLogCounts(counts);
    setCounts(nextCounts);
    setStreak(newStreak);
    setLastLogDate(nextLastLog);
    setShowLogForm(false);
    await save(nextCounts, dailyRate, initialTotal, newStreak, nextLastLog);
    if (totalSubtracted > 0) toast.success(`${totalSubtracted} qada dikurangkan`);
    setSaving(false);
  };

  const undoToday = async () => {
    const newStreak = Math.max(0, streak - 1);
    const restored = preLogCounts ?? counts;
    setCounts(restored);
    setStreak(newStreak);
    setLastLogDate('');
    setPreLogCounts(null);
    await save(restored, dailyRate, initialTotal, newStreak, '');
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
  const completed = initialTotal > 0 ? Math.max(0, initialTotal - total) : 0;
  const progressPct = initialTotal > 0 ? Math.min(100, (completed / initialTotal) * 100) : 0;
  const totalExceedsInitial = initialTotal > 0 && total > initialTotal;
  const doneToday = lastLogDate === todayStr();

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-md lg:max-w-lg mx-auto px-4 lg:px-8 py-10">

          {/* Header */}
          <div className="mb-10">
            <p className="text-xs text-muted-foreground/50 uppercase tracking-widest mb-1">Rekod</p>
            <h1 className="text-2xl font-semibold">Qada Solat</h1>
            <p className="text-sm text-muted-foreground/60 mt-1">Jejak solat yang perlu diganti.</p>
          </div>

          {loading ? (
            <div>
              {/* User row */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-7 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              {/* Prayer rows */}
              <div className="divide-y divide-border/50">
                {PRAYERS.map(p => (
                  <div key={p} className="flex items-center justify-between py-4">
                    <Skeleton className="h-4 w-14" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="size-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Total row */}
              <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-9 w-10" />
              </div>
              {/* Daily log button */}
              <div className="mt-8 pt-6 border-t border-border/40">
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
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
                      {editingPrayer === prayer ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitPrayerEdit(prayer)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitPrayerEdit(prayer);
                            if (e.key === 'Escape') setEditingPrayer(null);
                          }}
                          className="w-12 text-base font-bold tabular-nums text-center bg-transparent border-b border-border focus:outline-none"
                          autoFocus
                          min={0}
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingPrayer(prayer); setEditValue(String(counts[prayer])); }}
                          className="text-base font-bold tabular-nums w-8 text-center hover:text-primary transition"
                        >
                          {counts[prayer]}
                        </button>
                      )}
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

              {/* Progress bar */}
              {initialTotal > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    {editingInitial ? (
                      <div className="flex items-center gap-3 flex-1">
                        <p className="text-xs text-muted-foreground/50">Jumlah qada asal:</p>
                        <input
                          type="number"
                          value={editInitialValue}
                          onChange={e => setEditInitialValue(e.target.value)}
                          onBlur={commitInitialEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitInitialEdit();
                            if (e.key === 'Escape') setEditingInitial(false);
                          }}
                          className="w-20 text-sm font-bold tabular-nums text-center bg-transparent border-b border-border focus:outline-none"
                          autoFocus
                          min={0}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground/40">
                          {completed} selesai daripada {initialTotal}
                        </p>
                        <button
                          onClick={() => { setEditingInitial(true); setEditInitialValue(String(initialTotal)); }}
                          className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                  {totalExceedsInitial ? (
                    <p className="text-xs text-muted-foreground/30">
                      Jumlah semasa melebihi asal.{' '}
                      <button
                        onClick={() => { setEditingInitial(true); setEditInitialValue(String(total)); }}
                        className="underline hover:text-muted-foreground transition"
                      >
                        Kemaskini jumlah asal
                      </button>
                    </p>
                  ) : (
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Set initial total prompt */}
              {initialTotal === 0 && total > 0 && !editingInitial && (
                <div className="mt-3">
                  <button
                    onClick={() => { setEditingInitial(true); setEditInitialValue(String(total)); }}
                    className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition"
                  >
                    + Tetapkan jumlah asal untuk jejak kemajuan
                  </button>
                </div>
              )}
              {initialTotal === 0 && editingInitial && (
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-xs text-muted-foreground/50 flex-1">Jumlah qada asal:</p>
                  <input
                    type="number"
                    value={editInitialValue}
                    onChange={e => setEditInitialValue(e.target.value)}
                    onBlur={commitInitialEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitInitialEdit();
                      if (e.key === 'Escape') setEditingInitial(false);
                    }}
                    className="w-20 text-sm font-bold tabular-nums text-center bg-transparent border-b border-border focus:outline-none"
                    autoFocus
                    min={0}
                  />
                </div>
              )}

              {/* Daily log */}
              <div className="mt-8 pt-6 border-t border-border/40">
                {!doneToday && !showLogForm && (
                  <button
                    onClick={openLogForm}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition"
                  >
                    Selesai hari ini
                  </button>
                )}

                {/* Per-prayer log form */}
                {showLogForm && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground/50 uppercase tracking-widest">Berapa qada hari ini?</p>
                    <div className="divide-y divide-border/50">
                      {PRAYERS.filter(prayer => counts[prayer] > 0).map(prayer => (
                        <div key={prayer} className="flex items-center justify-between py-3">
                          <span className="text-sm font-medium capitalize">{prayer}</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.max(0, p[prayer] - 1) }))}
                              disabled={logInputs[prayer] === 0}
                              className="size-8 rounded-full border border-border/50 flex items-center justify-center text-lg text-muted-foreground hover:text-foreground hover:border-border transition disabled:opacity-25"
                            >−</button>
                            <span className="text-base font-bold tabular-nums w-8 text-center">{logInputs[prayer]}</span>
                            <button
                              onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.min(counts[prayer], p[prayer] + 1) }))}
                              disabled={logInputs[prayer] >= counts[prayer]}
                              className="size-8 rounded-full border border-border/50 flex items-center justify-center text-lg text-muted-foreground hover:text-foreground hover:border-border transition disabled:opacity-25"
                            >+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={confirmLog}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition disabled:opacity-40"
                      >
                        Sahkan
                      </button>
                      <button
                        onClick={() => setShowLogForm(false)}
                        className="px-5 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-border/50 transition"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {doneToday && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 py-3 rounded-xl text-sm font-medium bg-muted/50 text-muted-foreground/40 text-center">
                      Selesai hari ini
                    </div>
                    {preLogCounts !== null && (
                      <button
                        onClick={undoToday}
                        className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition shrink-0"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                )}

                {streak > 0 && (
                  <p className="text-xs text-muted-foreground/40 text-center mt-3">
                    {streak === 1 ? 'Bermula hari ini' : `${streak} hari berturut-turut`}
                  </p>
                )}
              </div>

              {total === 0 && initialTotal > 0 ? (
                <p className="text-xs text-muted-foreground/40 text-center mt-8">
                  Tiada qada tertunggak. Alhamdulillah.
                </p>
              ) : total === 0 && initialTotal === 0 ? (
                <p className="text-xs text-muted-foreground/25 text-center mt-6">
                  Tambah bilangan qada anda di atas untuk mula menjejak.
                </p>
              ) : total > 0 ? (
                <div className="mt-8 pt-6 border-t border-border/40 space-y-5">

                  {/* Daily rate */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Kadar Harian</p>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">Untuk anggaran selesai</p>
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
                        {estimation.label}
                      </p>
                      <p className="text-sm text-muted-foreground/60 mt-1">{estimation.date}</p>
                    </div>
                  )}

                </div>
              ) : null}
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
