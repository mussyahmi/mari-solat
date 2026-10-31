'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, BookOpen, Clock3, Check, ChevronDown, ChevronLeft, ChevronRight, Minus, MoonStar, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { GRADIEN_PELANGI, GRADIEN_PELANGI_PEKAT, gradienPastel, palet, PALET_UTAMA } from '@/lib/aksen';
import { db } from '@/firebase';
import { useAkaun } from '@/components/AkaunProvider';
import InAppBrowserBanner from '@/components/InAppBrowserBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { berperingkat, naikMasuk, spring } from '@/lib/motion';
import { isInAppBrowser, cn } from '@/lib/utils';
import { todayStr } from '@/lib/qada';
import { BULAN, BULAN_PENDEK, HARI, bahasaSemasa, teksSemasa, type Bahasa } from '@/lib/bahasa';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { bacaCacheWaktu, parseTime } from '@/lib/solat';
import {
  bakiSebelum, dijadualkan, kiraSyawal, LABEL_SLOT, nilai, SASARAN_SYAWAL,
  SLOT, slotLengkap, tambahHari, tarikhKe, teksJadual,
  adalahQuran, idBaru, susunAmalan, solatBaru, unitPapar, warnaAmalan, type Amalan, type ItemZikir, type LogHari, type LogTahun, type Petak, type Slot,
} from '@/lib/amalan';
import GridAmalan, { gayaPetak, julat, kelasPetak, MatriksAmalan, type Paparan } from './GridAmalan';
import BorangAmalan from './BorangAmalan';
import { adalahLalai, pastikanLalai } from '@/lib/amalan-lalai';
import { useGetarSiap } from '@/components/KesanSiap';
import KadQuran from '@/components/KadQuran';
import SenaraiSolat from '@/components/SenaraiSolat';
import { useWaktuTarikh } from '@/components/useWaktuTarikh';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const IKON_JENIS = { sasaran: BookOpen, zikir: Sparkles, solat: Clock3, jadual: MoonStar } as const;

/**
 * Warna kad amalan: tiga amalan lalai berkongsi warna tema; setiap amalan
 * yang ditambah pengguna mendapat warnanya sendiri (dipilih dalam borang).
 */
const paletKad = (a?: Amalan) => (!a || adalahLalai(a) ? PALET_UTAMA : palet(warnaAmalan(a)));
const gradien = gradienPastel;

/** Cip ikon berwarna — identiti visual setiap amalan. */
function CipAmalan({ a, kecil }: { a: Amalan; kecil?: boolean }) {
  const p = paletKad(a);
  const Ikon = IKON_JENIS[a.jenis];
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-2xl', p.lembut, p.teks, kecil ? 'size-9' : 'size-11')}>
      <Ikon className={kecil ? 'size-4' : 'size-5'} strokeWidth={2} />
    </span>
  );
}

const labelBahagian = 'text-xs text-muted-foreground/60 uppercase tracking-widest';

