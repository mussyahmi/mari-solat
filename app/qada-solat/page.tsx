'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { berperingkat, naikMasuk, spring } from '@/lib/motion';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, getDocs,
  addDoc, onSnapshot, serverTimestamp, Timestamp,
  updateDoc, arrayUnion, arrayRemove, deleteDoc,
  query, where, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, RefreshCcw } from "lucide-react";
import { isInAppBrowser } from "@/lib/utils";
import InAppBrowserBanner from '@/components/InAppBrowserBanner';
import {
  PRAYERS, DEFAULT, REPORT_THRESHOLD, DAILY_REPORT_LIMIT, MUTE_DURATIONS_MIN,
  EDIT_DELETE_LIMIT_MS, CHALLENGE_START, MALAY_MONTHS_FULL,
  generateAlias, todayStr, monthKey, daysBetween,
  formatMalayDateTime, estimateCompletion, isMonthComplete,
  lastDayOfMonth, getLbValue,
  type Prayer, type QadaCounts, type Tab, type LbView,
  type Participant, type RankedParticipant, type ChatMessage,
} from '@/lib/qada';

// ─── Types ───────────────────────────────────────────────────────────────────

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

  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    setInAppBrowser(isInAppBrowser());
  }, []);

  // ─── Auth + initial data load ──────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          let loadedAlias = '';
          if (userDoc.exists() && userDoc.data().alias) {
            loadedAlias = userDoc.data().alias;
          } else {
            for (let i = 0; i < 20; i++) {
              const candidate = generateAlias();
              const taken = await getDoc(doc(db, 'aliases', candidate));
              if (!taken.exists()) { loadedAlias = candidate; break; }
            }
            if (!loadedAlias) loadedAlias = generateAlias();
            await setDoc(userDocRef, { alias: loadedAlias }, { merge: true });
            await setDoc(doc(db, 'aliases', loadedAlias), { uid: u.uid });
          }
          setAlias(loadedAlias);

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

          const mk = monthKey();
          const partSnap = await getDoc(doc(db, 'challenge', mk, 'participants', u.uid));
          if (partSnap.exists()) {
            setMyChallenge({ uid: u.uid, ...partSnap.data() } as Participant);
          }

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
    if (tab === 'chat' || !user) return;
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
      setPreviewAlias(generateAlias());
    } finally {
      setAliasChecking(false);
    }
  };

  const saveAlias = async (trimmed: string) => {
    if (!trimmed || !user) return;
    try {
      setAliasChecking(true);
      const aliasSnap = await getDoc(doc(db, 'aliases', trimmed));
      if (aliasSnap.exists() && aliasSnap.data().uid !== user.uid) {
        toast.error('Nama samaran ini sudah digunakan. Jana semula.');
        return;
      }

      const mk = monthKey();
      const batch = writeBatch(db);

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
    } catch { }

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
    if (inAppBrowser) return;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch {
      toast.error('Log masuk gagal.');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────


  const TAB_LABEL: [Tab, string][] = [
    ['rekod', 'Rekod'],
    ['cabaran', 'Cabaran'],
    ['chat', 'Sembang'],
  ];

  return (
    <motion.main
      variants={berperingkat()}
      initial="sembunyi"
      animate="tunjuk"
      className="mx-auto w-full max-w-7xl px-5 pb-16 pt-4 lg:px-10"
    >
      {loading ? (
        <RangkaMuat />
      ) : !user ? (
        /* ── Belum log masuk ──────────────────────────────────────────────── */
        <motion.div variants={naikMasuk} className="max-w-xl">
          <h1 className="paparan text-4xl lg:text-5xl">Jejak qada anda</h1>
          <p className="mt-3 text-pretty text-lg leading-relaxed text-muted-foreground">
            Simpan kiraan solat yang tertinggal, tetapkan kadar harian, dan lihat anggaran tarikh
            anda selesai. Sertai cabaran bulanan jika mahu ditemani.
          </p>
          {inAppBrowser ? (
            <div className="mt-8 max-w-md">
              <InAppBrowserBanner />
            </div>
          ) : (
            <button
              onClick={login}
              className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
            >
              <GoogleIcon />
              Log masuk dengan Google
            </button>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Rekod anda disimpan pada akaun anda sahaja.
          </p>
        </motion.div>
      ) : (
        <>
          <motion.header variants={naikMasuk} className="mb-12 flex items-start justify-between gap-6">
            <h1 className="paparan text-4xl lg:text-5xl">Qada Solat</h1>
            <button
              onClick={() => { setPreviewAlias(''); setShowAliasDialog(true); }}
              className="flex shrink-0 items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="size-6 rounded-full" referrerPolicy="no-referrer" />
              )}
              {alias}
            </button>
          </motion.header>

          {/* Baki qada ialah satu-satunya fakta halaman ini. Ia mendapat
              layanan yang sama seperti kiraan detik di halaman utama; segala
              yang lain di bawah hanyalah cara untuk menurunkan nombor ini. */}
          <motion.div variants={naikMasuk} className="flex flex-col items-start gap-2">
            <p className="paparan text-2xl leading-none lg:text-3xl">Baki qada</p>
            <p className={`angka-paparan text-[22vw] leading-none sm:text-[16vw] lg:text-[9vw] ${total === 0 ? 'text-primary' : ''}`}>
              {total}
            </p>
            <p className="text-muted-foreground">
              {total === 0 ? 'Tiada baki tertinggal.' : 'solat lagi untuk diqada'}
            </p>
          </motion.div>

          {/* Pada telefon tiga item ini membalut jadi 2 + 1 yang senget, jadi
              ia menjadi senarai berbaris seperti senarai lain dalam aplikasi.
              Pada desktop ia kembali menjadi satu baris meta. */}
          <motion.dl
            variants={naikMasuk}
            className="mt-10 divide-y divide-border/50 border-t border-border/60 lg:flex lg:flex-wrap lg:gap-x-12 lg:divide-y-0 lg:pt-5"
          >
            {total > 0 && (
              <div className="flex items-center justify-between py-3.5 lg:block lg:py-0">
                <dt className="text-sm text-muted-foreground">Kadar harian</dt>
                <dd className="flex items-center gap-4 lg:mt-1">
                  <button
                    onClick={() => updateRate(-1)}
                    disabled={dailyRate <= 1}
                    aria-label="Kurangkan kadar harian"
                    className="text-xl leading-none text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
                  >−</button>
                  <span className="angka-paparan text-2xl">{dailyRate}</span>
                  <button
                    onClick={() => updateRate(1)}
                    aria-label="Tambah kadar harian"
                    className="text-xl leading-none text-muted-foreground transition-colors hover:text-foreground"
                  >+</button>
                </dd>
              </div>
            )}
            {/* Satu-satunya baris meta yang membawa frasa dan bukan nombor.
                Dimampatkan ke lajur kanan ia membalut jadi dua baris senget,
                jadi ia bertindan ke bawah label sebaliknya. */}
            {estimation && (
              <div className="py-3.5 lg:py-0">
                <dt className="text-sm text-muted-foreground">Anggaran selesai</dt>
                <dd className="mt-1">
                  <span className="angka-paparan text-2xl">{estimation.label}</span>
                  <span className="ml-3 text-sm text-muted-foreground">{estimation.date}</span>
                </dd>
              </div>
            )}
            {myChallenge && (
              <div className="flex items-baseline justify-between py-3.5 lg:block lg:py-0">
                <dt className="text-sm text-muted-foreground">Streak</dt>
                <dd className="lg:mt-1">
                  <span className="angka-paparan text-2xl">{myChallenge.streak}</span>
                  <span className="ml-2 text-sm text-muted-foreground">hari</span>
                </dd>
              </div>
            )}
          </motion.dl>

          <motion.div variants={naikMasuk} className="mt-16">
            <div className="-ml-3 flex items-center border-b border-border/60 lg:-ml-3.5">
              {TAB_LABEL.map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => { if (t === 'chat') setUnreadChat(false); setTab(t); }}
                  className="group relative px-3 py-3 text-sm transition-colors lg:px-3.5"
                >
                  {tab === t && (
                    <motion.span
                      layoutId="tabQada"
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                      transition={spring.susunAtur}
                    />
                  )}
                  <span className={tab === t ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
                    {label}
                  </span>
                  {t === 'chat' && unreadChat && tab !== 'chat' && (
                    <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-top" />
                  )}
                </button>
              ))}
            </div>

            {/* ── Rekod ──────────────────────────────────────────────────── */}
            {tab === 'rekod' ? (
              <div className="max-w-xl pt-10">
                <h2 className="paparan text-2xl">Solat yang tertinggal</h2>
                <p className="mt-2 text-muted-foreground">
                  Ketik nombor untuk menaip terus.
                </p>

                <div className="mt-6 divide-y divide-border/50 border-t border-border/50">
                  {PRAYERS.map(prayer => (
                    <div key={prayer} className="flex items-center justify-between py-4">
                      <span className="capitalize">{prayer}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateCount(prayer, -1)}
                          disabled={counts[prayer] === 0}
                          aria-label={`Kurangkan ${prayer}`}
                          className="flex size-9 items-center justify-center rounded-full border border-border/50 text-lg transition-colors hover:border-border hover:bg-muted disabled:opacity-25"
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
                            className="angka-paparan w-14 border-b border-border bg-transparent text-center text-xl focus:outline-none"
                            autoFocus min={0}
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingPrayer(prayer); setEditValue(String(counts[prayer])); }}
                            className="angka-paparan min-w-10 text-center text-xl transition-colors hover:text-primary"
                          >{counts[prayer]}</button>
                        )}
                        <button
                          onClick={() => updateCount(prayer, 1)}
                          aria-label={`Tambah ${prayer}`}
                          className="flex size-9 items-center justify-center rounded-full border border-border/50 text-lg transition-colors hover:border-border hover:bg-muted"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {total === 0 && !doneToday && (
                  <p className="mt-6 text-muted-foreground">
                    Masukkan berapa solat yang perlu diqada di atas.
                  </p>
                )}

                {/* Log harian */}
                <div className="mt-12">
                  {!doneToday && !showLogForm && total > 0 && (
                    <button
                      onClick={openLogForm}
                      disabled={saving}
                      className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90 disabled:opacity-40"
                    >Selesai hari ini</button>
                  )}

                  {showLogForm && (
                    <div>
                      <h3 className="paparan text-xl">
                        {doneToday ? 'Edit log hari ini' : 'Berapa qada hari ini?'}
                      </h3>
                      <div className="mt-5 divide-y divide-border/50 border-t border-border/50">
                        {(() => {
                          const formMax = doneToday
                            ? PRAYERS.reduce((acc, p) => ({ ...acc, [p]: counts[p] + todayLog[p] }), {} as QadaCounts)
                            : counts;
                          return PRAYERS.filter(p => formMax[p] > 0).map(prayer => (
                            <div key={prayer} className="flex items-center justify-between py-4">
                              <span className="capitalize">{prayer}</span>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.max(0, p[prayer] - 1) }))}
                                  disabled={logInputs[prayer] === 0}
                                  aria-label={`Kurangkan log ${prayer}`}
                                  className="flex size-9 items-center justify-center rounded-full border border-border/50 text-lg transition-colors hover:border-border hover:bg-muted disabled:opacity-25"
                                >−</button>
                                <span className="angka-paparan min-w-10 text-center text-xl">{logInputs[prayer]}</span>
                                <button
                                  onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.min(formMax[prayer], p[prayer] + 1) }))}
                                  disabled={logInputs[prayer] >= formMax[prayer]}
                                  aria-label={`Tambah log ${prayer}`}
                                  className="flex size-9 items-center justify-center rounded-full border border-border/50 text-lg transition-colors hover:border-border hover:bg-muted disabled:opacity-25"
                                >+</button>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={confirmLog}
                          disabled={saving || PRAYERS.every(p => logInputs[p] === 0)}
                          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90 disabled:opacity-40"
                        >Sahkan</button>
                        <button
                          onClick={() => { setShowLogForm(false); setLogInputs(todayLog); }}
                          className="rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-muted"
                        >Batal</button>
                      </div>
                    </div>
                  )}

                  {doneToday && !showLogForm && (total > 0 || preLogCounts !== null) && (
                    <div className="flex gap-3">
                      {total > 0 && (
                        <button
                          onClick={() => { setLogInputs(todayLog); setShowLogForm(true); }}
                          className="rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-muted"
                        >Edit log hari ini</button>
                      )}
                      {preLogCounts !== null && (
                        <button
                          onClick={undoToday}
                          className="rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-muted"
                        >Batal log</button>
                      )}
                    </div>
                  )}

                  {total > 0 && lastUpdatedPrayer && lastUpdatedAt && (
                    <p className="mt-6 text-sm text-muted-foreground">
                      Dikemas kini pada <span className="capitalize">{lastUpdatedPrayer}</span>, {formatMalayDateTime(lastUpdatedAt)}
                    </p>
                  )}
                </div>
              </div>

            /* ── Cabaran ────────────────────────────────────────────────── */
            ) : tab === 'cabaran' ? (
              <div className="pt-10">
                <h2 className="paparan text-2xl">Bulan ini</h2>
                {myChallenge ? (
                  <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-border/60 pt-5 lg:flex lg:flex-wrap lg:gap-x-12 lg:gap-y-5">
                    {[
                      { label: 'Streak semasa', value: myChallenge.streak },
                      { label: 'Streak terpanjang', value: myChallenge.longestStreak },
                      { label: 'Qada selesai', value: myChallenge.totalQada },
                      { label: 'Hari aktif', value: myChallenge.activeDays },
                    ].map(stat => (
                      <div key={stat.label}>
                        <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                        <dd className="angka-paparan mt-1 text-3xl">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 max-w-[62ch] text-muted-foreground">
                    Belum sertai. Log qada dalam tab Rekod untuk masuk cabaran bulan ini.
                  </p>
                )}

                {/* Tangga */}
                <div className="mt-16 max-w-2xl">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="paparan text-2xl">Tangga peserta</h2>
                    <select
                      value={lbMonth}
                      onChange={e => setLbMonth(e.target.value)}
                      className="cursor-pointer border-none bg-transparent text-sm text-muted-foreground focus:outline-none"
                    >
                      {monthOptions.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {!isMonthComplete(lbMonth) ? (
                    <p className="mt-4 max-w-[62ch] text-muted-foreground">
                      Keputusan bulan ini keluar selepas {lastDayOfMonth(lbMonth)}.
                    </p>
                  ) : (
                    <>
                      <div className="-ml-3 mt-4 flex items-center">
                        {([['streak', 'Streak'], ['qada', 'Qada'], ['hari', 'Hari aktif']] as [LbView, string][]).map(([v, label]) => (
                          <button
                            key={v}
                            onClick={() => setLbView(v)}
                            className={`px-3 py-1.5 text-sm transition-colors ${
                              lbView === v ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >{label}</button>
                        ))}
                      </div>

                      {loadingLb ? (
                        <div className="mt-6 border-t border-border/50">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-4 border-b border-border/50 py-4">
                              <Skeleton className="h-4 w-5" />
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="ml-auto h-6 w-10" />
                            </div>
                          ))}
                        </div>
                      ) : rankedLb.length === 0 ? (
                        <p className="mt-4 text-muted-foreground">Belum ada peserta. Jadi yang pertama.</p>
                      ) : (
                        <div className="mt-6 divide-y divide-border/50 border-t border-border/50">
                          {rankedLb.map(p => {
                            const isMe = p.uid === user.uid;
                            return (
                              <div key={p.uid} className={`flex items-center gap-4 py-4 ${isMe ? 'text-primary' : ''}`}>
                                <span className="angka-paparan w-6 shrink-0 text-right text-lg text-muted-foreground">{p.rank}</span>
                                <span className={`min-w-0 flex-1 truncate ${isMe ? 'font-semibold' : ''}`}>
                                  {p.alias}
                                  {p.qadaDone && (
                                    <span className="ml-3 text-sm text-primary">qada selesai</span>
                                  )}
                                </span>
                                <span className="angka-paparan text-2xl">{getLbValue(p, lbView)}</span>
                              </div>
                            );
                          })}
                          {!rankedLb.find(p => p.uid === user.uid) && myChallenge && lbMonth === monthKey() && (
                            <div className="flex items-center gap-4 py-4 text-primary">
                              <span className="w-6 shrink-0 text-right text-muted-foreground">—</span>
                              <span className="min-w-0 flex-1 truncate font-semibold">{alias}</span>
                              <span className="angka-paparan text-2xl">{getLbValue(myChallenge, lbView)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Nota */}
                <div className="mt-20 max-w-[68ch]">
                  <h2 className="paparan text-2xl">Kenapa ada cabaran ini</h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    Bila kita nampak ada orang lain yang turut serta, kita pun jadi lebih
                    bersemangat. Log sahaja, in shaa Allah mereka pun akan ikut sama.
                  </p>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    Betulkan semula niat — buat kerana Allah, bukan kerana nak naik tangga. Streak
                    dan kedudukan ialah pemangkin semangat, bukan matlamat.
                  </p>

                  <h3 className="paparan mt-10 text-lg">Cara ia dikira</h3>
                  <ul className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
                    {[
                      'Satu log sehari sudah memadai untuk streak. Log yang sama masih boleh diedit pada hari itu.',
                      'Terlepas dua hari berturut-turut, streak semasa kembali ke sifar.',
                      'Semua kiraan cabaran bermula semula setiap awal bulan.',
                      'Streak terpanjang menunjukkan siapa paling konsisten; jumlah qada menunjukkan siapa paling banyak selesai; hari aktif menunjukkan siapa paling kerap log.',
                    ].map(nota => (
                      <li key={nota} className="flex gap-3">
                        <span className="shrink-0" aria-hidden>·</span>
                        <span>{nota}</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="paparan mt-10 text-lg">Adab ruang sembang</h3>
                  <ul className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
                    {[
                      'Mesej sendiri boleh diedit atau dipadam dalam masa 5 minit.',
                      'Ketik mesej orang lain untuk melaporkannya. Mesej yang cukup laporan akan disembunyikan.',
                      'Had tiga laporan sehari, dan laporan boleh dibatalkan.',
                      'Mesej lama dipadam selepas 30 hari.',
                    ].map(nota => (
                      <li key={nota} className="flex gap-3">
                        <span className="shrink-0" aria-hidden>·</span>
                        <span>{nota}</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="paparan mt-10 text-lg">Nama samaran</h3>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    Nama sebenar anda tidak pernah dipaparkan. Ketik nama samaran di atas untuk
                    menukarnya bila-bila masa.
                  </p>
                </div>
              </div>

            /* ── Sembang ────────────────────────────────────────────────── */
            ) : (
              <div className="pt-10">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="paparan text-2xl">Sembang</h2>
                  {reportCountToday > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Laporan: {reportCountToday}/{DAILY_REPORT_LIMIT}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex max-w-2xl flex-col rounded-2xl border border-border/50">
                  <div className="flex h-[55vh] min-h-80 flex-col justify-end overflow-y-auto px-4 py-4">
                    {messages.length === 0 ? (
                      <p className="py-16 text-center text-muted-foreground">
                        Tiada mesej lagi. Mulakan perbualan.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {messages.map(msg => {
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
                                <span className="px-1 text-sm text-muted-foreground">{msg.alias}</span>
                              )}
                              {isEditingThis ? (
                                <div className={`flex max-w-[78%] items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
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
                                    className="min-w-0 flex-1 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onMouseDown={e => { e.preventDefault(); setConfirmAction({ type: 'delete', msg }); setEditingMsgId(null); }}
                                    className="shrink-0 text-sm text-destructive transition-colors hover:text-destructive/80"
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
                                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed transition-opacity ${canEditDelete || (!isMe && !msg.hidden) ? 'cursor-pointer active:opacity-70' : ''} ${isMe
                                    ? 'rounded-br-sm bg-accent text-accent-foreground'
                                    : msg.hidden
                                      ? 'rounded-bl-sm bg-muted italic text-muted-foreground'
                                      : 'rounded-bl-sm bg-muted'
                                    }`}
                                >
                                  {msg.hidden && msg.uid === user.uid ? '[Mesej ini disembunyikan]' : msg.text}
                                </div>
                              )}
                              {ts && (
                                <span className="px-1 text-xs text-muted-foreground">
                                  {ts.getHours() % 12 || 12}:{String(ts.getMinutes()).padStart(2, '0')} {ts.getHours() < 12 ? 'AM' : 'PM'}
                                  {msg.editedAt && <span className="ml-1">(diedit)</span>}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {confirmAction && (
                    <div className="mx-4 mb-3 rounded-2xl bg-muted px-4 py-3.5">
                      <p className="font-semibold">
                        {confirmAction.type === 'delete' ? 'Padam mesej ini?' : 'Lapor mesej ini?'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{confirmAction.msg.text}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            if (confirmAction.type === 'delete') deleteMessage(confirmAction.msg.id);
                            else reportMessage(confirmAction.msg);
                            setConfirmAction(null);
                          }}
                          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${confirmAction.type === 'delete'
                            ? 'bg-destructive text-background hover:bg-destructive/90'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                        >
                          {confirmAction.type === 'delete' ? 'Ya, padam' : 'Ya, lapor'}
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:bg-muted"
                        >Batal</button>
                      </div>
                    </div>
                  )}

                  <div className="flex shrink-0 gap-3 border-t border-border/50 px-4 py-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
                      }}
                      placeholder="Tulis mesej…"
                      maxLength={300}
                      className="flex-1 border-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      onClick={sendChat}
                      disabled={!chatInput.trim() || sendingChat}
                      aria-label="Hantar mesej"
                      className="shrink-0 text-primary transition-opacity hover:opacity-80 disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ── Dialog nama samaran ──────────────────────────────────────────── */}
      <Dialog open={showAliasDialog} onOpenChange={setShowAliasDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">Nama samaran</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <div className="flex items-center gap-3 border-y border-border/60 py-5">
              <p className="paparan flex-1 text-2xl">{previewAlias || alias}</p>
              <button
                onClick={generateFreeAlias}
                disabled={aliasChecking}
                aria-label="Jana nama lain"
                className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                {aliasChecking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCcw className="size-4" />
                )}
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => saveAlias(previewAlias)}
                disabled={aliasChecking || !previewAlias || previewAlias === alias}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Guna
              </button>
              <button
                onClick={() => setShowAliasDialog(false)}
                className="rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                Batal
              </button>
            </div>
            <button
              onClick={() => { setShowAliasDialog(false); signOut(auth); }}
              className="mt-6 w-full border-t border-border/60 pt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Log keluar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.main>
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
/** Rangka muat mencerminkan susun atur sebenar: tajuk, nombor hero, baris meta. */
function RangkaMuat() {
  return (
    <div>
      <Skeleton className="h-11 w-52" />
      <Skeleton className="mt-14 h-8 w-32" />
      <Skeleton className="mt-4 h-[22vw] w-[30vw] sm:h-[16vw] lg:h-[9vw] lg:w-[14vw]" />
      <div className="mt-12 flex flex-wrap gap-x-12 gap-y-5 border-t border-border/60 pt-5">
        {[0, 1, 2].map(i => (
          <div key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-16 max-w-xl border-t border-border/50">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between border-b border-border/50 py-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
