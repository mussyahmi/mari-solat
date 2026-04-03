'use client';

import { useEffect, useState, useRef } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, getDocs,
  addDoc, onSnapshot, serverTimestamp, Timestamp,
  updateDoc, arrayUnion, arrayRemove, deleteDoc,
  query, where, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import Sidebar from '@/components/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

const PRAYERS = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const;
type Prayer = typeof PRAYERS[number];
type QadaCounts = Record<Prayer, number>;
type Tab = 'rekod' | 'cabaran' | 'chat';
type LbView = 'streak' | 'qada' | 'hari';

const DEFAULT: QadaCounts = { subuh: 0, zohor: 0, asar: 0, maghrib: 0, isyak: 0 };

type Participant = {
  uid: string;
  alias: string;
  streak: number;
  longestStreak: number;
  activeDays: number;
  totalQada: number;
  lastLogDate: string;
  qadaDone: boolean;
  mutedUntil?: Timestamp;
  muteCount?: number;
};

type RankedParticipant = Participant & { rank: number };

type ChatMessage = {
  id: string;
  uid: string;
  alias: string;
  text: string;
  createdAt: Timestamp | null;
  editedAt?: Timestamp | null;
  hidden: boolean;
  reports: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_THRESHOLD = 5;
const DAILY_REPORT_LIMIT = 3;
const MUTE_DURATIONS_MIN = [60, 180, 360, 720, 1440];
const EDIT_DELETE_LIMIT_MS = 5 * 60 * 1000;
const CHALLENGE_START = { year: 2026, month: 4 };

const MALAY_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
const MALAY_MONTHS_FULL = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

const ALIAS_ADJ = [
  'Berani', 'Bijak', 'Cekal', 'Gigih', 'Ikhlas', 'Mulia', 'Sabar', 'Setia',
  'Tabah', 'Warak', 'Rajin', 'Tekun', 'Amanah', 'Soleh', 'Tawadu', 'Jujur',
  'Redha', 'Syukur', 'Khusyuk', 'Tawakkal', 'Lembut', 'Dermawan', 'Adil',
  'Teguh', 'Tulus', 'Kasih', 'Istiqamah', 'Sayang', 'Murni', 'Suci',
];
const ALIAS_NOUN = [
  'Harimau', 'Helang', 'Kancil', 'Singa', 'Badak', 'Gajah', 'Rusa', 'Merpati',
  'Lebah', 'Unta', 'Monyet', 'Zirafah', 'Penyu', 'Kucing', 'Merak',
  'Musang', 'Kumbang', 'Kuda', 'Jerung', 'Sotong', 'Kambing', 'Ketam',
  'Beruang', 'Arnab', 'Tupai', 'Kijang', 'Kerbau', 'Itik', 'Landak', 'Haruan',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateAlias() {
  const adj = ALIAS_ADJ[Math.floor(Math.random() * ALIAS_ADJ.length)];
  const noun = ALIAS_NOUN[Math.floor(Math.random() * ALIAS_NOUN.length)];
  return `${noun}${adj}`;
}

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayStr() { return localDateStr(new Date()); }

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 999;
  const dateA = new Date(a + 'T00:00:00');
  const dateB = new Date(b + 'T00:00:00');
  return Math.round((dateB.getTime() - dateA.getTime()) / 86400000);
}

function formatMalayDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? 'AM' : 'PM';
  return `${d.getDate()} ${MALAY_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${m} ${period}`;
}