const ms = {
  hariIni: 'Hari ini',
  semalam: 'Semalam',
  gagalMuat: 'Amalan tidak dapat dimuatkan.',
  gagalRekod: 'Rekod tidak dapat disimpan.',
  gagalSimpan: 'Amalan tidak dapat disimpan.',
  dipadam: (n: string) => `${n} dipadam`,
  gagalPadam: 'Amalan tidak dapat dipadam.',
  gagalSusun: 'Susunan tidak dapat disimpan.',
  gagalCadangan: 'Cadangan tidak dapat ditambah.',
  tajuk: 'Jejak Amalan',
  pengenalan: 'Tandakan bacaan Al-Quran, zikir selepas solat dan puasa sunat setiap hari. Lihat semula konsistensi anda sepanjang minggu, bulan dan tahun.',
  logMasuk: 'Log masuk dengan Google',
  peribadi: 'Rekod anda peribadi — disimpan pada akaun anda sahaja dan tidak dibandingkan dengan sesiapa.',
  subtajuk: 'Antara kamu dan Allah. Tiada perbandingan, hanya istiqamah.',
  amalan: 'Amalan',
  belumAda: 'Belum ada amalan dijejak.',
  mulakan: 'Mulakan dengan cadangan — Al-Quran 1 muka surat sehari, zikir selepas solat, puasa Isnin & Khamis dan Ayyamul Bidh — kemudian ubah mengikut amalan anda.',
  gunaCadangan: 'Guna cadangan',
  tambahSendiri: 'Tambah sendiri',
  hariSebelum: 'Hari sebelum',
  hariSelepas: 'Hari selepas',
  kembali: 'Kembali ke hari ini',
  tiadaJadual: 'Tiada amalan dijadualkan pada hari ini.',
  pencapaian: 'Ringkasan',
  tabHariIni: 'Hari ini',
  tabRingkasan: 'Ringkasan',
  paparan: { minggu: 'Minggu', bulan: 'Bulan', tahun: 'Tahun' } as Record<Paparan, string>,
  sebelum: 'Sebelum',
  selepas: 'Selepas',
  keseluruhan: 'Keseluruhan',
  hariLengkap: (n: number) => ` / ${n} hari lengkap`,
  belumRekod: 'Belum ada rekod',
  berturut: (n: number) => `${n} hari berturut-turut`,
  amalanSaya: 'Amalan saya',
  sehari: (n: number | undefined, unit: string | undefined) => `${n} ${unit} sehari`,
  zikirWaktu: (n: number) => `${n} zikir × 5 waktu`,
  limaWaktu: 'Subuh hingga Isyak setiap hari',
  solatSiap: (n: number) => `${n} / 5 solat`,
  tandaSolat: (w: string) => `Tandakan solat ${w}`,
  tambahAmalan: 'Tambah amalan',
  padamAmalan: (n: string) => `Padam ${n}`,
  pastiPadamTajuk: (n: string) => `Padam ${n}?`,
  pastiPadamTeks: 'Amalan ini dan semua rekodnya akan dipadam. Tindakan ini tidak boleh dibuat asal.',
  batal: 'Batal',
  padam: 'Padam',
  naik: 'Naik',
  turun: 'Turun',
  ubah: (n: string) => `Ubah ${n}`,
  hariLepas: 'Rekod hari lepas',
  statHariLengkap: 'hari semua amalan lengkap',
  statKadar: 'amalan ditunaikan',
  statBaki: (unit: string) => `baki ${unit}`,
  ringkas: (siap: number, perlu: number) => `${siap} / ${perlu} hari`,
  ringkasStreak: (n: number) => `${n} berturut`,
  legenda: { lengkap: 'Lengkap', sebahagian: 'Sebahagian', qada: 'Hari melunas baki', terlepas: 'Terlepas', belum: 'Belum', tiada: 'Tiada jadual' },
  bakiDilunas: (b: number) => `Baki ${b} dilunaskan`,
  tercapai: 'Sasaran tercapai',
  belumSelesai: 'Belum selesai',
  selesai: 'Selesai',
  selepasSetiap: 'Selepas setiap solat fardu',
  tajukSolat: 'Solat',
  tiadaJadualHari: 'Tiada jadual hari ini',
  semuaSelesai: 'MasyaAllah, semua amalan hari ini selesai!',
  teruskan: 'Teruskan, sedikit demi sedikit',
  selesaiDaripada: (a: number, n: number) => `${a} / ${n} amalan selesai`,
  belumBermula: 'Belum dijejak pada tarikh ini',
  perlu: (n: number, unit: string | undefined) => `Perlu ${n} ${unit} · `,
  baki: (b: number) => `baki ${b}`,
  sasaran: (n: number, unit: string | undefined) => `Sasaran ${n} ${unit}`,
  tolak: 'Tolak',
  tambah: 'Tambah',
  syawalIni: (n: number, s: number) => `${n} / ${s} hari Syawal ini`,
  waktu: (n: number) => `${n} / 5 waktu`,
  sekarang: 'sekarang',
  kosongkan: 'Kosongkan',
  tandaSemua: 'Tandakan semua',
  ubahSenarai: 'Ubah senarai zikir',
  siapUbah: 'Siap',
  zikirBaru: 'Tambah zikir, cth. Selawat 10x',
  tambahZikir: 'Tambah zikir',
  lalai: 'Lalai',
  lalaiNota: 'Amalan lalai — tidak boleh dipadam',
  buangZikir: (n: string) => `Buang ${n}`,
  tandaWaktu: (w: string) => `Tandakan semua zikir ${w}`,
  gagalUbah: 'Senarai tidak dapat disimpan.',
  pastiBuang: 'Buang?',
  solatBelum: 'Solat 5 waktu belum dijejak. Tambahkannya untuk menanda setiap waktu dan melihatnya dalam jadual pencapaian.',
  tambahSolat: 'Tambah Solat 5 waktu',
};
const en: typeof ms = {
  hariIni: 'Today',
  semalam: 'Yesterday',
  gagalMuat: "Your practices couldn't be loaded.",
  gagalRekod: "The record couldn't be saved.",
  gagalSimpan: "The practice couldn't be saved.",
  dipadam: n => `${n} deleted`,
  gagalPadam: "The practice couldn't be deleted.",
  gagalSusun: "The new order couldn't be saved.",
  gagalCadangan: "The suggestions couldn't be added.",
  tajuk: 'Ibadah Tracker',
  pengenalan: 'Mark your Quran reading, zikir after prayer and sunnah fasts each day. Look back on your consistency across the week, month and year.',
  logMasuk: 'Sign in with Google',
  peribadi: 'Your records are private — stored only on your account and never compared with anyone.',
  subtajuk: 'Between you and Allah. No comparisons, only istiqamah.',
  amalan: 'Practice',
  belumAda: 'No practices tracked yet.',
  mulakan: 'Start with the suggestions — 1 page of Quran a day, zikir after prayer, Monday & Thursday fasts and Ayyamul Bidh — then adjust them to your own practice.',
  gunaCadangan: 'Use suggestions',
  tambahSendiri: 'Add your own',
  hariSebelum: 'Previous day',
  hariSelepas: 'Next day',
  kembali: 'Back to today',
  tiadaJadual: 'No practices scheduled for this day.',
  pencapaian: 'Overview',
  tabHariIni: 'Today',
  tabRingkasan: 'Overview',
  paparan: { minggu: 'Week', bulan: 'Month', tahun: 'Year' },
  sebelum: 'Previous',
  selepas: 'Next',
  keseluruhan: 'Overall',
  hariLengkap: n => ` / ${n} days complete`,
  belumRekod: 'No records yet',
  berturut: n => `${n}-day streak`,
  amalanSaya: 'My practices',
  sehari: (n, unit) => `${n} ${unit} a day`,
  zikirWaktu: n => `${n} zikir × 5 prayers`,
  limaWaktu: 'Subuh to Isyak, every day',
  solatSiap: n => `${n} / 5 prayers`,
  tandaSolat: w => `Mark ${w} prayed`,
  tambahAmalan: 'Add practice',
  padamAmalan: n => `Delete ${n}`,
  pastiPadamTajuk: n => `Delete ${n}?`,
  pastiPadamTeks: 'This practice and all its records will be deleted. This cannot be undone.',
  batal: 'Cancel',
  padam: 'Delete',
  naik: 'Move up',
  turun: 'Move down',
  ubah: n => `Edit ${n}`,
  hariLepas: 'Past record',
  statHariLengkap: 'days with every practice done',
  statKadar: 'of practices kept',
  statBaki: unit => `${unit} owed`,
  ringkas: (siap, perlu) => `${siap} / ${perlu} days`,
  ringkasStreak: n => `${n} in a row`,
  legenda: { lengkap: 'Complete', sebahagian: 'Partial', qada: 'Day that cleared a backlog', terlepas: 'Missed', belum: 'Not yet', tiada: 'Not scheduled' },
  bakiDilunas: b => `Backlog of ${b} cleared`,
  tercapai: 'Target reached',
  belumSelesai: 'Not done yet',
  selesai: 'Done',
  selepasSetiap: 'After each obligatory prayer',
  tiadaJadualHari: 'Not scheduled today',
  semuaSelesai: 'MasyaAllah, every practice done today!',
  teruskan: 'Keep going, little by little',
  selesaiDaripada: (a, n) => `${a} / ${n} practices done`,
  belumBermula: 'Not tracked on this date yet',
  tajukSolat: 'Solat',
  perlu: (n, unit) => `Need ${n} ${unit} · `,
  baki: b => `${b} backlog`,
  sasaran: (n, unit) => `Target ${n} ${unit}`,
  tolak: 'Decrease',
  tambah: 'Increase',
  syawalIni: (n, s) => `${n} / ${s} days this Syawal`,
  waktu: n => `${n} / 5 prayers`,
  sekarang: 'now',
  kosongkan: 'Clear',
  tandaSemua: 'Mark all',
  ubahSenarai: 'Edit zikir list',
  siapUbah: 'Done',
  zikirBaru: 'Add a zikir, e.g. Selawat 10x',
  tambahZikir: 'Add zikir',
  lalai: 'Default',
  lalaiNota: 'Default practice — cannot be deleted',
  buangZikir: n => `Remove ${n}`,
  tandaWaktu: w => `Mark all zikir for ${w}`,
  gagalUbah: "Couldn't save the list.",
  pastiBuang: 'Remove?',
  solatBelum: "Your five daily prayers aren't tracked yet. Add them to tick each prayer and see them in your progress table.",
  tambahSolat: 'Add five daily prayers',
};
const TEKS = { ms, en };
type Teks = typeof ms;

/** Solat fardu terakhir yang sudah masuk waktu, untuk membuka slot zikirnya. */
function slotSekarang(): Slot | null {
  const waktu = bacaCacheWaktu();
  if (!waktu) return null;
  const kini = Date.now();
  for (const s of [...SLOT].reverse()) {
    if (parseTime(waktu[s]).getTime() <= kini) return s;
  }
  return null;
}

function teksTarikh(s: string, hariIni: string, bahasa: Bahasa, t: Teks) {
  const d = tarikhKe(s);
  const tarikh = `${HARI[bahasa][d.getDay()]}, ${d.getDate()} ${BULAN[bahasa][d.getMonth()]}`;
  const label = s === hariIni ? t.hariIni : s === tambahHari(hariIni, -1) ? t.semalam : t.hariLepas;
  return { label, tarikh };
}

function tajukJulat(paparan: Paparan, dari: string, hingga: string, bahasa: Bahasa) {
  const a = tarikhKe(dari);
  const b = tarikhKe(hingga);
  const pendek = BULAN_PENDEK[bahasa];
  if (paparan === 'tahun') return String(a.getFullYear());
  if (paparan === 'bulan') return `${BULAN[bahasa][a.getMonth()]} ${a.getFullYear()}`;
  return `${a.getDate()} ${pendek[a.getMonth()]} – ${b.getDate()} ${pendek[b.getMonth()]}`;
}

const lengkap = (p?: Petak) => p?.k === 'penuh' || p?.k === 'qada';

