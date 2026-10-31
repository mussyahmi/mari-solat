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
import {
  Calculator, CalendarCheck, CalendarDays, Flame, Heart, Loader2, MessageCircle, Moon,
  RefreshCcw, SendHorizontal, Sun, SunMedium, Sunrise, Sunset, Trophy, UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { palet, WARNA_WAKTU } from "@/lib/aksen";
import { isInAppBrowser } from "@/lib/utils";
import InAppBrowserBanner from '@/components/InAppBrowserBanner';
import {
  PRAYERS, DEFAULT, REPORT_THRESHOLD, DAILY_REPORT_LIMIT, MUTE_DURATIONS_MIN,
  EDIT_DELETE_LIMIT_MS, CHALLENGE_START,
  generateAlias, todayStr, monthKey, daysBetween,
  formatMalayDateTime, estimateCompletion, isMonthComplete,
  lastDayOfMonth, getLbValue,
  type Prayer, type QadaCounts, type Tab, type LbView,
  type Participant, type RankedParticipant, type ChatMessage,
} from '@/lib/qada';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { BULAN, teksSemasa } from '@/lib/bahasa';

const ms = {
  gagalMuat: 'Gagal memuatkan data.',
  gagalMuatLb: 'Gagal memuatkan papan pendahuluan.',
  gagalSimpan: 'Gagal menyimpan.',
  qadaDikurang: (n: number) => `${n} qada dikurangkan`,
  samaranDigunakan: 'Nama samaran ini sudah digunakan. Jana semula.',
  samaranDikemaskini: 'Nama samaran dikemaskini.',
  gagalSamaran: 'Gagal mengemaskini nama samaran.',
  dimute: (n: number) => `Anda dimute selama ${n} minit lagi.`,
  gagalHantar: 'Gagal menghantar mesej.',
  tidakBolehLapor: 'Tidak boleh lapor mesej sendiri.',
  laporanDibatal: 'Laporan dibatalkan.',
  gagalBatalLaporan: 'Gagal membatalkan laporan.',
  hadLaporan: (n: number) => `Had laporan harian (${n}) telah dicapai.`,
  laporanDihantar: 'Laporan dihantar.',
  gagalLapor: 'Gagal menghantar laporan.',
  gagalEditMesej: 'Gagal mengemaskini mesej.',
  gagalPadamMesej: 'Gagal memadam mesej.',
  gagalLogMasuk: 'Log masuk gagal.',
  tabRekod: 'Rekod',
  tabCabaran: 'Cabaran',
  tabSembang: 'Sembang',
  jejakTajuk: 'Jejak qada anda',
  jejakHuraian: 'Simpan kiraan solat yang tertinggal, tetapkan kadar harian, dan lihat anggaran tarikh anda selesai. Sertai cabaran bulanan jika mahu ditemani.',
  logMasukGoogle: 'Log masuk dengan Google',
  rekodPeribadi: 'Rekod anda disimpan pada akaun anda sahaja.',
  tajuk: 'Qada Solat',
  bakiQada: 'Baki qada',
  tiadaBaki: 'Tiada baki tertinggal.',
  solatLagi: 'solat lagi untuk diqada',
  kadarHarian: 'Kadar harian',
  kurangKadar: 'Kurangkan kadar harian',
  tambahKadar: 'Tambah kadar harian',
  anggaranSelesai: 'Anggaran selesai',
  streak: 'Streak',
  hari: (() => 'hari') as (n: number) => string,
  solatTertinggal: 'Solat yang tertinggal',
  ketikNombor: 'Ketik nombor untuk menaip terus.',
  kurang: (p: string) => `Kurangkan ${p}`,
  tambah: (p: string) => `Tambah ${p}`,
  masukkanBaki: 'Masukkan berapa solat yang perlu diqada di atas.',
  selesaiHariIni: 'Selesai hari ini',
  editLogHariIni: 'Edit log hari ini',
  berapaQada: 'Berapa qada hari ini?',
  kurangLog: (p: string) => `Kurangkan log ${p}`,
  tambahLog: (p: string) => `Tambah log ${p}`,
  sahkan: 'Sahkan',
  batal: 'Batal',
  batalLog: 'Batal log',
  dikemasKiniPada: 'Dikemas kini pada',
  bulanIni: 'Bulan ini',
  streakSemasa: 'Streak semasa',
  streakTerpanjang: 'Streak terpanjang',
  qadaSelesai: 'Qada selesai',
  hariAktif: 'Hari aktif',
  belumSertai: 'Belum sertai. Log qada dalam tab Rekod untuk masuk cabaran bulan ini.',
  tanggaPeserta: 'Tangga peserta',
  keputusanSelepas: (d: string) => `Keputusan bulan ini keluar selepas ${d}.`,
  lbStreak: 'Streak',
  lbQada: 'Qada',
  lbHari: 'Hari aktif',
  belumAdaPeserta: 'Belum ada peserta. Jadi yang pertama.',
  qadaSelesaiLencana: 'qada selesai',
  kenapaTajuk: 'Kenapa ada cabaran ini',
  kenapa1: 'Bila kita nampak ada orang lain yang turut serta, kita pun jadi lebih bersemangat. Log sahaja, in shaa Allah mereka pun akan ikut sama.',
  kenapa2: 'Betulkan semula niat — buat kerana Allah, bukan kerana nak naik tangga. Streak dan kedudukan ialah pemangkin semangat, bukan matlamat.',
  caraDikira: 'Cara ia dikira',
  notaKiraan: [
    'Satu log sehari sudah memadai untuk streak. Log yang sama masih boleh diedit pada hari itu.',
    'Terlepas dua hari berturut-turut, streak semasa kembali ke sifar.',
    'Semua kiraan cabaran bermula semula setiap awal bulan.',
    'Streak terpanjang menunjukkan siapa paling konsisten; jumlah qada menunjukkan siapa paling banyak selesai; hari aktif menunjukkan siapa paling kerap log.',
  ],
  adabTajuk: 'Adab ruang sembang',
  notaAdab: [
    'Mesej sendiri boleh diedit atau dipadam dalam masa 5 minit.',
    'Ketik mesej orang lain untuk melaporkannya. Mesej yang cukup laporan akan disembunyikan.',
    'Had tiga laporan sehari, dan laporan boleh dibatalkan.',
    'Mesej lama dipadam selepas 30 hari.',
  ],
  namaSamaran: 'Nama samaran',
  namaSamaranHuraian: 'Nama sebenar anda tidak pernah dipaparkan. Ketik nama samaran di atas untuk menukarnya bila-bila masa.',
  sembang: 'Sembang',
  laporan: 'Laporan:',
  tiadaMesej: 'Tiada mesej lagi. Mulakan perbualan.',
  padam: 'Padam',
  mesejDisembunyi: '[Mesej ini disembunyikan]',
  diedit: '(diedit)',
  padamMesejIni: 'Padam mesej ini?',
  laporMesejIni: 'Lapor mesej ini?',
  yaPadam: 'Ya, padam',
  yaLapor: 'Ya, lapor',
  tulisMesej: 'Tulis mesej…',
  hantarMesej: 'Hantar mesej',
  janaNamaLain: 'Jana nama lain',
  guna: 'Guna',
  logKeluar: 'Log keluar',
};
const en: typeof ms = {
  gagalMuat: "Couldn't load your data.",
  gagalMuatLb: "Couldn't load the leaderboard.",
  gagalSimpan: "Couldn't save.",
  qadaDikurang: n => `${n} qada cleared`,
  samaranDigunakan: 'This nickname is already taken. Try another.',
  samaranDikemaskini: 'Nickname updated.',
  gagalSamaran: "Couldn't update your nickname.",
  dimute: n => `You're muted for another ${n} ${n === 1 ? 'minute' : 'minutes'}.`,
  gagalHantar: "Couldn't send your message.",
  tidakBolehLapor: "You can't report your own message.",
  laporanDibatal: 'Report withdrawn.',
  gagalBatalLaporan: "Couldn't withdraw the report.",
  hadLaporan: n => `You've reached the daily report limit (${n}).`,
  laporanDihantar: 'Report sent.',
  gagalLapor: "Couldn't send the report.",
  gagalEditMesej: "Couldn't update the message.",
  gagalPadamMesej: "Couldn't delete the message.",
  gagalLogMasuk: 'Sign-in failed.',
  tabRekod: 'Record',
  tabCabaran: 'Challenge',
  tabSembang: 'Chat',
  jejakTajuk: 'Track your qada',
  jejakHuraian: 'Keep count of missed prayers, set a daily pace, and see when you’re likely to finish. Join the monthly challenge if you’d like some company.',
  logMasukGoogle: 'Sign in with Google',
  rekodPeribadi: 'Your record is saved to your account only.',
  tajuk: 'Qada Prayers',
  bakiQada: 'Qada remaining',
  tiadaBaki: 'Nothing left to make up.',
  solatLagi: 'prayers left to make up',
  kadarHarian: 'Daily pace',
  kurangKadar: 'Decrease daily pace',
  tambahKadar: 'Increase daily pace',
  anggaranSelesai: 'Estimated finish',
  streak: 'Streak',
  hari: n => (n === 1 ? 'day' : 'days'),
  solatTertinggal: 'Missed prayers',
  ketikNombor: 'Tap a number to type it in directly.',
  kurang: p => `Decrease ${p}`,
  tambah: p => `Increase ${p}`,
  masukkanBaki: 'Enter how many prayers you need to make up above.',
  selesaiHariIni: 'Done for today',
  editLogHariIni: "Edit today's log",
  berapaQada: 'How many qada today?',
  kurangLog: p => `Decrease ${p} log`,
  tambahLog: p => `Increase ${p} log`,
  sahkan: 'Confirm',
  batal: 'Cancel',
  batalLog: 'Undo log',
  dikemasKiniPada: 'Updated',
  bulanIni: 'This month',
  streakSemasa: 'Current streak',
  streakTerpanjang: 'Longest streak',
  qadaSelesai: 'Qada done',
  hariAktif: 'Active days',
  belumSertai: "You haven't joined yet. Log your qada in the Record tab to enter this month's challenge.",
  tanggaPeserta: 'Leaderboard',
  keputusanSelepas: d => `This month's results are out after ${d}.`,
  lbStreak: 'Streak',
  lbQada: 'Qada',
  lbHari: 'Active days',
  belumAdaPeserta: 'No participants yet. Be the first.',
  qadaSelesaiLencana: 'qada complete',
  kenapaTajuk: 'Why this challenge',
  kenapa1: 'When we see others taking part, we feel more motivated too. Just log — in shaa Allah, they will follow along.',
  kenapa2: 'Renew your intention — do it for Allah, not to climb the leaderboard. Streaks and rankings are there to spur you on, not the goal itself.',
  caraDikira: 'How it’s counted',
  notaKiraan: [
    'One log a day is enough for your streak. You can still edit that log on the same day.',
    'Miss two days in a row and your current streak resets to zero.',
    'All challenge counts start over at the beginning of each month.',
    'Longest streak shows who is most consistent; qada total shows who has made up the most; active days shows who logs most often.',
  ],
  adabTajuk: 'Chat etiquette',
  notaAdab: [
    'You can edit or delete your own message within 5 minutes.',
    'Tap someone else’s message to report it. Messages with enough reports are hidden.',
    'You can make up to three reports a day, and reports can be withdrawn.',
    'Old messages are deleted after 30 days.',
  ],
  namaSamaran: 'Nickname',
  namaSamaranHuraian: 'Your real name is never shown. Tap your nickname above to change it anytime.',
  sembang: 'Chat',
  laporan: 'Reports:',
  tiadaMesej: 'No messages yet. Start the conversation.',
  padam: 'Delete',
  mesejDisembunyi: '[This message has been hidden]',
  diedit: '(edited)',
  padamMesejIni: 'Delete this message?',
  laporMesejIni: 'Report this message?',
  yaPadam: 'Yes, delete',
  yaLapor: 'Yes, report',
  tulisMesej: 'Write a message…',
  hantarMesej: 'Send message',
  janaNamaLain: 'Generate another name',
  guna: 'Use',
  logKeluar: 'Sign out',
};
const TEKS = { ms, en };

// ─── Warna & ikon ────────────────────────────────────────────────────────────

const IKON_WAKTU: Record<Prayer, LucideIcon> = {
  subuh: Sunrise, zohor: Sun, asar: SunMedium, maghrib: Sunset, isyak: Moon,
};

/** Cip ikon berwarna bagi setiap waktu — warna dikongsi dengan halaman lain. */
function CipWaktu({ prayer, kecil }: { prayer: Prayer; kecil?: boolean }) {
  const p = palet(WARNA_WAKTU[prayer]);
  const Ikon = IKON_WAKTU[prayer];
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-2xl', p.lembut, p.teks, kecil ? 'size-9' : 'size-10')}>
      <Ikon className={kecil ? 'size-4' : 'size-5'} strokeWidth={2} />
    </span>
  );
}