function formatMalayDate(date: Date) {
  return `${date.getDate()} ${MALAY_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function estimateCompletion(total: number, rate: number): { label: string; date: string } | null {
  if (total <= 0 || rate <= 0) return null;
  const days = Math.ceil(total / rate);
  const date = new Date();
  date.setDate(date.getDate() + days);
  let label: string;
  if (days === 1) label = 'Esok';
  else if (days < 30) label = `${days} hari lagi`;
  else if (days < 365) {
    const mo = Math.floor(days / 30), rem = days % 30;
    label = rem > 0 ? `${mo} bulan ${rem} hari lagi` : `${mo} bulan lagi`;
  } else {
    const yr = Math.floor(days / 365), mo = Math.floor((days % 365) / 30), rem = days % 365 % 30;
    if (mo > 0 && rem > 0) label = `${yr} tahun ${mo} bulan ${rem} hari lagi`;
    else if (mo > 0) label = `${yr} tahun ${mo} bulan lagi`;
    else if (rem > 0) label = `${yr} tahun ${rem} hari lagi`;
    else label = `${yr} tahun lagi`;
  }
  return { label, date: formatMalayDate(date) };
}


function isMonthComplete(mk: string): boolean {
  const [year, month] = mk.split('-').map(Number);
  const firstOfNext = new Date(year, month, 1);
  firstOfNext.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= firstOfNext;
}

function lastDayOfMonth(mk: string): string {
  const [year, month] = mk.split('-').map(Number);
  const d = new Date(year, month, 0);
  return `${d.getDate()} ${MALAY_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function getLbValue(p: Participant, view: LbView) {
  if (view === 'streak') return p.longestStreak;
  if (view === 'qada') return p.totalQada;
  return p.activeDays;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QadaSolatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [alias, setAlias] = useState('');
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [previewAlias, setPreviewAlias] = useState('');
  const [aliasChecking, setAliasChecking] = useState(false);

  // Rekod state
  const [counts, setCounts] = useState<QadaCounts>(DEFAULT);
  const [dailyRate, setDailyRate] = useState(1);
  const [initialTotal, setInitialTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastLogDate, setLastLogDate] = useState('');
  const [preLogCounts, setPreLogCounts] = useState<QadaCounts | null>(null);
  const [preChallenge, setPreChallenge] = useState<Participant | null | undefined>(undefined);
  const [todayLog, setTodayLog] = useState<QadaCounts>(DEFAULT);
  const [lastUpdatedPrayer, setLastUpdatedPrayer] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<Prayer | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingInitial, setEditingInitial] = useState(false);
  const [editInitialValue, setEditInitialValue] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [logInputs, setLogInputs] = useState<QadaCounts>(DEFAULT);

  // Tab
  const [tab, setTab] = useState<Tab>('rekod');

  // Cabaran state
  const [myChallenge, setMyChallenge] = useState<Participant | null>(null);
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);
  const [lbView, setLbView] = useState<LbView>('streak');
  const [lbMonth, setLbMonth] = useState(() => {
    const mk = monthKey();
    const [y, m] = mk.split('-').map(Number);
    if (y < CHALLENGE_START.year || (y === CHALLENGE_START.year && m < CHALLENGE_START.month)) {
      return `${CHALLENGE_START.year}-${String(CHALLENGE_START.month).padStart(2, '0')}`;
    }
    return mk;
  });
  const [loadingLb, setLoadingLb] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [reportCountToday, setReportCountToday] = useState(0);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgInput, setEditMsgInput] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'report'; msg: ChatMessage } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadChat, setUnreadChat] = useState(false);
  const tabRef = useRef<Tab>('rekod');
  const chatLoadedRef = useRef(false);

  // ─── Auth + initial data load ──────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Load or generate alias
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          let loadedAlias = '';
          if (userDoc.exists() && userDoc.data().alias) {
            loadedAlias = userDoc.data().alias;
          } else {
            // Find a free alias and claim it
            for (let i = 0; i < 20; i++) {
              const candidate = generateAlias();
              const taken = await getDoc(doc(db, 'aliases', candidate));
              if (!taken.exists()) { loadedAlias = candidate; break; }
            }
            if (!loadedAlias) loadedAlias = generateAlias(); // fallback
            await setDoc(userDocRef, { alias: loadedAlias }, { merge: true });
            await setDoc(doc(db, 'aliases', loadedAlias), { uid: u.uid });
          }
          setAlias(loadedAlias);

          // Load qada counts
          const snap = await getDoc(doc(db, 'users', u.uid, 'qada', 'counts'));
          if (snap.exists()) {
            const data = snap.data();
            setCounts({ ...DEFAULT, ...(data as QadaCounts) });
            if (typeof data.dailyRate === 'number') setDailyRate(data.dailyRate);
            if (typeof data.initialTotal === 'number') setInitialTotal(data.initialTotal);
            if (typeof data.lastUpdatedPrayer === 'string') setLastUpdatedPrayer(data.lastUpdatedPrayer);
            if (typeof data.lastUpdatedAt === 'string') setLastUpdatedAt(data.lastUpdatedAt);
            const storedLastLog = typeof data.lastLogDate === 'string' ? data.lastLogDate : '';
            const storedStreak = typeof data.streak === 'number' ? data.streak : 0;
            const today = todayStr();
            const diff = daysBetween(storedLastLog, today);
            const sameMonth = storedLastLog.startsWith(monthKey());
            const streakAlive = sameMonth && diff <= 2;
            const effectiveStreak = streakAlive ? storedStreak : 0;
            setStreak(effectiveStreak);
            setLastLogDate(storedLastLog);
            if (storedLastLog === todayStr() && data.todayLog && typeof data.todayLog === 'object') {
              setTodayLog({ ...DEFAULT, ...(data.todayLog as QadaCounts) });
              if (data.preLogCounts && typeof data.preLogCounts === 'object') {
                setPreLogCounts({ ...DEFAULT, ...(data.preLogCounts as QadaCounts) });
              }
            }
            if (!streakAlive && storedStreak > 0) {
              await setDoc(doc(db, 'users', u.uid, 'qada', 'counts'), {
                ...{ ...DEFAULT, ...(data as QadaCounts) },
                dailyRate: data.dailyRate ?? 1,
                initialTotal: data.initialTotal ?? 0,
                streak: 0,
                lastLogDate: storedLastLog,
                lastUpdatedPrayer: data.lastUpdatedPrayer ?? null,
                lastUpdatedAt: data.lastUpdatedAt ?? '',
              });
            }
          }

          // Load challenge participant data
          const mk = monthKey();
          const partSnap = await getDoc(doc(db, 'challenge', mk, 'participants', u.uid));
          if (partSnap.exists()) {
            setMyChallenge({ uid: u.uid, ...partSnap.data() } as Participant);
          }

          // Load daily report count
          const today = todayStr();
          const reportSnap = await getDoc(doc(db, 'users', u.uid, 'moderation', 'daily'));
          if (reportSnap.exists() && reportSnap.data().date === today) {
            setReportCountToday(reportSnap.data().count ?? 0);
          }
        } catch (err) {
          toast.error('Gagal memuatkan data.');
          console.error(err);
        }
      } else {
        setCounts(DEFAULT);
        setDailyRate(1);
        setInitialTotal(0);
        setStreak(0);
        setLastLogDate('');
        setLastUpdatedPrayer(null);
        setLastUpdatedAt('');
        setAlias('');
        setMyChallenge(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ─── Chat real-time listener ───────────────────────────────────────────────

  useEffect(() => { tabRef.current = tab; }, [tab]);

  useEffect(() => {
    if (!user) return;
    chatLoadedRef.current = false;
    const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const unsub = onSnapshot(collection(db, 'chat'), (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
        .filter(m => !m.createdAt || m.createdAt.toMillis() > thirtyDaysAgo.toMillis())
        .sort((a, b) => (a.createdAt?.toMillis() ?? Infinity) - (b.createdAt?.toMillis() ?? Infinity))
        .slice(-50);
      setMessages(msgs);
      if (!chatLoadedRef.current) {
        chatLoadedRef.current = true;
      } else if (tabRef.current !== 'chat') {
        setUnreadChat(true);
      }
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return unsub;
  }, [user]);

  // ─── Leaderboard load ─────────────────────────────────────────────────────

  useEffect(() => {
    if (tab === 'chat' || !user) return; // load for rekod+cabaran (desktop shows cabaran panel in both)
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lbMonth, user]);

  const loadLeaderboard = async () => {
    setLoadingLb(true);
    try {
      const snap = await getDocs(collection(db, 'challenge', lbMonth, 'participants'));
      const data = snap.docs
        .map(d => ({ uid: d.id, ...d.data() } as Participant))
        .filter(p => p.activeDays > 0);
      setLeaderboard(data);
    } catch {
      toast.error('Gagal memuatkan papan pendahuluan.');
    } finally {
      setLoadingLb(false);
    }
  };

  // ─── Save helpers ─────────────────────────────────────────────────────────

  const saveQada = async (
    nextCounts: QadaCounts, nextRate: number, nextInitial: number,
    nextStreak: number, nextLastLog: string,
    updatedPrayer?: string, updatedAt?: string,
    nextTodayLog?: QadaCounts,
    nextPreLogCounts?: QadaCounts | null,
  ) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'qada', 'counts'), {
        ...nextCounts,
        dailyRate: nextRate,
        initialTotal: nextInitial,
        streak: nextStreak,
        lastLogDate: nextLastLog,
        lastUpdatedPrayer: updatedPrayer ?? lastUpdatedPrayer,
        lastUpdatedAt: updatedAt ?? lastUpdatedAt,
        todayLog: nextTodayLog ?? todayLog,
        preLogCounts: nextPreLogCounts !== undefined ? nextPreLogCounts : preLogCounts,
      });
    } catch {
      toast.error('Gagal menyimpan.');
    }
  };

  const updateChallengeOnLog = async (totalQadaLogged: number, nextCounts: QadaCounts, nextInitial: number) => {
    if (!user || !alias) return;
    const mk = monthKey();
    const today = todayStr();
    const partRef = doc(db, 'challenge', mk, 'participants', user.uid);

    try {
      const snap = await getDoc(partRef);
      const existing = snap.exists() ? (snap.data() as Participant) : null;

      const lastLog = existing?.lastLogDate ?? '';
      const isNewMonth = !!lastLog && !lastLog.startsWith(mk);
      const sameDay = lastLog === today;

      let newStreak = isNewMonth ? 0 : (existing?.streak ?? 0);
      let newActiveDays = isNewMonth ? 0 : (existing?.activeDays ?? 0);
      let newTotalQada = isNewMonth ? 0 : (existing?.totalQada ?? 0);
      let newLongestStreak = isNewMonth ? 0 : (existing?.longestStreak ?? 0);

      if (!sameDay) {
        const diff = lastLog && !isNewMonth ? daysBetween(lastLog, today) : 999;
        newStreak = diff <= 2 ? newStreak + 1 : 1;
        newActiveDays += 1;
        newLongestStreak = Math.max(newLongestStreak, newStreak);
      }

      newTotalQada += totalQadaLogged;

      const totalRemaining = PRAYERS.reduce((sum, p) => sum + nextCounts[p], 0);
      const qadaDone = nextInitial > 0 && totalRemaining === 0;

      const updated: Participant = {
        uid: user.uid,
        alias,
        streak: newStreak,
        longestStreak: newLongestStreak,
        activeDays: newActiveDays,
        totalQada: newTotalQada,
        lastLogDate: today,
        qadaDone,
        muteCount: existing?.muteCount ?? 0,
        ...(existing?.mutedUntil ? { mutedUntil: existing.mutedUntil } : {}),
      };

      await setDoc(partRef, updated);
      setMyChallenge(updated);
    } catch (err) {
      console.error('Challenge update error:', err);
    }
  };

  // ─── Rekod actions ────────────────────────────────────────────────────────

  const updateCount = async (prayer: Prayer, delta: number) => {
    const next = { ...counts, [prayer]: Math.max(0, counts[prayer] + delta) };
    const now = new Date().toISOString();
    setCounts(next);
    setLastUpdatedPrayer(prayer);
    setLastUpdatedAt(now);
    await saveQada(next, dailyRate, initialTotal, streak, lastLogDate, prayer, now);
  };

  const commitPrayerEdit = async (prayer: Prayer) => {
    const val = Math.max(0, parseInt(editValue) || 0);
    const next = { ...counts, [prayer]: val };
    const now = new Date().toISOString();
    setCounts(next);
    setEditingPrayer(null);
    setLastUpdatedPrayer(prayer);
    setLastUpdatedAt(now);
    await saveQada(next, dailyRate, initialTotal, streak, lastLogDate, prayer, now);
  };

  const updateRate = async (delta: number) => {
    const next = Math.max(1, dailyRate + delta);
    setDailyRate(next);
    await saveQada(counts, next, initialTotal, streak, lastLogDate);
  };

  const commitInitialEdit = async () => {
    const val = Math.max(0, parseInt(editInitialValue) || 0);
    setInitialTotal(val);
    setEditingInitial(false);
    await saveQada(counts, dailyRate, val, streak, lastLogDate);
  };

  const today = todayStr();
  const total = PRAYERS.reduce((sum, p) => sum + counts[p], 0);
  const doneToday = lastLogDate === today;

  const openLogForm = async () => {
    if (total === 0) {
      if (saving) return;
      setSaving(true);
      const diff = lastLogDate ? daysBetween(lastLogDate, today) : 999;
      const sameMonth = lastLogDate.startsWith(monthKey());
      const newStreak = sameMonth && diff <= 2 ? streak + 1 : 1;
      setPreLogCounts(counts);
      setPreChallenge(myChallenge);
      setTodayLog(DEFAULT);
      setStreak(newStreak);
      setLastLogDate(today);
      await saveQada(counts, dailyRate, initialTotal, newStreak, today, undefined, undefined, DEFAULT, counts);
      await updateChallengeOnLog(0, counts, initialTotal);
      setSaving(false);
      return;
    }
    setLogInputs(DEFAULT);
    setShowLogForm(true);
  };

  const confirmLog = async () => {
    if (saving) return;
    setSaving(true);
    const alreadyLoggedToday = lastLogDate === today;
    // For re-edits, restore counts to pre-log state first
    const startCounts = alreadyLoggedToday
      ? PRAYERS.reduce((acc, p) => ({ ...acc, [p]: counts[p] + todayLog[p] }), {} as QadaCounts)
      : counts;
    const nextCounts = { ...startCounts };
    let totalSubtracted = 0;
    for (const prayer of PRAYERS) {
      const sub = Math.min(logInputs[prayer], startCounts[prayer]);
      nextCounts[prayer] = startCounts[prayer] - sub;
      totalSubtracted += sub;
    }
    const newTodayLog = { ...logInputs } as QadaCounts;
    const prevTodayTotal = PRAYERS.reduce((s, p) => s + todayLog[p], 0);
    const challengeDelta = alreadyLoggedToday ? totalSubtracted - prevTodayTotal : totalSubtracted;
    const shouldLog = !alreadyLoggedToday && (totalSubtracted > 0 || total === 0);
    const diff = lastLogDate ? daysBetween(lastLogDate, today) : 999;
    const sameMonth = lastLogDate.startsWith(monthKey());
    const newStreak = shouldLog
      ? (sameMonth && diff <= 2 ? streak + 1 : 1)
      : streak;
    const nextLastLog = shouldLog ? today : lastLogDate;
    if (!alreadyLoggedToday) {
      setPreLogCounts(counts);
      setPreChallenge(myChallenge);
    }
    const now = new Date().toISOString();
    const loggedPrayers = PRAYERS.filter(p => logInputs[p] > 0);
    const loggedPrayer = loggedPrayers.length > 0 ? loggedPrayers.join(', ') : null;
    setTodayLog(newTodayLog);
    setCounts(nextCounts);
    setStreak(newStreak);
    setLastLogDate(nextLastLog);
    setShowLogForm(false);
    if (loggedPrayer) {
      setLastUpdatedPrayer(loggedPrayer);
      setLastUpdatedAt(now);
    }
    await saveQada(nextCounts, dailyRate, initialTotal, newStreak, nextLastLog, loggedPrayer ?? undefined, loggedPrayer ? now : undefined, newTodayLog, !alreadyLoggedToday ? counts : undefined);
    if (shouldLog || alreadyLoggedToday) {
      await updateChallengeOnLog(challengeDelta, nextCounts, initialTotal);
      if (totalSubtracted > 0) toast.success(`${totalSubtracted} qada dikurangkan`);
    }
    setSaving(false);
  };

  const undoToday = async () => {
    if (!user) return;
    const newStreak = Math.max(0, streak - 1);
    const restored = preLogCounts ?? counts;
    setCounts(restored);
    setStreak(newStreak);
    setLastLogDate('');
    setPreLogCounts(null);
    await saveQada(restored, dailyRate, initialTotal, newStreak, '', undefined, undefined, undefined, null);
    // Revert challenge participant
    if (preChallenge !== undefined) {
      const mk = monthKey();
      const partRef = doc(db, 'challenge', mk, 'participants', user.uid);
      if (preChallenge === null) {
        await deleteDoc(partRef);
      } else {
        await setDoc(partRef, preChallenge);
      }
      setMyChallenge(preChallenge);
      setPreChallenge(undefined);
    }
  };

  // ─── Alias actions ────────────────────────────────────────────────────────

  const generateFreeAlias = async () => {
    if (!user) return;
    setAliasChecking(true);
    try {
      for (let i = 0; i < 15; i++) {
        const candidate = generateAlias();
        const snap = await getDoc(doc(db, 'aliases', candidate));
        if (!snap.exists()) {
          setPreviewAlias(candidate);
          return;
        }
      }
      // All tries taken — show last candidate anyway
      setPreviewAlias(generateAlias());
    } finally {
      setAliasChecking(false);
    }
  };

  const saveAlias = async (trimmed: string) => {
    if (!trimmed || !user) return;
    try {
      setAliasChecking(true);
      // Check if taken by someone else
      const aliasSnap = await getDoc(doc(db, 'aliases', trimmed));
      if (aliasSnap.exists() && aliasSnap.data().uid !== user.uid) {
        toast.error('Nama samaran ini sudah digunakan. Jana semula.');
        return;
      }

      const mk = monthKey();
      const batch = writeBatch(db);

      // Release old alias, claim new one
      if (alias && alias !== trimmed) {
        const oldAliasSnap = await getDoc(doc(db, 'aliases', alias));
        if (oldAliasSnap.exists()) {
          batch.delete(doc(db, 'aliases', alias));
        }
      }
      batch.set(doc(db, 'aliases', trimmed), { uid: user.uid });
      batch.set(doc(db, 'users', user.uid), { alias: trimmed }, { merge: true });

      const partSnap = await getDoc(doc(db, 'challenge', mk, 'participants', user.uid));
      if (partSnap.exists()) {
        batch.update(doc(db, 'challenge', mk, 'participants', user.uid), { alias: trimmed });
      }

      const chatSnap = await getDocs(query(collection(db, 'chat'), where('uid', '==', user.uid)));
      chatSnap.forEach(d => batch.update(d.ref, { alias: trimmed }));

      await batch.commit();
      setAlias(trimmed);
      setShowAliasDialog(false);
      toast.success('Nama samaran dikemaskini.');
    } catch (e) {
      console.error('saveAlias error:', e);
      toast.error('Gagal mengemaskini nama samaran.');
    } finally {
      setAliasChecking(false);
    }
  };

  // ─── Chat actions ─────────────────────────────────────────────────────────

  const sendChat = async () => {
    if (!user || !chatInput.trim() || sendingChat) return;
    const mk = monthKey();

    try {
      const partSnap = await getDoc(doc(db, 'challenge', mk, 'participants', user.uid));
      if (partSnap.exists()) {
        const mute = partSnap.data().mutedUntil as Timestamp | undefined;
        if (mute && mute.toMillis() > Date.now()) {
          const remaining = Math.ceil((mute.toMillis() - Date.now()) / 60000);
          toast.error(`Anda dimute selama ${remaining} minit lagi.`);
          return;
        }
      }
    } catch {}

    setSendingChat(true);
    try {
      await addDoc(collection(db, 'chat'), {
        uid: user.uid,
        alias,
        text: chatInput.trim(),
        createdAt: serverTimestamp(),
        hidden: false,
        reports: [],
      });
      setChatInput('');
    } catch {
      toast.error('Gagal menghantar mesej.');
    } finally {
      setSendingChat(false);
    }
  };

  const reportMessage = async (msg: ChatMessage) => {
    if (!user) return;
    if (msg.uid === user.uid) { toast.error('Tidak boleh lapor mesej sendiri.'); return; }

    const alreadyReported = msg.reports.includes(user.uid);

    if (alreadyReported) {
      try {
        await updateDoc(doc(db, 'chat', msg.id), {
          reports: arrayRemove(user.uid),
        });
        const newCount = Math.max(0, reportCountToday - 1);
        await setDoc(doc(db, 'users', user.uid, 'moderation', 'daily'), { date: today, count: newCount });
        setReportCountToday(newCount);
        toast.success('Laporan dibatalkan.');
      } catch {
        toast.error('Gagal membatalkan laporan.');
      }
      return;
    }

    if (reportCountToday >= DAILY_REPORT_LIMIT) {
      toast.error(`Had laporan harian (${DAILY_REPORT_LIMIT}) telah dicapai.`);
      return;
    }

    try {
      const newReports = [...msg.reports, user.uid];
      const shouldHide = newReports.length >= REPORT_THRESHOLD;

      await updateDoc(doc(db, 'chat', msg.id), {
        reports: arrayUnion(user.uid),
        ...(shouldHide ? { hidden: true } : {}),
      });

      if (shouldHide) {
        const mk = monthKey();
        const senderRef = doc(db, 'challenge', mk, 'participants', msg.uid);
        const senderSnap = await getDoc(senderRef);
        if (senderSnap.exists()) {
          const mc = (senderSnap.data().muteCount ?? 0) + 1;
          const durMin = MUTE_DURATIONS_MIN[Math.min(mc - 1, MUTE_DURATIONS_MIN.length - 1)];
          const mutedUntil = Timestamp.fromMillis(Date.now() + durMin * 60000);
          await updateDoc(senderRef, { mutedUntil, muteCount: mc });
        }
      }

      const newCount = reportCountToday + 1;
      await setDoc(doc(db, 'users', user.uid, 'moderation', 'daily'), { date: today, count: newCount });
      setReportCountToday(newCount);
      toast.success('Laporan dihantar.');
    } catch {
      toast.error('Gagal menghantar laporan.');
    }
  };

  // ─── Edit / Delete own message ────────────────────────────────────────────

  const editMessage = async (msg: ChatMessage) => {
    const trimmed = editMsgInput.trim();
    if (!trimmed || trimmed === msg.text) { setEditingMsgId(null); return; }
    try {
      await updateDoc(doc(db, 'chat', msg.id), {
        text: trimmed,
        editedAt: serverTimestamp(),
      });
      setEditingMsgId(null);
    } catch {
      toast.error('Gagal mengemaskini mesej.');
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'chat', msgId));
    } catch {
      toast.error('Gagal memadam mesej.');
    }
  };

  // ─── Derived values ───────────────────────────────────────────────────────

  const estimation = estimateCompletion(total, dailyRate);
  const completed = initialTotal > 0 ? Math.max(0, initialTotal - total) : 0;
  const progressPct = initialTotal > 0 ? Math.min(100, (completed / initialTotal) * 100) : 0;
  const totalExceedsInitial = initialTotal > 0 && total > initialTotal;

  const sortedLb = [...leaderboard].sort((a, b) => getLbValue(b, lbView) - getLbValue(a, lbView));
  let currentRank = 1;
  const rankedLb: RankedParticipant[] = sortedLb.map((p, i) => {
    if (i > 0 && getLbValue(sortedLb[i - 1], lbView) !== getLbValue(p, lbView)) {
      currentRank = i + 1;
    }
    return { ...p, rank: currentRank };
  });

  const monthOptions = (() => {
    const opts = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 0; i < 24; i++) {
      const mk = monthKey(d);
      const [y, m] = mk.split('-').map(Number);
      if (y < CHALLENGE_START.year || (y === CHALLENGE_START.year && m < CHALLENGE_START.month)) break;
      opts.push({ key: mk, label: `${MALAY_MONTHS_FULL[m - 1]} ${y}` });
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  })();

  const login = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch { toast.error('Log masuk gagal.'); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const rightTab: 'cabaran' | 'chat' = tab === 'chat' ? 'chat' : 'cabaran';

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ════ Content panels ════════════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ── LEFT PANEL: Rekod ────────────────────────────────────────── */}
          <div className={`lg:w-[380px] lg:shrink-0 lg:flex-none lg:border-r lg:border-border/30 flex flex-col overflow-hidden ${tab !== 'rekod' ? 'hidden lg:flex' : 'flex flex-1'}`}>
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 lg:px-8 py-10 lg:py-14">

              <div className="mb-8">
                <h1 className="text-2xl font-semibold">Qada Solat</h1>
                <p className="text-sm text-foreground/60 mt-1">Jejak solat yang perlu diganti dan sertai cabaran bulanan.</p>
              </div>

              {loading ? (
                <div>
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/40">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-7 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="divide-y divide-border/50">
                    {PRAYERS.map(p => (
                      <div key={p} className="flex items-center justify-between py-4">
                        <Skeleton className="h-4 w-14" />
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-9 rounded-full" />
                          <Skeleton className="h-5 w-8" />
                          <Skeleton className="size-9 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !user ? (
                <div className="flex flex-col items-center py-16 gap-5">
                  <p className="text-sm text-foreground/60 text-center">
                    Log masuk untuk menyimpan rekod qada dan sertai cabaran bulanan bersama komuniti.
                  </p>
                  <button
                    onClick={login}
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border/60 text-sm text-foreground/70 hover:text-foreground hover:border-border transition"
                  >
                    <GoogleIcon />
                    Log Masuk dengan Google
                  </button>
                </div>
              ) : (
                <>
                  {/* User row */}
                  <div className="flex items-center justify-between mb-6 pb-6 border-b border-border/40">
                    <div className="flex items-center gap-2.5">
                      {user.photoURL && (
                        <img src={user.photoURL} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
                      )}
                      <div>
                        <button
                          onClick={() => { setPreviewAlias(''); setShowAliasDialog(true); }}
                          className="text-sm font-medium hover:text-primary transition text-left block"
                        >
                          {alias}
                        </button>
                        <p className="text-xs text-muted-foreground/50">{user.displayName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => signOut(auth)}
                      className="text-xs text-foreground/40 hover:text-foreground transition"
                    >
                      Log keluar
                    </button>
                  </div>

                  {/* Prayer list */}
                  <div className="divide-y divide-border/50">
                    {PRAYERS.map(prayer => (
                      <div key={prayer} className="flex items-center justify-between py-5">
                        <span className="text-sm font-medium capitalize">{prayer}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateCount(prayer, -1)}
                            disabled={counts[prayer] === 0}
                            className="size-9 rounded-full border border-border/50 flex items-center justify-center text-lg text-foreground/50 hover:text-foreground hover:border-border transition disabled:opacity-25"
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
                              autoFocus min={0}
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingPrayer(prayer); setEditValue(String(counts[prayer])); }}
                              className="text-base font-bold tabular-nums min-w-8 text-center hover:text-primary transition"
                            >{counts[prayer]}</button>
                          )}
                          <button
                            onClick={() => updateCount(prayer, 1)}
                            className="size-9 rounded-full border border-border/50 flex items-center justify-center text-lg text-foreground/50 hover:text-foreground hover:border-border transition"
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">Jumlah</p>
                    <p className="text-3xl font-bold tabular-nums">{total}</p>
                  </div>

                  {/* Last updated */}
                  {lastUpdatedPrayer && lastUpdatedAt && (
                    <p className="text-xs text-foreground/35 mt-2 text-right">
                      Kemaskini terakhir: <span className="capitalize">{lastUpdatedPrayer}</span> · {formatMalayDateTime(lastUpdatedAt)}
                    </p>
                  )}

                  {/* Progress bar */}
                  {initialTotal > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        {editingInitial ? (
                          <div className="flex items-center gap-3 flex-1">
                            <p className="text-xs text-foreground/60">Jumlah qada asal:</p>
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
                              autoFocus min={0}
                            />
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-foreground/50">{completed} selesai daripada {initialTotal}</p>
                            <button
                              onClick={() => { setEditingInitial(true); setEditInitialValue(String(initialTotal)); }}
                              className="text-xs text-foreground/40 hover:text-foreground transition"
                            >Edit</button>
                          </>
                        )}
                      </div>
                      {totalExceedsInitial ? (
                        <p className="text-xs text-foreground/50">
                          Jumlah semasa melebihi asal.{' '}
                          <button
                            onClick={() => { setEditingInitial(true); setEditInitialValue(String(total)); }}
                            className="underline hover:text-foreground transition"
                          >Kemaskini jumlah asal</button>
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
                        className="text-xs text-foreground/40 hover:text-foreground transition"
                      >+ Tetapkan jumlah asal untuk jejak kemajuan</button>
                    </div>
                  )}
                  {initialTotal === 0 && editingInitial && (
                    <div className="mt-3 flex items-center gap-3">
                      <p className="text-xs text-foreground/60 flex-1">Jumlah qada asal:</p>
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
                        autoFocus min={0}
                      />
                    </div>
                  )}

                  {/* Daily log */}
                  <div className="mt-10 pt-8 border-t border-border/40">
                    {!doneToday && !showLogForm && (total > 0 || initialTotal > 0) && (
                      <button
                        onClick={openLogForm}
                        disabled={saving}
                        className="w-full py-3 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition disabled:opacity-40"
                      >Selesai hari ini</button>
                    )}

                    {showLogForm && (
                      <div className="space-y-4">
                        <p className="text-xs text-foreground/60 uppercase tracking-widest">Berapa qada hari ini?</p>
                        <div className="divide-y divide-border/50">
                          {(() => {
                            const formMax = doneToday
                              ? PRAYERS.reduce((acc, p) => ({ ...acc, [p]: counts[p] + todayLog[p] }), {} as QadaCounts)
                              : counts;
                            return PRAYERS.filter(p => formMax[p] > 0).map(prayer => (
                              <div key={prayer} className="flex items-center justify-between py-4">
                                <span className="text-sm font-medium capitalize">{prayer}</span>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.max(0, p[prayer] - 1) }))}
                                    disabled={logInputs[prayer] === 0}
                                    className="size-9 rounded-full border border-border/50 flex items-center justify-center text-lg text-foreground/50 hover:text-foreground hover:border-border transition disabled:opacity-25"
                                  >−</button>
                                  <span className="text-base font-bold tabular-nums min-w-8 text-center">{logInputs[prayer]}</span>
                                  <button
                                    onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.min(formMax[prayer], p[prayer] + 1) }))}
                                    disabled={logInputs[prayer] >= formMax[prayer]}
                                    className="size-9 rounded-full border border-border/50 flex items-center justify-center text-lg text-foreground/50 hover:text-foreground hover:border-border transition disabled:opacity-25"
                                  >+</button>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={confirmLog}
                            disabled={saving || PRAYERS.every(p => logInputs[p] === 0)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition disabled:opacity-40"
                          >Sahkan</button>
                          <button
                            onClick={() => { setShowLogForm(false); setLogInputs(todayLog); }}
                            className="px-5 py-2.5 rounded-xl text-sm text-foreground/60 hover:text-foreground border border-border/50 transition"
                          >Batal</button>
                        </div>
                      </div>
                    )}

                    {doneToday && !showLogForm && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 py-3 rounded-xl text-sm font-medium bg-muted/50 text-foreground/40 text-center">
                          Selesai hari ini
                        </div>
                        {total > 0 && (
                          <button
                            onClick={() => { setLogInputs(todayLog); setShowLogForm(true); }}
                            className="text-xs text-foreground/40 hover:text-foreground transition shrink-0"
                          >Edit</button>
                        )}
                        {preLogCounts !== null && (
                          <button
                            onClick={undoToday}
                            className="text-xs text-foreground/40 hover:text-foreground transition shrink-0"
                          >Batal</button>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Empty states & estimation */}
                  {total === 0 && initialTotal > 0 ? (
                    <p className="text-xs text-foreground/50 text-center mt-8">Tiada qada tertunggak. Alhamdulillah.</p>
                  ) : total === 0 && initialTotal === 0 ? (
                    <p className="text-xs text-foreground/40 text-center mt-6">Tambah bilangan qada anda di atas untuk mula menjejak.</p>
                  ) : total > 0 ? (
                    <div className="mt-10 pt-8 border-t border-border/40 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Kadar Harian</p>
                          <p className="text-xs text-foreground/50 mt-0.5">Untuk anggaran selesai</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateRate(-1)}
                            disabled={dailyRate <= 1}
                            className="size-9 rounded-full border border-border/50 flex items-center justify-center text-lg text-foreground/50 hover:text-foreground hover:border-border transition disabled:opacity-25"
                          >−</button>
                          <span className="text-base font-bold tabular-nums min-w-8 text-center">{dailyRate}</span>
                          <button
                            onClick={() => updateRate(1)}
                            className="size-9 rounded-full border border-border/50 flex items-center justify-center text-lg text-foreground/50 hover:text-foreground hover:border-border transition"
                          >+</button>
                        </div>
                      </div>
                      {estimation && (
                        <div className="bg-muted/40 rounded-2xl px-5 py-4">
                          <p className="text-xs text-foreground/50 uppercase tracking-widest mb-3">Anggaran Selesai</p>
                          <p className="text-2xl font-bold">{estimation.label}</p>
                          <p className="text-sm text-foreground/60 mt-1">{estimation.date}</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Cabaran / Chat ──────────────────────────────── */}
          <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${tab === 'rekod' ? 'hidden lg:flex' : 'flex'}`}>

            {/* Desktop sub-tab: Cabaran | Chat */}
            {user && (
              <div className="hidden lg:flex gap-0 px-8 border-b border-border/30 shrink-0">
                {(['cabaran', 'chat'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { if (t === 'chat') setUnreadChat(false); setTab(t); }}
                    className={`px-5 py-4 text-sm transition border-b-2 -mb-px relative ${
                      rightTab === t
                        ? 'border-primary text-foreground font-medium'
                        : 'border-transparent text-foreground/50 hover:text-foreground'
                    }`}
                  >
                    {t === 'cabaran' ? 'Cabaran' : 'Chat'}
                    {t === 'chat' && unreadChat && rightTab !== 'chat' && (
                      <span className="absolute top-3 ml-1 size-1.5 rounded-full bg-primary inline-block" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Right panel body */}
            <div className={`flex-1 min-h-0 ${rightTab === 'chat' && user ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>

              {!user ? (
                <div className="px-5 lg:px-12 py-16 text-center">
                  <p className="text-sm text-foreground/50">Log masuk untuk menyertai cabaran dan berbual.</p>
                </div>

              ) : rightTab === 'cabaran' ? (
                <div className="px-5 sm:px-7 lg:px-12 py-10 lg:py-14">
                  {/* Mobile header */}
                  <div className="lg:hidden mb-8">
                    <h2 className="text-2xl font-semibold">Cabaran</h2>
                  </div>

                  <div className="space-y-14">
                      {/* My stats */}
                      <div>
                        <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-4">Pencapaian Bulan Ini</p>
                        {myChallenge ? (
                          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            {[
                              { label: 'Streak Semasa', value: myChallenge.streak, sub: 'hari' },
                              { label: 'Streak Terpanjang', value: myChallenge.longestStreak, sub: 'hari' },
                              { label: 'Qada Selesai', value: myChallenge.totalQada, sub: 'solat' },
                              { label: 'Hari Aktif', value: myChallenge.activeDays, sub: 'hari' },
                            ].map(stat => (
                              <div key={stat.label} className="bg-muted/30 rounded-2xl px-4 py-6 text-center">
                                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                                <p className="text-xs text-foreground/50 mt-0.5">{stat.sub}</p>
                                <p className="text-xs text-foreground/40 mt-0.5">{stat.label}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-foreground/60">
                            Tekan <span className="font-medium text-foreground/80">Selesai hari ini</span> dalam tab Rekod untuk menyertai cabaran bulan ini.
                          </p>
                        )}
                      </div>

                      {/* Leaderboard */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">Papan Pendahuluan</p>
                          <select
                            value={lbMonth}
                            onChange={e => setLbMonth(e.target.value)}
                            className="text-xs text-foreground/60 bg-transparent border-none focus:outline-none cursor-pointer"
                          >
                            {monthOptions.map(o => (
                              <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        {!isMonthComplete(lbMonth) ? (
                          <p className="text-sm text-foreground/55 text-center py-10">
                            Papan pendahuluan akan dipaparkan selepas {lastDayOfMonth(lbMonth)}.
                          </p>
                        ) : (
                          <>
                            {/* View toggle */}
                            <div className="flex gap-1 mb-5 p-1 bg-muted/30 rounded-xl">
                              {([['streak', 'Streak'], ['qada', 'Qada'], ['hari', 'Hari Aktif']] as [LbView, string][]).map(([v, label]) => (
                                <button
                                  key={v}
                                  onClick={() => setLbView(v)}
                                  className={`flex-1 py-1.5 text-xs rounded-lg transition ${
                                    lbView === v
                                      ? 'bg-background shadow-sm font-medium text-foreground'
                                      : 'text-foreground/50 hover:text-foreground'
                                  }`}
                                >{label}</button>
                              ))}
                            </div>

                            {loadingLb ? (
                              <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="flex items-center gap-3 py-2.5">
                                    <Skeleton className="h-3.5 w-5" />
                                    <Skeleton className="h-3.5 w-32" />
                                    <Skeleton className="h-3.5 w-12 ml-auto" />
                                  </div>
                                ))}
                              </div>
                            ) : rankedLb.length === 0 ? (
                              <p className="text-sm text-foreground/50 text-center py-10">
                                Tiada peserta lagi untuk bulan ini.
                              </p>
                            ) : (
                              <div>
                                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                                  <span className="w-5 shrink-0" />
                                  <span className="text-xs text-foreground/50 flex-1">Peserta</span>
                                  <span className="text-xs text-foreground/50">
                                    {lbView === 'streak' ? 'Streak' : lbView === 'qada' ? 'Qada' : 'Hari Aktif'}
                                  </span>
                                </div>
                                <div className="divide-y divide-border/50">
                                  {rankedLb.map(p => {
                                    const isMe = p.uid === user.uid;
                                    const val = getLbValue(p, lbView);
                                    return (
                                      <div
                                        key={p.uid}
                                        className={`flex items-center gap-3 py-3 ${isMe ? 'text-primary' : ''}`}
                                      >
                                        <span className="text-xs text-foreground/45 w-5 tabular-nums text-right shrink-0">
                                          {p.rank}
                                        </span>
                                        <span className={`text-sm flex-1 truncate ${isMe ? 'font-semibold' : ''}`}>
                                          {p.alias}
                                          {p.qadaDone && (
                                            <span className="ml-2 text-[10px] text-primary/60 font-normal">Qada Selesai</span>
                                          )}
                                        </span>
                                        <span className="text-sm font-bold tabular-nums">{val}</span>
                                      </div>
                                    );
                                  })}
                                  {!rankedLb.find(p => p.uid === user.uid) && myChallenge && lbMonth === monthKey() && (
                                    <>
                                      <div className="border-t border-dashed border-border/30 my-1" />
                                      <div className="flex items-center gap-3 py-3 text-primary/70">
                                        <span className="text-xs w-5 text-right shrink-0">—</span>
                                        <span className="text-sm flex-1 font-semibold truncate">{alias}</span>
                                        <span className="text-sm font-bold tabular-nums">{getLbValue(myChallenge, lbView)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Info sections */}
                      <div className="pt-8 border-t border-border/30 space-y-10">

                        {/* Tujuan + Peringatan Niat — full width */}
                        <div>
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Tujuan</p>
                          <p className="text-sm text-foreground/70 leading-relaxed">
                            Cabaran ini bertujuan membantu anda kekal istiqamah dalam menunaikan solat qada.
                            Bukan untuk bersaing, tetapi untuk saling mengingatkan dan memberi semangat sesama Muslim.
                          </p>
                          <div className="mt-5 px-5 py-5 bg-muted/30 rounded-2xl">
                            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-1.5">Peringatan Niat</p>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                              Betulkan niat — menunaikan qada kerana Allah, bukan kerana kedudukan dalam papan pendahuluan.
                              Streak dan kedudukan hanyalah alat bantu, bukan matlamat.
                            </p>
                          </div>
                        </div>

                        {/* Nama Samaran — full width */}
                        <div>
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-1">Nama Samaran</p>
                          <p className="text-sm text-foreground/65 mt-2">
                            Nama samaran anda telah dijana secara automatik. Ketik nama di bahagian Rekod untuk menukarnya bila-bila masa.
                          </p>
                        </div>

                        {/* Peraturan | Papan Pendahuluan — balanced side by side */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                          <div>
                            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Peraturan</p>
                            <ul className="space-y-2.5">
                              {[
                                '1 log sehari untuk streak — boleh diedit semula pada hari yang sama jika perlu.',
                                'Terlepas 2 hari berturut-turut → streak kembali 0.',
                                'Streak dan hari aktif reset setiap awal bulan.',
                                'Papan pendahuluan dibuka pada 1 haribulan berikutnya.',
                              ].map(rule => (
                                <li key={rule} className="text-sm text-foreground/65 flex gap-2.5">
                                  <span className="shrink-0 text-foreground/30 mt-0.5">·</span>
                                  <span>{rule}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Papan Pendahuluan</p>
                            <ul className="space-y-2.5">
                              {[
                                'Streak Terpanjang — siapa yang paling konsisten.',
                                'Jumlah Qada — siapa yang paling banyak selesaikan qada.',
                                'Hari Aktif — siapa yang paling kerap log.',
                                'Kedudukan sama jika nilai sama.',
                              ].map(rule => (
                                <li key={rule} className="text-sm text-foreground/65 flex gap-2.5">
                                  <span className="shrink-0 text-foreground/30 mt-0.5">·</span>
                                  <span>{rule}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Chat Awam — full width */}
                        <div>
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Chat Awam</p>
                          <ul className="space-y-2.5">
                            {[
                              'Mesej sendiri boleh diedit atau dipadam dalam masa 5 minit.',
                              'Ketik mesej pengguna lain untuk lapor. Mesej yang cukup laporan disembunyikan secara automatik.',
                              'Had 3 laporan sehari per pengguna. Laporan boleh dibatalkan.',
                              'Mesej lama dipadam selepas 30 hari.',
                              'Hormat-menghormati adalah kewajipan.',
                            ].map(rule => (
                              <li key={rule} className="text-sm text-foreground/65 flex gap-2.5">
                                <span className="shrink-0 text-foreground/30 mt-0.5">·</span>
                                <span>{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                      </div>
                    </div>
                </div>

              ) : (
                /* ── Chat ───────────────────────────────────────────────── */
                <>
                  {/* Mobile header */}
                  <div className="lg:hidden px-5 py-4 border-b border-border/30 shrink-0 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">Chat Awam</p>
                    <p className="text-xs text-foreground/45">Laporan: {reportCountToday}/{DAILY_REPORT_LIMIT}</p>
                  </div>

                  {/* Desktop header */}
                  <div className="hidden lg:flex px-8 py-4 items-center justify-between shrink-0">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">Chat Awam</p>
                    <p className="text-xs text-foreground/45">Laporan hari ini: {reportCountToday}/{DAILY_REPORT_LIMIT}</p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 lg:px-8 py-2 space-y-0.5">
                    {messages.length === 0 ? (
                      <p className="text-sm text-foreground/45 text-center py-16">
                        Tiada mesej lagi. Mulakan perbualan.
                      </p>
                    ) : (
                      messages.map(msg => {
                        if (msg.hidden && msg.uid !== user.uid) return null;
                        const isMe = msg.uid === user.uid;
                        const iReported = msg.reports.includes(user.uid);
                        const ts = msg.createdAt ? new Date(msg.createdAt.toMillis()) : null;
                        const ageMs = msg.createdAt ? Date.now() - msg.createdAt.toMillis() : Infinity;
                        const canEditDelete = isMe && !msg.hidden && ageMs < EDIT_DELETE_LIMIT_MS;
                        const isEditingThis = editingMsgId === msg.id;
                        return (
                          <div key={msg.id} className={`flex flex-col gap-0.5 py-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && (
                              <span className="text-[11px] text-foreground/50 px-1">{msg.alias}</span>
                            )}
                            {isEditingThis ? (
                              <div className={`flex items-center gap-2 max-w-[78%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                <input
                                  type="text"
                                  value={editMsgInput}
                                  onChange={e => setEditMsgInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') editMessage(msg);
                                    if (e.key === 'Escape') setEditingMsgId(null);
                                  }}
                                  onBlur={() => editMessage(msg)}
                                  maxLength={300}
                                  className="px-3 py-2 rounded-2xl text-sm bg-primary/10 border border-primary/30 focus:outline-none min-w-0 flex-1"
                                  autoFocus
                                />
                                <button
                                  onMouseDown={e => { e.preventDefault(); setConfirmAction({ type: 'delete', msg }); setEditingMsgId(null); }}
                                  className="shrink-0 text-destructive/50 hover:text-destructive transition text-xs"
                                >Padam</button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  if (canEditDelete) { setEditingMsgId(msg.id); setEditMsgInput(msg.text); }
                                  else if (!isMe && !msg.hidden) {
                                    iReported
                                      ? reportMessage(msg)
                                      : setConfirmAction({ type: 'report', msg });
                                  }
                                }}
                                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed max-w-[78%] ${canEditDelete || (!isMe && !msg.hidden) ? 'cursor-pointer active:opacity-70' : ''} transition-opacity ${
                                  isMe
                                    ? 'bg-primary/10 text-foreground rounded-br-sm'
                                    : msg.hidden
                                    ? 'bg-muted/20 text-foreground/40 italic rounded-bl-sm'
                                    : 'bg-muted/40 text-foreground rounded-bl-sm'
                                }`}
                              >
                                {msg.hidden && msg.uid === user.uid ? '[Mesej ini disembunyikan]' : msg.text}
                              </div>
                            )}
                            {ts && (
                              <span className="text-[10px] text-foreground/35 px-1">
                                {ts.getHours() % 12 || 12}:{String(ts.getMinutes()).padStart(2, '0')} {ts.getHours() < 12 ? 'AM' : 'PM'}
                                {msg.editedAt && <span className="ml-1">(diedit)</span>}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Confirmation dialog */}
                  {confirmAction && (
                    <div className="shrink-0 mx-5 lg:mx-8 mb-2 px-4 py-3.5 bg-muted/60 rounded-2xl border border-border/40">
                      <p className="text-sm font-medium mb-1">
                        {confirmAction.type === 'delete' ? 'Padam mesej ini?' : 'Lapor mesej ini?'}
                      </p>
                      <p className="text-xs text-foreground/50 mb-3 line-clamp-2">"{confirmAction.msg.text}"</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (confirmAction.type === 'delete') deleteMessage(confirmAction.msg.id);
                            else reportMessage(confirmAction.msg);
                            setConfirmAction(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            confirmAction.type === 'delete'
                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {confirmAction.type === 'delete' ? 'Ya, padam' : 'Ya, lapor'}
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-foreground/50 hover:text-foreground border border-border/40 transition"
                        >Batal</button>
                      </div>
                    </div>
                  )}

                  {/* Chat input — sticky at bottom */}
                  <div className="shrink-0 px-5 lg:px-8 py-4 border-t border-border/30">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
                        }}
                        placeholder="Tulis mesej..."
                        maxLength={300}
                        className="flex-1 text-sm bg-transparent border-none focus:outline-none text-foreground placeholder:text-foreground/30"
                      />
                      <button
                        onClick={sendChat}
                        disabled={!chatInput.trim() || sendingChat}
                        className="text-primary hover:text-primary/80 transition disabled:opacity-30 shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                          <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* ── Mobile bottom tab bar ──────────────────────────────────────────── */}
        {user && (
          <nav className="lg:hidden shrink-0 flex border-t border-border/30 bg-background">
            {(['rekod', 'cabaran', 'chat'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { if (t === 'chat') setUnreadChat(false); setTab(t); }}
                className={`flex-1 py-3.5 text-xs font-medium transition relative ${
                  tab === t ? 'text-primary' : 'text-foreground/40 hover:text-foreground'
                }`}
              >
                {t === 'rekod' ? 'Rekod' : t === 'cabaran' ? 'Cabaran' : 'Chat'}
                {t === 'chat' && unreadChat && tab !== 'chat' && (
                  <span className="absolute top-2.5 right-[calc(50%-14px)] size-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </nav>
        )}

      </main>

      {/* ── Alias Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={showAliasDialog} onOpenChange={setShowAliasDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nama Samaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <div className="bg-muted/30 rounded-2xl px-5 py-4 text-center">
              <p className="text-xl font-bold">{previewAlias || alias}</p>
              {previewAlias && previewAlias !== alias && (
                <p className="text-xs text-foreground/45 mt-1">Pratonton</p>
              )}
            </div>
            <button
              onClick={generateFreeAlias}
              disabled={aliasChecking}
              className="w-full py-2.5 rounded-xl text-sm text-foreground/70 border border-border/50 hover:text-foreground hover:border-border transition disabled:opacity-40"
            >
              {aliasChecking ? 'Menyemak...' : 'Jana Nama Baru'}
            </button>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => saveAlias(previewAlias)}
                disabled={aliasChecking || !previewAlias || previewAlias === alias}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition disabled:opacity-40"
              >
                {aliasChecking ? 'Menyemak...' : 'Guna'}
              </button>
              <button
                onClick={() => setShowAliasDialog(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-foreground/60 hover:text-foreground border border-border/50 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