/** Hari berturut-turut yang lengkap, berakhir hari ini (atau semalam jika
    hari ini belum selesai — hari yang belum berakhir tidak memutuskannya). */
function berturut(a: Amalan, log: LogTahun, hariIni: string) {
  const dari = tambahHari(hariIni, -400) < a.mula ? a.mula : tambahHari(hariIni, -400);
  const { petak } = nilai(a, log, dari, hariIni, hariIni);
  let n = 0;
  for (let s = hariIni; s >= dari; s = tambahHari(s, -1)) {
    const p = petak[s];
    if (!p || p.k === 'tiada') continue;
    if (lengkap(p)) n++;
    else if (s === hariIni) continue;
    else break;
  }
  return n;
}

export default function AmalanPage() {
  const { user, memuat, masuk } = useAkaun();
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [hariIni, setHariIni] = useState(todayStr);
  const [dipilih, setDipilih] = useState(todayStr);
  const [amalan, setAmalan] = useState<Amalan[] | null>(null);
  const [logMentah, setLogMentah] = useState<Record<string, Record<string, LogTahun>>>({});
  const [paparan, setPaparan] = useState<Paparan>('bulan');
  const [anjakan, setAnjakan] = useState(0);
  const [borang, setBorang] = useState<{ asal: Amalan | null } | null>(null);
  const [sahPadam, setSahPadam] = useState<Amalan | null>(null);
  /** Dua paparan: tanda harian, atau ringkasan pencapaian dan urus amalan. */
  const [tab, setTab] = useState<'hariIni' | 'ringkasan'>('hariIni');
  const waktuDipilih = useWaktuTarikh(dipilih);
  const [inApp, setInApp] = useState(false);

  useEffect(() => { setInApp(isInAppBrowser()); }, []);

  // Tarikh bertukar jika halaman dibiarkan terbuka melepasi tengah malam.
  useEffect(() => {
    const semak = () => {
      const t = todayStr();
      setHariIni(prev => {
        if (prev !== t) setDipilih(d => (d === prev ? t : d));
        return t;
      });
    };
    const id = setInterval(semak, 60_000);
    document.addEventListener('visibilitychange', semak);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', semak); };
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'users', user.uid, 'amalan'), orderBy('susunan')),
      snap => {
        const semua = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Amalan);
        setAmalan(semua);
        // Solat, Al-Quran dan Zikir sentiasa ada untuk setiap pengguna.
        pastikanLalai(user.uid, semua, bahasaSemasa());
      },
      () => { setAmalan([]); toast.error(teksSemasa(TEKS).gagalMuat); }
    );
  }, [user]);

  const { dari, hingga } = julat(paparan, anjakan, hariIni);

  // Setiap amalan disimpan sebagai satu dokumen setahun. Baki sasaran perlu
  // dikira dari hari amalan bermula, jadi setiap tahun sejak itu dimuatkan.
  const langganan = useMemo(() => {
    if (!amalan) return [];
    const akhir = Number(hariIni.slice(0, 4));
    return amalan.flatMap(a => {
      const tahun: string[] = [];
      for (let y = Number(a.mula.slice(0, 4)); y <= akhir; y++) tahun.push(`${a.id}/${y}`);
      return tahun;
    });
  }, [amalan, hariIni]);
  const kunciLangganan = langganan.join(',');

  useEffect(() => {
    if (!user || !kunciLangganan) return;
    const henti = kunciLangganan.split(',').map(k => {
      const [id, y] = k.split('/');
      return onSnapshot(doc(db, 'users', user.uid, 'amalan', id, 'tahun', y), snap => {
        setLogMentah(prev => ({ ...prev, [id]: { ...prev[id], [y]: (snap.data() ?? {}) as LogTahun } }));
      });
    });
    return () => henti.forEach(f => f());
  }, [user, kunciLangganan]);

  const log = useMemo(() => {
    const hasil: Record<string, LogTahun> = {};
    for (const [id, tahun] of Object.entries(logMentah)) hasil[id] = Object.assign({}, ...Object.values(tahun));
    return hasil;
  }, [logMentah]);

  const tulis = async (a: Amalan, s: string, isi: LogHari) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'amalan', a.id, 'tahun', s.slice(0, 4)), { [s]: isi }, { merge: true });
    } catch {
      toast.error(t.gagalRekod);
    }
  };

  /** Dicipta automatik kali pertama solat ditanda, atau dari kad ajakan. */
  const ciptaSolat = async (): Promise<Amalan | undefined> => {
    if (!user || !amalan) return undefined;
    const ref = doc(collection(db, 'users', user.uid, 'amalan'));
    const mula = dipilih < hariIni ? dipilih : hariIni;
    const baru = solatBaru(bahasa, mula, Math.min(0, ...amalan.map(a => a.susunan)) - 1);
    try {
      await setDoc(ref, baru);
      return { id: ref.id, ...baru };
    } catch {
      toast.error(t.gagalSimpan);
      return undefined;
    }
  };

  const ubahAmalan = async (a: Amalan, ubah: Partial<Amalan>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'amalan', a.id), ubah);
    } catch {
      toast.error(t.gagalUbah);
    }
  };

  const simpanAmalan = async (d: Omit<Amalan, 'id' | 'susunan'>) => {
    if (!user || !amalan) return;
    const asal = borang?.asal;
    const id = asal?.id ?? doc(collection(db, 'users', user.uid, 'amalan')).id;
    const susunan = asal?.susunan ?? amalan.reduce((m, a) => Math.max(m, a.susunan + 1), 0);
    try {
      await setDoc(doc(db, 'users', user.uid, 'amalan', id), { ...d, susunan });
      setBorang(null);
    } catch {
      toast.error(t.gagalSimpan);
    }
  };

  const padamAmalan = async (a = borang?.asal) => {
    if (!user || !a) return;
    try {
      const tahun = await getDocs(collection(db, 'users', user.uid, 'amalan', a.id, 'tahun'));
      await Promise.all(tahun.docs.map(t => deleteDoc(t.ref)));
      await deleteDoc(doc(db, 'users', user.uid, 'amalan', a.id));
      setBorang(null);
      setSahPadam(null);
      toast.success(t.dipadam(a.nama));
    } catch {
      toast.error(t.gagalPadam);
    }
  };

  const alihAmalan = async (i: number, arah: -1 | 1) => {
    if (!user || !amalan) return;
    // Indeks datang daripada senarai yang dipaparkan (sudah disusun).
    const tersusun = susunAmalan(amalan);
    const a = tersusun[i];
    const b = tersusun[i + arah];
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid, 'amalan', a.id), { susunan: b.susunan });
    batch.update(doc(db, 'users', user.uid, 'amalan', b.id), { susunan: a.susunan });
    // Dua amalan lama mungkin berkongsi nombor susunan yang sama.
    if (a.susunan === b.susunan) batch.update(doc(db, 'users', user.uid, 'amalan', b.id), { susunan: a.susunan - arah });
    await batch.commit().catch(() => toast.error(t.gagalSusun));
  };

  /* ── Belum log masuk ─────────────────────────────────────────────── */

  if (memuat || (user && amalan === null)) {
    return (
      <main className="mx-auto w-full max-w-7xl px-5 pb-16 pt-4 lg:px-10">
        <Skeleton className="h-11 w-60" />
        <Skeleton className="mt-14 h-5 w-48" />
        <div className="mt-6 max-w-xl border-t border-border/50">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center justify-between border-b border-border/50 py-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <motion.main variants={berperingkat()} initial="sembunyi" animate="tunjuk" className="mx-auto w-full max-w-7xl px-5 pb-16 pt-4 lg:px-10">
        <motion.div variants={naikMasuk} className="max-w-xl">
          <h1 className="paparan text-4xl lg:text-5xl">{t.tajuk}</h1>
          <p className="mt-3 text-pretty text-lg leading-relaxed text-muted-foreground">
            {t.pengenalan}
          </p>
          {inApp ? (
            <div className="mt-8 max-w-md"><InAppBrowserBanner /></div>
          ) : (
            <button
              onClick={masuk}
              className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
            >
              {t.logMasuk}
            </button>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {t.peribadi}
          </p>
        </motion.div>
      </motion.main>
    );
  }

  const senarai = susunAmalan(amalan ?? []);
  const perluHariIni = senarai.filter(a => dijadualkan(a, dipilih));
  const amalanSolat = perluHariIni.find(a => a.jenis === 'solat');
  const awalRekod = senarai.reduce((m, a) => (a.mula < m ? a.mula : m), hariIni);

  // Penilaian setiap amalan untuk julat yang dipaparkan.
  const nilaian = senarai.map(a => ({ a, ...nilai(a, log[a.id] ?? {}, dari, hingga, hariIni) }));

  // Grid keseluruhan: purata semua amalan yang perlu pada hari itu.
  const keseluruhan: Record<string, Petak> = {};
  for (let s = dari; s <= hingga; s = tambahHari(s, 1)) {
    const hari = nilaian.map(n => n.petak[s]).filter(p => p && p.k !== 'tiada') as Petak[];
    if (hari.length === 0) { keseluruhan[s] = { k: 'tiada' }; continue; }
    const skor = hari.reduce((t, p) => t + (lengkap(p) ? 1 : p.k === 'separa' ? p.kadar : 0), 0) / hari.length;
    if (skor >= 1) keseluruhan[s] = hari.some(p => p.k === 'qada') ? { k: 'qada', dilunas: 0 } : { k: 'penuh' };
    else if (skor > 0) keseluruhan[s] = { k: 'separa', kadar: skor };
    else keseluruhan[s] = s < hariIni ? { k: 'terlepas' } : { k: 'kosong' };
  }

  const kira = (petak: Record<string, Petak>) => {
    let perlu = 0, siap = 0;
    for (const [s, p] of Object.entries(petak)) {
      if (p.k === 'tiada' || s > hariIni) continue;
      // Hari ini hanya dikira apabila sudah lengkap — ia belum berakhir.
      if (s === hariIni && !lengkap(p)) continue;
      perlu++;
      if (lengkap(p)) siap++;
    }
    return { perlu, siap };
  };

  return (
    <motion.main variants={berperingkat()} initial="sembunyi" animate="tunjuk" className="mx-auto w-full max-w-7xl px-5 pb-16 pt-4 lg:px-10">
      <motion.header variants={naikMasuk} className="mb-12 flex items-start justify-between gap-6">
        <div>
          <h1 className="paparan text-4xl lg:text-5xl">{t.tajuk}</h1>
          <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
            {t.subtajuk}
          </p>
        </div>
        {/* Satu-satunya butang untuk menambah amalan baharu. */}
        <button
          onClick={() => setBorang({ asal: null })}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" /> {t.amalan}
        </button>
      </motion.header>

      {senarai.length === 0 ? (
        // Amalan lalai sedang dicipta — sekejap sahaja.
        <div className="space-y-3">
          <Skeleton className="h-10 w-56 rounded-full" />
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          <motion.div variants={naikMasuk} className="mb-8 flex">
            <div className="flex rounded-full bg-muted p-1">
              {(['hariIni', 'ringkasan'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  aria-pressed={tab === k}
                  className="relative rounded-full px-5 py-2 text-sm"
                >
                  {tab === k && (
                    <motion.span layoutId="tabJejak" className="absolute inset-0 rounded-full bg-card shadow-sm dark:bg-accent" transition={spring.susunAtur} />
                  )}
                  <span className={cn('relative', tab === k ? 'font-semibold dark:text-accent-foreground' : 'text-muted-foreground')}>
                    {k === 'hariIni' ? t.tabHariIni : t.tabRingkasan}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {tab === 'hariIni' && (
          /* ── Rekod hari dipilih ─────────────────────────────────── */
          <motion.section variants={naikMasuk}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className={labelBahagian}>{teksTarikh(dipilih, hariIni, bahasa, t).label}</p>
                <h2 className="paparan mt-2 text-2xl">{teksTarikh(dipilih, hariIni, bahasa, t).tarikh}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label={t.hariSebelum}
                  disabled={dipilih <= awalRekod}
                  onClick={() => setDipilih(tambahHari(dipilih, -1))}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                ><ChevronLeft className="size-4" /></button>
                <button
                  aria-label={t.hariSelepas}
                  disabled={dipilih >= hariIni}
                  onClick={() => setDipilih(tambahHari(dipilih, 1))}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                ><ChevronRight className="size-4" /></button>
              </div>
            </div>
            {dipilih !== hariIni && (
              <button onClick={() => setDipilih(hariIni)} className="mt-2 text-sm text-primary hover:underline">
                {t.kembali}
              </button>
            )}

            {/* Ringkasan hari: berapa amalan sudah lengkap, dalam jalur kecerunan tema. */}
            {perluHariIni.length > 0 && (() => {
              const siapHari = perluHariIni.filter(a => lengkap(nilai(a, log[a.id] ?? {}, dipilih, dipilih, hariIni).petak[dipilih])).length;
              const semua = siapHari === perluHariIni.length;
              return (
                <div className="relative mt-5 overflow-hidden rounded-3xl p-5 text-foreground shadow-[var(--bayang-kad)]" style={{ background: GRADIEN_PELANGI }}>
                  <svg viewBox="0 0 100 100" className="pointer-events-none absolute -right-8 -top-8 size-40 rotate-12 opacity-15" aria-hidden>
                    <path d="M50 0 L61 26 L85 15 L74 39 L100 50 L74 61 L85 85 L61 74 L50 100 L39 74 L15 85 L26 61 L0 50 L26 39 L15 15 L39 26 Z" fill="var(--w1)" />
                  </svg>
                  <p className="relative text-sm font-medium text-foreground/70">{semua ? t.semuaSelesai : t.teruskan}</p>
                  <p className="relative mt-1 text-3xl font-extrabold tabular-nums">{t.selesaiDaripada(siapHari, perluHariIni.length)}</p>
                  <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/60">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(siapHari / perluHariIni.length) * 100}%`, background: GRADIEN_PELANGI_PEKAT }} />
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 space-y-8">
              {perluHariIni.length === 0 && (
                <p className="kad p-5 text-sm text-muted-foreground">{t.tiadaJadual}</p>
              )}
              {/* Lima kad waktu untuk menanda solat sahaja; zikir selepas solat
                  mempunyai kadnya sendiri di bawah, atas permintaan pemilik. */}
              {/* Setiap amalan ialah bahagian bertajuk dalam satu senarai — amalan
                  baharu sentiasa mendapat tajuk dan tempatnya sendiri. */}
              <section>
                <TajukBahagian Ikon={Clock3} lalai>{amalanSolat?.nama ?? t.tajukSolat}</TajukBahagian>
                <SenaraiSolat
                  waktu={waktuDipilih}
                  kini={dipilih === hariIni ? new Date() : null}
                  hariLepas={dipilih < hariIni}
                  solat={amalanSolat}
                  logSolat={amalanSolat ? log[amalanSolat.id]?.[dipilih] : undefined}
                  onTulis={(a, isi) => tulis(a, dipilih, isi)}
                  ciptaSolat={senarai.some(a => a.jenis === 'solat') ? undefined : ciptaSolat}
                  seragam
                />
              </section>
              {/* Semua amalan, mengikut susunan — amalan baharu sentiasa di hujung.
                  Yang tidak dijadualkan hari ini tetap kelihatan, dipudarkan. */}
              {senarai.filter(a => a.jenis !== 'solat').map(a => !dijadualkan(a, dipilih) ? (
                <section key={`${a.id}-${dipilih}`} className="opacity-55">
                  <TajukBahagian a={a} Ikon={IKON_JENIS[a.jenis]} lalai={adalahLalai(a)} onBuang={adalahLalai(a) ? undefined : () => setSahPadam(a)} labelBuang={t.padamAmalan(a.nama)}>{a.nama}</TajukBahagian>
                  <BingkaiAmalan a={a}>
                    <KepalaAmalan a={a} siap={false} tajuk={t.tiadaJadualHari} subtajuk={a.jenis === 'jadual' ? teksJadual(a.jadual, bahasa) : t.belumBermula} />
                  </BingkaiAmalan>
                </section>
              ) : (
                <section key={`${a.id}-${dipilih}`}>
                  <TajukBahagian a={a} Ikon={IKON_JENIS[a.jenis]} lalai={adalahLalai(a)} onBuang={adalahLalai(a) ? undefined : () => setSahPadam(a)} labelBuang={t.padamAmalan(a.nama)}>{a.nama}</TajukBahagian>
                  <BarisAmalan
                    a={a}
                    s={dipilih}
                    hariIni={hariIni}
                    log={log[a.id] ?? {}}
                    onTulis={isi => tulis(a, dipilih, isi)}
                    onUbah={ubah => ubahAmalan(a, ubah)}
                  />
                </section>
              ))}
            </div>
          </motion.section>
          )}

          {tab === 'ringkasan' && (<>
          {/* ── Pencapaian ─────────────────────────────────────────── */}
          <motion.section variants={naikMasuk}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="paparan text-2xl">{t.pencapaian}</h2>
              <div className="flex items-center rounded-full bg-muted p-1">
                {(['minggu', 'bulan', 'tahun'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPaparan(p); setAnjakan(0); }}
                    className="group relative rounded-full px-4 py-1.5 text-sm"
                  >
                    {p === paparan && (
                      <motion.span layoutId="tabPaparan" className="absolute inset-0 rounded-full bg-card shadow-sm dark:bg-accent" transition={spring.susunAtur} />
                    )}
                    <span className={cn('relative', p === paparan ? 'font-semibold dark:text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground')}>{t.paparan[p]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1">
              <button aria-label={t.sebelum} onClick={() => setAnjakan(n => n + 1)} disabled={dari <= awalRekod} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25">
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-36 text-center text-sm tabular-nums">{tajukJulat(paparan, dari, hingga, bahasa)}</span>
              <button aria-label={t.selepas} onClick={() => setAnjakan(n => n - 1)} disabled={anjakan === 0} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25">
                <ChevronRight className="size-4" />
              </button>
            </div>

            {(() => {
              const semua = kira(keseluruhan);
              const jumlah = nilaian.reduce((acc, n) => {
                const k = kira(n.petak);
                return { perlu: acc.perlu + k.perlu, siap: acc.siap + k.siap };
              }, { perlu: 0, siap: 0 });
              const sasaran = senarai.find(a => a.jenis === 'sasaran');
              const baki = sasaran ? bakiSebelum(sasaran, log[sasaran.id] ?? {}, tambahHari(hariIni, 1), hariIni) : null;
              const stat: [React.ReactNode, string, number][] = [
                [<>{semua.siap}<span className="opacity-50"> / {semua.perlu}</span></>, t.statHariLengkap, 0],
                [`${jumlah.perlu ? Math.round((jumlah.siap / jumlah.perlu) * 100) : 0}%`, t.statKadar, 1],
              ];
              if (sasaran && baki !== null) stat.push([baki, t.statBaki(unitPapar(sasaran.unit, bahasa, baki)), 4]);
              return (
                <dl className={cn('mt-5 grid gap-2.5 sm:gap-3', stat.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                  {stat.map(([nilai, label, w]) => (
                    <div key={label} className={cn('rounded-3xl p-4 sm:p-5', palet(w).lembut)}>
                      <dd className={cn('angka-paparan text-3xl leading-none sm:text-4xl', palet(w).teks)}>{nilai}</dd>
                      <dt className="mt-2 text-xs leading-snug text-foreground/70 sm:text-sm">{label}</dt>
                    </div>
                  ))}
                </dl>
              );
            })()}

            {(() => {
              const semuaBaris = [
                { id: 'semua', nama: t.keseluruhan, petak: keseluruhan, amalan: null as Amalan | null, utama: true, warna: undefined as string | undefined, onUbah: undefined, onPadam: undefined, labelPadam: '' },
                ...nilaian.map(n => ({
                  id: n.a.id, nama: n.a.nama, petak: n.petak, amalan: n.a, utama: false,
                  warna: palet(warnaAmalan(n.a)).css as string | undefined,
                  onUbah: (() => setBorang({ asal: n.a })) as (() => void) | undefined,
                  onPadam: (adalahLalai(n.a) ? undefined : () => setSahPadam(n.a)) as (() => void) | undefined,
                  labelPadam: t.padamAmalan(n.a.nama),
                })),
              ];
              // Menekan hari dalam ringkasan membuka tab Hari ini pada tarikh itu.
              const pilih = (d: string) => { setDipilih(d); setTab('hariIni'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
              const ringkasan = (baris: (typeof semuaBaris)[number]) => {
                const { perlu, siap } = kira(baris.petak);
                const streak = baris.amalan ? berturut(baris.amalan, log[baris.amalan.id] ?? {}, hariIni) : 0;
                return (
                  <>
                    {perlu > 0 ? t.ringkas(siap, perlu) : t.belumRekod}
                    {streak > 1 && <span className="text-primary"> · {t.ringkasStreak(streak)}</span>}
                  </>
                );
              };

              // Tahun: 365 lajur tidak muat sebagai jadual, jadi setiap amalan
              // kekal dengan grid GitHub sendiri.
              if (paparan === 'tahun') {
                return (
                  <div className="kad mt-5 divide-y divide-border/50 px-5">
                    {semuaBaris.map(baris => (
                      <div key={baris.id} className="py-5">
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                          <h3 className={cn('flex items-center gap-1 font-medium', baris.utama && 'text-lg')}>
                            <button type="button" onClick={baris.onUbah} disabled={!baris.onUbah} className="text-left">{baris.nama}</button>
                            {baris.onPadam && (
                              <button type="button" onClick={baris.onPadam} aria-label={baris.labelPadam} className="rounded-full p-1 text-muted-foreground/50 hover:text-destructive">
                                <X className="size-4" />
                              </button>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground tabular-nums">{ringkasan(baris)}</p>
                        </div>
                        <GridAmalan paparan={paparan} dari={dari} hingga={hingga} petak={baris.petak} hariIni={hariIni} dipilih={dipilih} onPilih={pilih} warna={baris.warna} />
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="kad mt-5 p-5">
                  <MatriksAmalan
                    baris={semuaBaris.map(b => ({ ...b, ringkasan: ringkasan(b) }))}
                    dari={dari}
                    hingga={hingga}
                    hariIni={hariIni}
                    dipilih={dipilih}
                    onPilih={pilih}
                  />
                  <Legenda />
                </div>
              );
            })()}
          </motion.section>

          {/* ── Urus ───────────────────────────────────────────────── */}
          <motion.section variants={naikMasuk} className="mt-14 max-w-xl">
            <h2 className="paparan text-2xl">{t.amalanSaya}</h2>
            <ul className="kad mt-5 divide-y divide-border/50 px-4">
              {senarai.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <CipAmalan a={a} kecil />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate">{a.nama}</span>
                      {adalahLalai(a) && <LencanaLalai />}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.jenis === 'sasaran' && t.sehari(a.sasaran, unitPapar(a.unit, bahasa, a.sasaran))}
                      {a.jenis === 'zikir' && t.zikirWaktu(a.item?.length ?? 0)}
                      {a.jenis === 'solat' && t.limaWaktu}
                      {a.jenis === 'jadual' && teksJadual(a.jadual, bahasa)}
                    </p>
                  </div>
                  <button aria-label={t.naik} disabled={i === 0} onClick={() => alihAmalan(i, -1)} className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowUp className="size-4" /></button>
                  <button aria-label={t.turun} disabled={i === senarai.length - 1} onClick={() => alihAmalan(i, 1)} className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowDown className="size-4" /></button>
                  <button aria-label={t.ubah(a.nama)} onClick={() => setBorang({ asal: a })} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                  {adalahLalai(a) ? (
                    <span className="w-7" aria-hidden />
                  ) : (
                    <button aria-label={t.padamAmalan(a.nama)} onClick={() => setSahPadam(a)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                  )}
                </li>
              ))}
            </ul>
          </motion.section>
          </>)}
        </>
      )}

      <Dialog open={sahPadam !== null} onOpenChange={b => !b && setSahPadam(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="paparan text-xl font-normal">{sahPadam && t.pastiPadamTajuk(sahPadam.nama)}</DialogTitle>
          <DialogDescription>{t.pastiPadamTeks}</DialogDescription>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setSahPadam(null)} className="rounded-full bg-muted px-4 py-2 text-sm font-medium">{t.batal}</button>
            <button type="button" onClick={() => sahPadam && padamAmalan(sahPadam)} className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white">{t.padam}</button>
          </div>
        </DialogContent>
      </Dialog>

      <BorangAmalan
        buka={borang !== null}
        asal={borang?.asal ?? null}
        hariIni={hariIni}
        onTutup={() => setBorang(null)}
        onSimpan={simpanAmalan}
        onPadam={borang?.asal && adalahLalai(borang.asal) ? undefined : () => padamAmalan()}
      />
    </motion.main>
  );
}

function Legenda() {
  const l = useTeks(TEKS).legenda;
  const item: [Petak, string][] = [
    [{ k: 'penuh' }, l.lengkap],
    [{ k: 'separa', kadar: 0.5 }, l.sebahagian],
    [{ k: 'qada', dilunas: 1 }, l.qada],
    [{ k: 'terlepas' }, l.terlepas],
    [{ k: 'kosong' }, l.belum],
    [{ k: 'tiada' }, l.tiada],
  ];
  return (
    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/50 pt-4 text-xs text-muted-foreground">
      {item.map(([p, n]) => (
        <li key={n} className="flex items-center gap-1.5">
          <span className={cn('size-3 rounded-[3px]', kelasPetak(p))} style={gayaPetak(p)} />
          {n}
        </li>
      ))}
    </ul>
  );
}

/** Tajuk bahagian bagi setiap amalan dalam senarai Hari ini. */
/** Pil kecil menandakan amalan lalai (Solat, Zikir, Al-Quran) — sebab ia tiada butang buang. */
function LencanaLalai() {
  const t = useTeks(TEKS);
  return (
    <span title={t.lalaiNota} className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
      {t.lalai}
    </span>
  );
}

function TajukBahagian({ Ikon, children, onBuang, labelBuang, lalai, a }: { Ikon: React.ComponentType<{ className?: string }>; children: React.ReactNode; onBuang?: () => void; labelBuang?: string; lalai?: boolean; a?: Amalan }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-2xl', paletKad(a).lembut, paletKad(a).teks)}>
        <Ikon className="size-[18px]" />
      </span>
      <h3 className="paparan min-w-0 truncate text-xl">{children}</h3>
      {lalai && <LencanaLalai />}
      <span className="flex-1" />
      {/* Buang amalan terus dari senarai; dialog pengesahan menyusul. */}
      {onBuang && (
        <button type="button" onClick={onBuang} aria-label={labelBuang} className="rounded-full p-2 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-destructive">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/* ── Bingkai kad amalan ─────────────────────────────────────────────
   Setiap jenis amalan menggunakan bingkai yang sama — warna lembut amalan
   itu, bulatan status besar di kiri (ikon amalan, menjadi ✓ apabila
   selesai), nama dan baris status, dan tindakan di kanan — supaya amalan
   baharu sentiasa kelihatan sekeluarga dengan yang sedia ada. */

/** Kad putih biasa; bertukar ke rona tema yang lembut apabila amalan selesai —
    hari yang lengkap kelihatan "terisi" warna. */
function BingkaiAmalan({ a, children, siap }: { a?: Amalan; siap?: boolean; children: React.ReactNode }) {
  const p = paletKad(a);
  return (
    <div
      className={cn('rounded-3xl border p-4 shadow-[var(--bayang-kad)] transition-colors duration-500', siap ? (p === PALET_UTAMA ? 'bg-accent/70' : p.lembut) : 'border-border/70 bg-card')}
      style={siap ? { borderColor: `oklch(from ${p.css} l c h / 0.35)` } : undefined}
    >
      {children}
    </div>
  );
}

function KepalaAmalan({
  a, siap, tajuk, subtajuk, kanan, onBulatan, labelBulatan,
}: {
  a: Amalan;
  siap: boolean;
  /** Tajuk kad — status amalan; nama amalan sudah ada pada tajuk bahagian. */
  tajuk?: React.ReactNode;
  subtajuk: React.ReactNode;
  kanan?: React.ReactNode;
  /** Jika ada, bulatan menjadi butang untuk menanda selesai. */
  onBulatan?: () => void;
  labelBulatan?: string;
}) {
  const p = paletKad(a);
  const Ikon = IKON_JENIS[a.jenis];
  useGetarSiap(siap);
  const isi = (
    <>
      {siap ? <Check className="size-7" strokeWidth={3} /> : <Ikon className="size-6" />}
    </>
  );
  const kelas = cn(
    'relative flex size-14 shrink-0 items-center justify-center rounded-full transition-all',
    // Isian pastel: tanda ✓ dalam warna amalan yang lebih pekat supaya jelas.
    siap ? cn('shadow-sm', p.teks) : cn('border-[3px] bg-card', p.teks),
    onBulatan && 'active:scale-90'
  );
  const gaya = siap ? { background: gradien(p.css) } : { borderColor: `oklch(from ${p.css} l c h / 0.35)` };
  return (
    <div className="flex items-center gap-3">
      {onBulatan ? (
        <button type="button" onClick={onBulatan} aria-pressed={siap} aria-label={labelBulatan} className={kelas} style={gaya}>{isi}</button>
      ) : (
        <span className={kelas} style={gaya}>{isi}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold leading-tight">{tajuk ?? a.nama}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtajuk}</p>
      </div>
      {kanan}
    </div>
  );
}

/** Pengira −/+ dalam pil putih, seperti kad Al-Quran. */
function Pengira({ nilai, onTukar, warnaTeks, labelTolak, labelTambah }: { nilai: number; onTukar: (n: number) => void; warnaTeks: string; labelTolak: string; labelTambah: string }) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-border/60 bg-card shadow-sm">
      <button type="button" aria-label={labelTolak} disabled={nilai === 0} onClick={() => onTukar(Math.max(0, nilai - 1))} className="flex size-10 items-center justify-center rounded-full disabled:opacity-30">
        <Minus className="size-4" />
      </button>
      <span className="angka-paparan w-7 text-center text-xl">{nilai}</span>
      <button type="button" aria-label={labelTambah} onClick={() => onTukar(nilai + 1)} className={cn('flex size-10 items-center justify-center rounded-full', warnaTeks)}>
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ── Satu baris amalan untuk hari dipilih ─────────────────────────── */

function BarisAmalan({
  a, s, hariIni, log, onTulis, onUbah,
}: {
  a: Amalan;
  s: string;
  hariIni: string;
  log: LogTahun;
  onTulis: (isi: LogHari) => void;
  onUbah: (ubah: Partial<Amalan>) => void;
}) {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const hari = log[s];
  const p = paletKad(a);

  if (adalahQuran(a)) {
    return <KadQuran a={a} s={s} hariIni={hariIni} log={log} onTulis={onTulis} onUbah={onUbah} tunjukNama={false} seragam />;
  }

  if (a.jenis === 'sasaran') {
    const sasaran = a.sasaran ?? 1;
    const baki = bakiSebelum(a, log, s, hariIni);
    const perlu = sasaran + baki;
    const dibuat = hari?.jumlah ?? 0;
    const set = (n: number) => onTulis({ jumlah: Math.max(0, n) });
    return (
      <BingkaiAmalan a={a} siap={dibuat >= perlu}>
        <KepalaAmalan
          a={a}
          siap={dibuat >= perlu}
          tajuk={dibuat >= perlu ? (baki > 0 ? t.bakiDilunas(baki) : t.tercapai) : t.belumSelesai}
          subtajuk={dibuat >= perlu ? (
            <>{t.sasaran(sasaran, unitPapar(a.unit, bahasa, sasaran))}</>
          ) : baki > 0 ? (
            <>{t.perlu(perlu, unitPapar(a.unit, bahasa, perlu))}{sasaran} + <span className="text-amaran">{t.baki(baki)}</span></>
          ) : (
            <>{t.sasaran(sasaran, unitPapar(a.unit, bahasa, sasaran))}</>
          )}
          kanan={<Pengira nilai={dibuat} onTukar={set} warnaTeks={p.teks} labelTolak={t.tolak} labelTambah={t.tambah} />}
        />
        {/* Bar kemajuan ke arah jumlah perlu hari ini, termasuk baki. */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(dibuat / perlu, 1) * 100}%`, background: baki > 0 && dibuat > sasaran ? 'var(--amaran)' : p.css }} />
        </div>
      </BingkaiAmalan>
    );
  }

  if (a.jenis === 'jadual') {
    const selesai = !!hari?.selesai;
    const syawal = a.jadual?.jenis === 'syawal' ? kiraSyawal(log, s) : null;
    return (
      <BingkaiAmalan a={a} siap={selesai}>
        <KepalaAmalan
          a={a}
          siap={selesai}
          onBulatan={() => onTulis({ selesai: !selesai })}
          labelBulatan={a.nama}
          tajuk={selesai ? t.selesai : t.belumSelesai}
          subtajuk={syawal !== null ? t.syawalIni(syawal, SASARAN_SYAWAL) : teksJadual(a.jadual, bahasa)}
        />
      </BingkaiAmalan>
    );
  }

  if (a.jenis === 'solat') {
    const ditunai = hari?.solat ?? [];
    const togol = (sl: Slot) => onTulis({ solat: ditunai.includes(sl) ? ditunai.filter(x => x !== sl) : SLOT.filter(x => x === sl || ditunai.includes(x)) });
    return (
      <BingkaiAmalan a={a} siap={ditunai.length === SLOT.length}>
        <KepalaAmalan a={a} siap={ditunai.length === SLOT.length} tajuk={<span className="tabular-nums">{t.solatSiap(ditunai.length)}</span>} subtajuk={t.limaWaktu} />
        {/* Satu butang bagi setiap waktu, dalam warna waktu itu di seluruh aplikasi. */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {SLOT.map(sl => {
            const ada = ditunai.includes(sl);
            const w = PALET_UTAMA;
            return (
              <button
                key={sl}
                type="button"
                onClick={() => togol(sl)}
                aria-label={t.tandaSolat(LABEL_SLOT[sl])}
                aria-pressed={ada}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-medium transition-all active:scale-95',
                  ada ? cn(w.pekat, 'text-white') : cn(w.lembut, w.teks)
                )}
              >
                <span className={cn('flex size-6 items-center justify-center rounded-full', ada ? 'bg-white/25' : 'border-2 border-current/40')}>
                  {ada && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {LABEL_SLOT[sl]}
              </button>
            );
          })}
        </div>
      </BingkaiAmalan>
    );
  }

  return <BarisZikir a={a} s={s} hariIni={hariIni} hari={hari} onTulis={onTulis} onUbah={onUbah} />;
}

function BarisZikir({
  a, s, hariIni, hari: hariLog, onTulis, onUbah,
}: {
  a: Amalan;
  s: string;
  hariIni: string;
  hari: LogHari | undefined;
  onTulis: (isi: LogHari) => void;
  onUbah: (ubah: Partial<Amalan>) => void;
}) {
  const t = useTeks(TEKS);
  const item = a.item ?? [];
  const n = item.length;
  // Hari ini dinilai dengan senarai semasa: jika zikir ditambah selepas
  // ditanda, waktu itu sepatutnya kembali belum lengkap. Hari lepas kekal
  // dengan bilangan yang direkod ketika itu.
  const hari = s === hariIni && hariLog ? { ...hariLog, n } : hariLog;
  const [buka, setBuka] = useState<Slot | null>(() => (s === hariIni ? slotSekarang() : null));
  const [ubah, setUbah] = useState(false);
  const [baru, setBaru] = useState('');
  /** Item yang sedang menunggu ketikan kedua untuk dibuang. */
  const [sediaBuang, setSediaBuang] = useState<string | null>(null);
  const sekarang = s === hariIni ? slotSekarang() : null;
  const siapSlot = SLOT.filter(sl => slotLengkap(hari, sl, n)).length;

  const tulisSlot = (sl: Slot, ids: string[]) => {
    const slot = Object.fromEntries(SLOT.map(x => [x, hari?.slot?.[x] ?? []])) as Record<Slot, string[]>;
    // Hanya id yang masih dalam senarai disimpan, supaya kiraan tidak
    // melebihi bilangan item selepas zikir dibuang.
    slot[sl] = ids.filter(id => item.some(it => it.id === id));
    onTulis({ slot, n });
  };

  const simpanSenarai = (senarai: ItemZikir[]) => {
    onUbah({ item: senarai });
    // Rekod hari ini mengikut senarai baharu juga, supaya grid pencapaian
    // bersetuju dengan kad ini.
    if (s === hariIni && hariLog?.slot) {
      const slot = Object.fromEntries(SLOT.map(x => [x, (hariLog.slot?.[x] ?? []).filter(id => senarai.some(it => it.id === id))]));
      onTulis({ slot, n: senarai.length });
    }
  };
  const tambah = () => {
    const nama = baru.trim();
    if (!nama) return;
    simpanSenarai([...item, { id: idBaru(), nama }]);
    setBaru('');
  };

  const p = paletKad(a);

  return (
    <BingkaiAmalan a={a} siap={siapSlot === SLOT.length}>
      <KepalaAmalan
        a={a}
        siap={siapSlot === SLOT.length}
        tajuk={<span className="tabular-nums">{t.waktu(siapSlot)}</span>}
        subtajuk={t.selepasSetiap}
        kanan={<button
          type="button"
          onClick={() => setUbah(v => !v)}
          aria-label={t.ubahSenarai}
          aria-pressed={ubah}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            ubah ? cn(p.pekat, 'text-white') : cn('bg-card shadow-sm', p.teks)
          )}
        >
          {ubah ? <><Check className="size-4" /> {t.siapUbah}</> : <Pencil className="size-4" />}
        </button>}
      />

      {ubah ? (
        /* Senarai diubah terus di sini. Setiap perubahan disimpan serta-merta;
           rekod hari lepas tidak terjejas kerana setiap hari menyimpan
           bilangan zikirnya sendiri. */
        <div className="mt-4">
          <ul className="divide-y divide-border/40 rounded-2xl bg-muted/50 px-3">
            {item.map((it, i) => (
              <li key={it.id} className="flex items-center gap-1 py-1">
                <input
                  defaultValue={it.nama}
                  maxLength={60}
                  aria-label={it.nama}
                  onBlur={e => {
                    const nama = e.target.value.trim();
                    if (nama && nama !== it.nama) simpanSenarai(item.map(x => x.id === it.id ? { ...x, nama } : x));
                    else e.target.value = it.nama;
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
                />
                <button type="button" aria-label={t.naik} disabled={i === 0} onClick={() => { const x = [...item]; [x[i - 1], x[i]] = [x[i], x[i - 1]]; simpanSenarai(x); }} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowUp className="size-4" /></button>
                <button type="button" aria-label={t.turun} disabled={i === item.length - 1} onClick={() => { const x = [...item]; [x[i], x[i + 1]] = [x[i + 1], x[i]]; simpanSenarai(x); }} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowDown className="size-4" /></button>
                <button type="button" aria-label={t.buangZikir(it.nama)} disabled={item.length === 1} onClick={() => simpanSenarai(item.filter(x => x.id !== it.id))} className="rounded-full p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-25"><X className="size-4" /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={baru}
              onChange={e => setBaru(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); tambah(); } }}
              placeholder={t.zikirBaru}
              maxLength={60}
              autoFocus
              className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
            <button type="button" onClick={tambah} disabled={!baru.trim()} aria-label={t.tambah} className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40', p.pekat)}>
              <Plus className="size-5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Lima segmen, satu bagi setiap waktu — sekali pandang berapa yang tinggal. */}
          <div className="mt-4 flex gap-1.5">
            {SLOT.map(sl => (
              <span key={sl} className="h-2 flex-1 rounded-full bg-muted" style={slotLengkap(hari, sl, n) ? { background: p.css } : (hari?.slot?.[sl]?.length ?? 0) > 0 ? { background: `oklch(from ${p.css} l c h / 0.4)` } : undefined} />
            ))}
          </div>
          <ul className="mt-3 divide-y divide-border/40">
            {SLOT.map(sl => {
              const ditanda = hari?.slot?.[sl] ?? [];
              const penuh = slotLengkap(hari, sl, n);
              const terbuka = buka === sl;
              return (
                <li key={sl}>
                  <div className="flex items-center gap-3">
                    {/* Bulatan menanda semua zikir waktu itu sekali gus;
                        selebihnya baris membuka senarai. */}
                    <button
                      type="button"
                      onClick={() => tulisSlot(sl, penuh ? [] : item.map(it => it.id))}
                      aria-label={t.tandaWaktu(LABEL_SLOT[sl])}
                      aria-pressed={penuh}
                      className="-m-1.5 rounded-full p-1.5 transition-transform active:scale-90"
                    >
                      <TandaBulat aktif={penuh} separa={!penuh && ditanda.length > 0} warna={p.css} />
                    </button>
                    <button type="button" onClick={() => setBuka(terbuka ? null : sl)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
                      <span className="flex-1 text-sm">
                        {LABEL_SLOT[sl]}
                        {sl === sekarang && <span className="ml-2 text-xs text-primary">{t.sekarang}</span>}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">{Math.min(ditanda.length, n)} / {n}</span>
                      <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', terbuka && 'rotate-180')} />
                    </button>
                  </div>
                  {terbuka && (
                    <div className="pb-3 pl-9">
                      <ul>
                        {item.map(it => {
                          const ada = ditanda.includes(it.id);
                          return (
                            <li key={it.id} className="flex items-center gap-2">
                              <button
                                onClick={() => tulisSlot(sl, ada ? ditanda.filter(x => x !== it.id) : [...ditanda, it.id])}
                                className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left text-sm"
                              >
                                <TandaKotak aktif={ada} warna={p.css} />
                                <span className={cn(ada && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{it.nama}</span>
                              </button>
                              {/* Buang dari senarai terus di sini; ketikan kedua mengesahkan
                                  supaya ibu jari yang tersasar tidak memadam zikir. */}
                              {item.length > 1 && (
                                sediaBuang === it.id ? (
                                  <button
                                    type="button"
                                    onClick={() => { setSediaBuang(null); simpanSenarai(item.filter(x => x.id !== it.id)); }}
                                    onBlur={() => setSediaBuang(null)}
                                    autoFocus
                                    className="shrink-0 rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-white"
                                  >
                                    {t.pastiBuang}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSediaBuang(it.id)}
                                    aria-label={t.buangZikir(it.nama)}
                                    className="shrink-0 rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                                  >
                                    <X className="size-4" />
                                  </button>
                                )
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        onClick={() => tulisSlot(sl, penuh ? [] : item.map(it => it.id))}
                        className={cn('mt-1 text-sm font-medium hover:underline', p.teks)}
                      >
                        {penuh ? t.kosongkan : t.tandaSemua}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {/* Jalan pintas yang jelas untuk menambah zikir — membuka mod ubah
              terus pada medan tambah. */}
          <button
            type="button"
            onClick={() => setUbah(true)}
            className={cn('mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed py-2.5 text-sm font-semibold transition-colors hover:bg-accent', p.teks)}
            style={{ borderColor: `oklch(from ${p.css} l c h / 0.4)` }}
          >
            <Plus className="size-4" /> {t.tambahZikir}
          </button>
        </>
      )}
    </BingkaiAmalan>
  );
}

function TandaBulat({ aktif, separa, besar, warna = 'var(--primary)' }: { aktif: boolean; separa?: boolean; besar?: boolean; warna?: string }) {
  useGetarSiap(aktif);
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        besar ? 'size-10' : 'size-6',
        aktif ? 'border-transparent text-white' : 'border-border'
      )}
      style={aktif ? { background: warna } : separa ? { borderColor: `oklch(from ${warna} l c h / 0.6)` } : undefined}
    >
      {aktif && <Check className={cn(besar ? 'size-5' : 'size-3.5')} strokeWidth={3} />}
      {!aktif && separa && <span className="size-2 rounded-full" style={{ background: warna }} />}
    </span>
  );
}

function TandaKotak({ aktif, warna = 'var(--primary)' }: { aktif: boolean; warna?: string }) {
  useGetarSiap(aktif);
  return (
    <span
      className={cn('relative flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors', aktif ? 'border-transparent text-white' : 'border-border')}
      style={aktif ? { background: warna } : undefined}
    >
      {aktif && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}