/** Cip ikon untuk tajuk bahagian. */
function CipIkon({ ikon: Ikon, w }: { ikon: LucideIcon; w: number }) {
  const p = palet(w);
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', p.lembut, p.teks)}>
      <Ikon className="size-5" strokeWidth={2} />
    </span>
  );
}

/** Warna tetap bagi setiap nama samaran supaya pengirim mudah dikenal dalam sembang. */
function warnaSamaran(alias: string) {
  let h = 0;
  for (let i = 0; i < alias.length; i++) h = (h * 31 + alias.charCodeAt(i)) | 0;
  return palet(Math.abs(h));
}

/** Lencana kedudukan: emas, teal dan jingga untuk tiga teratas. */
function gayaKedudukan(rank: number) {
  if (rank === 1) return 'bg-amaran-lembut text-amaran';
  if (rank === 2) return 'bg-w2-lembut text-w2';
  if (rank === 3) return 'bg-w5-lembut text-w5';
  return 'bg-muted text-muted-foreground';
}

// Warna setiap paparan tangga, sepadan dengan jubin statistik "Bulan ini".
const WARNA_LB: Record<LbView, number> = { streak: 4, qada: 2, hari: 5 };

const btnBulat = 'flex size-9 items-center justify-center rounded-full text-lg transition-colors disabled:opacity-25';
const btnSekunder = 'rounded-full bg-muted px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted/70';

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
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();

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
          toast.error(teksSemasa(TEKS).gagalMuat);
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
      toast.error(t.gagalMuatLb);
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
      toast.error(t.gagalSimpan);
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
      if (totalSubtracted > 0) toast.success(t.qadaDikurang(totalSubtracted));
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
        toast.error(t.samaranDigunakan);
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
      toast.success(t.samaranDikemaskini);
    } catch (e) {
      console.error('saveAlias error:', e);
      toast.error(t.gagalSamaran);
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
          toast.error(t.dimute(remaining));
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
      toast.error(t.gagalHantar);
    } finally {
      setSendingChat(false);
    }
  };

  const reportMessage = async (msg: ChatMessage) => {
    if (!user) return;
    if (msg.uid === user.uid) { toast.error(t.tidakBolehLapor); return; }

    const alreadyReported = msg.reports.includes(user.uid);

    if (alreadyReported) {
      try {
        await updateDoc(doc(db, 'chat', msg.id), {
          reports: arrayRemove(user.uid),
        });
        const newCount = Math.max(0, reportCountToday - 1);
        await setDoc(doc(db, 'users', user.uid, 'moderation', 'daily'), { date: today, count: newCount });
        setReportCountToday(newCount);
        toast.success(t.laporanDibatal);
      } catch {
        toast.error(t.gagalBatalLaporan);
      }
      return;
    }

    if (reportCountToday >= DAILY_REPORT_LIMIT) {
      toast.error(t.hadLaporan(DAILY_REPORT_LIMIT));
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
      toast.success(t.laporanDihantar);
    } catch {
      toast.error(t.gagalLapor);
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
      toast.error(t.gagalEditMesej);
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'chat', msgId));
    } catch {
      toast.error(t.gagalPadamMesej);
    }
  };

  // ─── Derived values ───────────────────────────────────────────────────────

  const estimation = estimateCompletion(total, dailyRate, bahasa);

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
      opts.push({ key: mk, label: `${BULAN[bahasa][m - 1]} ${y}` });
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
      toast.error(t.gagalLogMasuk);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────


  const TAB_LABEL: [Tab, string][] = [
    ['rekod', t.tabRekod],
    ['cabaran', t.tabCabaran],
    ['chat', t.tabSembang],
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
        <motion.div variants={naikMasuk} className="kad max-w-xl p-6 sm:p-8">
          {/* Barisan cip waktu sebagai hiasan — lima solat yang dijejak. */}
          <div className="flex gap-2" aria-hidden>
            {PRAYERS.map(p => <CipWaktu key={p} prayer={p} kecil />)}
          </div>
          <h1 className="paparan mt-6 text-4xl lg:text-5xl">{t.jejakTajuk}</h1>
          <p className="mt-3 text-pretty text-lg leading-relaxed text-muted-foreground">
            {t.jejakHuraian}
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
              {t.logMasukGoogle}
            </button>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {t.rekodPeribadi}
          </p>
        </motion.div>
      ) : (
        <>
          <motion.header variants={naikMasuk} className="mb-8 flex items-start justify-between gap-6">
            <h1 className="paparan text-4xl lg:text-5xl">{t.tajuk}</h1>
            <button
              onClick={() => { setPreviewAlias(''); setShowAliasDialog(true); }}
              className="flex shrink-0 items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-3.5 text-sm font-medium transition-colors hover:bg-muted/70"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <UserRound className="size-4" />
                </span>
              )}
              {alias}
            </button>
          </motion.header>

          {/* Baki qada ialah satu-satunya fakta halaman ini. Ia mendapat
              jubin terbesar; jubin lain di sebelahnya hanyalah cara untuk
              menurunkan nombor ini. */}
          <motion.dl variants={naikMasuk} className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <div className="col-span-2 flex flex-col justify-between rounded-3xl bg-accent p-5 sm:p-6 lg:row-span-2">
              <dt className="paparan text-xl leading-none text-accent-foreground lg:text-2xl">{t.bakiQada}</dt>
              <dd className="mt-4">
                <p className="angka-paparan text-[22vw] leading-none text-primary sm:text-[16vw] lg:text-[8vw]">
                  {total}
                </p>
                <p className="mt-2 text-sm text-accent-foreground/80">
                  {total === 0 ? t.tiadaBaki : t.solatLagi}
                </p>
              </dd>
            </div>
            {total > 0 && (
              <div className={cn('rounded-3xl bg-w6-lembut p-4 sm:p-5', !myChallenge && 'col-span-2 lg:col-span-1')}>
                <dt className="flex items-center gap-1.5 text-xs leading-snug text-foreground/70 sm:text-sm">
                  <CalendarCheck className="size-3.5 text-w6" />
                  {t.kadarHarian}
                </dt>
                <dd className="mt-3 flex items-center gap-2.5">
                  <button
                    onClick={() => updateRate(-1)}
                    disabled={dailyRate <= 1}
                    aria-label={t.kurangKadar}
                    className={cn(btnBulat, 'size-8 bg-card/70 text-w6 hover:bg-card')}
                  >−</button>
                  <span className="angka-paparan min-w-8 text-center text-3xl leading-none text-w6 sm:text-4xl">{dailyRate}</span>
                  <button
                    onClick={() => updateRate(1)}
                    aria-label={t.tambahKadar}
                    className={cn(btnBulat, 'size-8 bg-card/70 text-w6 hover:bg-card')}
                  >+</button>
                </dd>
              </div>
            )}
            {myChallenge && (
              <div className={cn('rounded-3xl bg-w5-lembut p-4 sm:p-5', total === 0 && 'col-span-2 lg:col-span-1')}>
                <dt className="flex items-center gap-1.5 text-xs leading-snug text-foreground/70 sm:text-sm">
                  <Flame className="size-3.5 text-w5" />
                  {t.streak}
                </dt>
                <dd className="mt-3 flex items-baseline gap-1.5">
                  <span className="angka-paparan text-3xl leading-none text-w5 sm:text-4xl">{myChallenge.streak}</span>
                  <span className="text-sm text-foreground/70">{t.hari(myChallenge.streak)}</span>
                </dd>
              </div>
            )}
            {/* Satu-satunya jubin yang membawa frasa dan bukan nombor, jadi
                ia mengambil dua lajur supaya tidak membalut senget. */}
            {estimation && (
              <div className="col-span-2 rounded-3xl bg-w1-lembut p-4 sm:p-5">
                <dt className="flex items-center gap-1.5 text-xs leading-snug text-foreground/70 sm:text-sm">
                  <CalendarDays className="size-3.5 text-w1" />
                  {t.anggaranSelesai}
                </dt>
                <dd className="mt-3">
                  <span className="angka-paparan text-2xl leading-tight text-w1 sm:text-3xl">{estimation.label}</span>
                  <span className="mt-1 block text-sm text-foreground/70">{estimation.date}</span>
                </dd>
              </div>
            )}
          </motion.dl>

          <motion.div variants={naikMasuk} className="mt-10">
            <div className="flex w-fit items-center rounded-full bg-muted p-1">
              {TAB_LABEL.map(([tb, label]) => (
                <button
                  key={tb}
                  onClick={() => { if (tb === 'chat') setUnreadChat(false); setTab(tb); }}
                  className="group relative rounded-full px-4 py-1.5 text-sm"
                >
                  {tab === tb && (
                    <motion.span
                      layoutId="tabQada"
                      className="absolute inset-0 rounded-full bg-card shadow-sm"
                      transition={spring.susunAtur}
                    />
                  )}
                  <span className={cn('relative', tab === tb ? 'font-semibold' : 'text-muted-foreground group-hover:text-foreground')}>
                    {label}
                  </span>
                  {tb === 'chat' && unreadChat && tab !== 'chat' && (
                    <span className="relative ml-1.5 inline-block size-1.5 rounded-full bg-w4 align-top" />
                  )}
                </button>
              ))}
            </div>

            {/* ── Rekod ──────────────────────────────────────────────────── */}
            {tab === 'rekod' ? (
              <div className="max-w-xl pt-8">
                <h2 className="paparan text-2xl">{t.solatTertinggal}</h2>
                <p className="mt-2 text-muted-foreground">
                  {t.ketikNombor}
                </p>

                <div className="kad mt-5 divide-y divide-border/50 px-4 sm:px-5">
                  {PRAYERS.map(prayer => {
                    const w = palet(WARNA_WAKTU[prayer]);
                    return (
                      <div key={prayer} className="flex items-center gap-3 py-3.5">
                        <CipWaktu prayer={prayer} />
                        <span className="flex-1 font-medium capitalize">{prayer}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCount(prayer, -1)}
                            disabled={counts[prayer] === 0}
                            aria-label={t.kurang(prayer)}
                            className={cn(btnBulat, 'bg-muted text-muted-foreground hover:text-foreground')}
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
                              className={cn('angka-paparan w-14 rounded-xl bg-muted py-1 text-center text-xl focus:outline-none', w.teks)}
                              autoFocus min={0}
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingPrayer(prayer); setEditValue(String(counts[prayer])); }}
                              className={cn('angka-paparan min-w-12 rounded-xl py-1 text-center text-xl transition-colors hover:bg-muted', counts[prayer] === 0 ? 'text-muted-foreground' : w.teks)}
                            >{counts[prayer]}</button>
                          )}
                          <button
                            onClick={() => updateCount(prayer, 1)}
                            aria-label={t.tambah(prayer)}
                            className={cn(btnBulat, w.lembut, w.teks, 'hover:opacity-80')}
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {total === 0 && !doneToday && (
                  <p className="mt-5 text-muted-foreground">
                    {t.masukkanBaki}
                  </p>
                )}

                {/* Log harian */}
                <div className="mt-8">
                  {!doneToday && !showLogForm && total > 0 && (
                    <button
                      onClick={openLogForm}
                      disabled={saving}
                      className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90 disabled:opacity-40"
                    >{t.selesaiHariIni}</button>
                  )}

                  {showLogForm && (
                    <div className="kad p-5">
                      <h3 className="paparan text-xl">
                        {doneToday ? t.editLogHariIni : t.berapaQada}
                      </h3>
                      <div className="mt-3 divide-y divide-border/50">
                        {(() => {
                          const formMax = doneToday
                            ? PRAYERS.reduce((acc, p) => ({ ...acc, [p]: counts[p] + todayLog[p] }), {} as QadaCounts)
                            : counts;
                          return PRAYERS.filter(p => formMax[p] > 0).map(prayer => {
                            const w = palet(WARNA_WAKTU[prayer]);
                            return (
                              <div key={prayer} className="flex items-center gap-3 py-3">
                                <CipWaktu prayer={prayer} kecil />
                                <span className="flex-1 font-medium capitalize">{prayer}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.max(0, p[prayer] - 1) }))}
                                    disabled={logInputs[prayer] === 0}
                                    aria-label={t.kurangLog(prayer)}
                                    className={cn(btnBulat, 'bg-muted text-muted-foreground hover:text-foreground')}
                                  >−</button>
                                  <span className={cn('angka-paparan min-w-10 text-center text-xl', logInputs[prayer] === 0 ? 'text-muted-foreground' : w.teks)}>{logInputs[prayer]}</span>
                                  <button
                                    onClick={() => setLogInputs(p => ({ ...p, [prayer]: Math.min(formMax[prayer], p[prayer] + 1) }))}
                                    disabled={logInputs[prayer] >= formMax[prayer]}
                                    aria-label={t.tambahLog(prayer)}
                                    className={cn(btnBulat, w.lembut, w.teks, 'hover:opacity-80')}
                                  >+</button>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={confirmLog}
                          disabled={saving || PRAYERS.every(p => logInputs[p] === 0)}
                          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90 disabled:opacity-40"
                        >{t.sahkan}</button>
                        <button
                          onClick={() => { setShowLogForm(false); setLogInputs(todayLog); }}
                          className={btnSekunder}
                        >{t.batal}</button>
                      </div>
                    </div>
                  )}

                  {doneToday && !showLogForm && (total > 0 || preLogCounts !== null) && (
                    <div className="flex flex-wrap gap-3">
                      {total > 0 && (
                        <button
                          onClick={() => { setLogInputs(todayLog); setShowLogForm(true); }}
                          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/70"
                        >{t.editLogHariIni}</button>
                      )}
                      {preLogCounts !== null && (
                        <button
                          onClick={undoToday}
                          className={btnSekunder}
                        >{t.batalLog}</button>
                      )}
                    </div>
                  )}

                  {total > 0 && lastUpdatedPrayer && lastUpdatedAt && (
                    <p className="mt-5 text-sm text-muted-foreground">
                      {t.dikemasKiniPada} <span className="capitalize">{lastUpdatedPrayer}</span>, {formatMalayDateTime(lastUpdatedAt, bahasa)}
                    </p>
                  )}
                </div>
              </div>

            /* ── Cabaran ────────────────────────────────────────────────── */
            ) : tab === 'cabaran' ? (
              <div className="pt-8">
                <h2 className="paparan text-2xl">{t.bulanIni}</h2>
                {myChallenge ? (
                  <dl className="mt-5 grid max-w-2xl grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                    {[
                      { label: t.streakSemasa, value: myChallenge.streak, w: 4 },
                      { label: t.streakTerpanjang, value: myChallenge.longestStreak, w: 0 },
                      { label: t.qadaSelesai, value: myChallenge.totalQada, w: 2 },
                      { label: t.hariAktif, value: myChallenge.activeDays, w: 5 },
                    ].map(stat => (
                      <div key={stat.label} className={cn('rounded-3xl p-4 sm:p-5', palet(stat.w).lembut)}>
                        <dd className={cn('angka-paparan text-3xl leading-none sm:text-4xl', palet(stat.w).teks)}>{stat.value}</dd>
                        <dt className="mt-2 text-xs leading-snug text-foreground/70 sm:text-sm">{stat.label}</dt>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 max-w-[62ch] text-muted-foreground">
                    {t.belumSertai}
                  </p>
                )}

                {/* Tangga */}
                <div className="mt-12 max-w-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="paparan text-2xl">{t.tanggaPeserta}</h2>
                    <select
                      value={lbMonth}
                      onChange={e => setLbMonth(e.target.value)}
                      className="cursor-pointer rounded-full border-none bg-muted px-3.5 py-1.5 text-sm font-medium focus:outline-none"
                    >
                      {monthOptions.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {!isMonthComplete(lbMonth) ? (
                    <div className="kad mt-5 flex items-start gap-3 p-4 sm:p-5">
                      <CipIkon ikon={Trophy} w={4} />
                      <p className="pt-2 text-muted-foreground">
                        {t.keputusanSelepas(lastDayOfMonth(lbMonth, bahasa))}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex w-fit items-center rounded-full bg-muted p-1">
                        {([['streak', t.lbStreak], ['qada', t.lbQada], ['hari', t.lbHari]] as [LbView, string][]).map(([v, label]) => (
                          <button
                            key={v}
                            onClick={() => setLbView(v)}
                            className="group relative rounded-full px-4 py-1.5 text-sm"
                          >
                            {lbView === v && (
                              <motion.span layoutId="tabLb" className="absolute inset-0 rounded-full bg-card shadow-sm" transition={spring.susunAtur} />
                            )}
                            <span className={cn('relative', lbView === v ? 'font-semibold' : 'text-muted-foreground group-hover:text-foreground')}>{label}</span>
                          </button>
                        ))}
                      </div>

                      {loadingLb ? (
                        <div className="kad mt-4 divide-y divide-border/50 px-3 sm:px-4">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-3 py-3.5">
                              <Skeleton className="size-9 rounded-2xl" />
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="ml-auto h-6 w-10" />
                            </div>
                          ))}
                        </div>
                      ) : rankedLb.length === 0 ? (
                        <p className="mt-4 text-muted-foreground">{t.belumAdaPeserta}</p>
                      ) : (
                        <div className="kad mt-4 space-y-0.5 p-2">
                          {rankedLb.map(p => {
                            const isMe = p.uid === user.uid;
                            return (
                              <div key={p.uid} className={cn('flex items-center gap-3 rounded-2xl px-2 py-2.5', isMe && 'bg-accent')}>
                                <span className={cn('angka-paparan flex size-9 shrink-0 items-center justify-center rounded-2xl text-base', gayaKedudukan(p.rank))}>{p.rank}</span>
                                <span className={cn('flex min-w-0 flex-1 items-center gap-2', isMe ? 'font-semibold text-accent-foreground' : 'font-medium')}>
                                  <span className="truncate">{p.alias}</span>
                                  {p.qadaDone && (
                                    <span className="shrink-0 rounded-full bg-w3-lembut px-2 py-0.5 text-xs font-medium text-w3">{t.qadaSelesaiLencana}</span>
                                  )}
                                </span>
                                <span className={cn('angka-paparan pr-1 text-2xl', palet(WARNA_LB[lbView]).teks)}>{getLbValue(p, lbView)}</span>
                              </div>
                            );
                          })}
                          {!rankedLb.find(p => p.uid === user.uid) && myChallenge && lbMonth === monthKey() && (
                            <div className="flex items-center gap-3 rounded-2xl bg-accent px-2 py-2.5">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-card/70 text-muted-foreground">—</span>
                              <span className="min-w-0 flex-1 truncate font-semibold text-accent-foreground">{alias}</span>
                              <span className={cn('angka-paparan pr-1 text-2xl', palet(WARNA_LB[lbView]).teks)}>{getLbValue(myChallenge, lbView)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Nota */}
                <div className="mt-12 grid max-w-2xl gap-3">
                  <section className="kad p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <CipIkon ikon={Heart} w={3} />
                      <h2 className="paparan text-xl">{t.kenapaTajuk}</h2>
                    </div>
                    <p className="mt-4 leading-relaxed text-muted-foreground">
                      {t.kenapa1}
                    </p>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      {t.kenapa2}
                    </p>
                  </section>

                  {([
                    [Calculator, 5, t.caraDikira, t.notaKiraan],
                    [MessageCircle, 1, t.adabTajuk, t.notaAdab],
                  ] as [LucideIcon, number, string, string[]][]).map(([ikon, w, tajuk, nota]) => (
                    <section key={tajuk} className="kad p-5 sm:p-6">
                      <div className="flex items-center gap-3">
                        <CipIkon ikon={ikon} w={w} />
                        <h3 className="paparan text-lg">{tajuk}</h3>
                      </div>
                      <ul className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
                        {nota.map(n => (
                          <li key={n} className="flex gap-3">
                            <span className={cn('mt-2.5 size-1.5 shrink-0 rounded-full', palet(w).pekat)} aria-hidden />
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}

                  <section className="kad p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <CipIkon ikon={UserRound} w={0} />
                      <h3 className="paparan text-lg">{t.namaSamaran}</h3>
                    </div>
                    <p className="mt-4 leading-relaxed text-muted-foreground">
                      {t.namaSamaranHuraian}
                    </p>
                  </section>
                </div>
              </div>

            /* ── Sembang ────────────────────────────────────────────────── */
            ) : (
              <div className="pt-8">
                <div className="flex max-w-2xl items-baseline justify-between gap-4">
                  <h2 className="paparan text-2xl">{t.sembang}</h2>
                  {reportCountToday > 0 && (
                    <p className="rounded-full bg-amaran-lembut px-3 py-1 text-xs font-medium text-amaran">
                      {t.laporan} {reportCountToday}/{DAILY_REPORT_LIMIT}
                    </p>
                  )}
                </div>

                <div className="kad mt-5 flex max-w-2xl flex-col overflow-hidden">
                  <div className="flex h-[55vh] min-h-80 flex-col justify-end overflow-y-auto px-4 py-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
                        <CipIkon ikon={MessageCircle} w={1} />
                        <p className="mt-3">{t.tiadaMesej}</p>
                      </div>
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
                          const w = warnaSamaran(msg.alias ?? '');
                          return (
                            <div key={msg.id} className={`flex flex-col gap-0.5 py-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                              {!isMe && (
                                <span className={cn('px-1 text-xs font-semibold', w.teks)}>{msg.alias}</span>
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
                                    className="min-w-0 flex-1 rounded-2xl bg-accent px-3.5 py-2 text-sm text-accent-foreground ring-2 ring-primary/40 focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onMouseDown={e => { e.preventDefault(); setConfirmAction({ type: 'delete', msg }); setEditingMsgId(null); }}
                                    className="shrink-0 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                                  >{t.padam}</button>
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
                                  className={cn(
                                    'max-w-[78%] rounded-3xl px-4 py-2 text-sm leading-relaxed transition-opacity',
                                    (canEditDelete || (!isMe && !msg.hidden)) && 'cursor-pointer active:opacity-70',
                                    isMe
                                      ? 'rounded-br-md bg-accent text-accent-foreground'
                                      : msg.hidden
                                        ? 'rounded-bl-md bg-muted italic text-muted-foreground'
                                        : cn('rounded-bl-md text-foreground', w.lembut),
                                  )}
                                >
                                  {msg.hidden && msg.uid === user.uid ? t.mesejDisembunyi : msg.text}
                                </div>
                              )}
                              {ts && (
                                <span className="px-1 text-xs text-muted-foreground">
                                  {ts.getHours() % 12 || 12}:{String(ts.getMinutes()).padStart(2, '0')} {ts.getHours() < 12 ? 'AM' : 'PM'}
                                  {msg.editedAt && <span className="ml-1">{t.diedit}</span>}
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
                    <div className={cn('mx-3 mb-3 rounded-2xl px-4 py-3.5', confirmAction.type === 'delete' ? 'bg-destructive/10' : 'bg-amaran-lembut')}>
                      <p className="font-semibold">
                        {confirmAction.type === 'delete' ? t.padamMesejIni : t.laporMesejIni}
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
                          {confirmAction.type === 'delete' ? t.yaPadam : t.yaLapor}
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="rounded-full bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:bg-card/70"
                        >{t.batal}</button>
                      </div>
                    </div>
                  )}

                  <div className="flex shrink-0 items-center gap-2 border-t border-border/50 p-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
                      }}
                      placeholder={t.tulisMesej}
                      maxLength={300}
                      className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={sendChat}
                      disabled={!chatInput.trim() || sendingChat}
                      aria-label={t.hantarMesej}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
                    >
                      <SendHorizontal className="size-4" />
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
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">{t.namaSamaran}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <div className="flex items-center gap-3 rounded-3xl bg-accent p-4">
              <CipIkon ikon={UserRound} w={0} />
              <p className="paparan min-w-0 flex-1 truncate text-xl text-accent-foreground">{previewAlias || alias}</p>
              <button
                onClick={generateFreeAlias}
                disabled={aliasChecking}
                aria-label={t.janaNamaLain}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card/70 text-accent-foreground transition-colors hover:bg-card disabled:opacity-40"
              >
                {aliasChecking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCcw className="size-4" />
                )}
              </button>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => saveAlias(previewAlias)}
                disabled={aliasChecking || !previewAlias || previewAlias === alias}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {t.guna}
              </button>
              <button
                onClick={() => setShowAliasDialog(false)}
                className={btnSekunder}
              >
                {t.batal}
              </button>
            </div>
            <button
              onClick={() => { setShowAliasDialog(false); signOut(auth); }}
              className="mt-5 w-full rounded-full py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t.logKeluar}
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
/** Rangka muat mencerminkan susun atur sebenar: tajuk, jubin baki, jubin meta, kad senarai. */
function RangkaMuat() {
  return (
    <div>
      <Skeleton className="h-11 w-52" />
      <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-44 rounded-3xl sm:h-56 lg:row-span-2 lg:h-auto" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="col-span-2 h-28 rounded-3xl" />
      </div>
      <Skeleton className="mt-10 h-10 w-64 rounded-full" />
      <div className="kad mt-8 max-w-xl divide-y divide-border/50 px-4 sm:px-5">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <Skeleton className="size-10 rounded-2xl" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="ml-auto h-9 w-32 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
