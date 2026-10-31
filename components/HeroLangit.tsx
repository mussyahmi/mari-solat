'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { BookOpen, Check, Moon } from 'lucide-react';
import { useTeks } from '@/components/BahasaProvider';
import { useAmalanHariIni } from '@/components/useAmalanHariIni';
import { adalahQuran, LABEL_SLOT, SLOT, slotLengkap, type Slot } from '@/lib/amalan';
import { fasaPada, parseTime, type Fasa, type Waktu, type WaktuSolat } from '@/lib/solat';
import { palet, WARNA_WAKTU } from '@/lib/aksen';

const ms = {
  dalam: (w: string, baki: string) => `${w} dalam ${baki}`,
  jam: 'j',
  minit: 'm',
  saat: 's',
  sekejap: 'sebentar lagi',
  pada: (masa: string) => `pada ${masa}`,
  tukar: 'tukar',
  solat: (n: number) => `${n}/5 solat`,
  zikir: (n: number) => `${n}/5 zikir`,
  quran: 'Quran',
  tandaSolat: (w: string) => `Tandakan solat ${w}`,
  gagal: 'Rekod tidak dapat disimpan.',
  belumMasuk: (w: string) => `Waktu ${w} belum masuk.`,
  bertukar: (baki: string) => `bertukar dalam ${baki}`,
  sepertiga: '⅓ malam',
  sepertigaLabel: (m: string, t: string) => `Satu pertiga malam: ${m} hingga ${t}`,
};
const en: typeof ms = {
  dalam: (w, baki) => `${w} in ${baki}`,
  jam: 'h',
  minit: 'm',
  saat: 's',
  sekejap: 'any moment',
  pada: masa => `at ${masa}`,
  tukar: 'change',
  solat: n => `${n}/5 solat`,
  zikir: n => `${n}/5 zikir`,
  quran: 'Quran',
  tandaSolat: w => `Mark ${w} prayed`,
  gagal: "Couldn't save your record.",
  belumMasuk: w => `It isn't ${w} time yet.`,
  bertukar: baki => `changes in ${baki}`,
  sepertiga: 'last ⅓',
  sepertigaLabel: (m, t) => `Last third of the night: ${m} to ${t}`,
};
const TEKS = { ms, en };

/** Langit mengikut fasa hari — ilustrasi, jadi warnanya tetap dan bukan token tema. */
const LANGIT: Record<Fasa, string> = {
  malam: 'linear-gradient(160deg, #1e1b4b 0%, #3b2a7a 55%, #6d3f9a 100%)',
  fajar: 'linear-gradient(160deg, #2e2a6e 0%, #6b4fa0 55%, #d987a8 100%)',
  subuh: 'linear-gradient(160deg, #4f5bd5 0%, #a77fd0 50%, #f6a8b8 100%)',
  syuruk: 'linear-gradient(160deg, #4b8de8 0%, #9fb7e6 50%, #ffd27a 100%)',
  siang: 'linear-gradient(160deg, #2f7be0 0%, #8fa9b8 55%, #f2c94c 100%)',
  petang: 'linear-gradient(160deg, #3a7bd5 0%, #b0a48a 55%, #f5b041 100%)',
  maghrib: 'linear-gradient(160deg, #5b3fa8 0%, #e0607e 55%, #ffad66 100%)',
};

const W = 340;
const H = 128;
const UFUK = 78;
const AMP = 52;
const PAD = 18;
const LIMA: Slot[] = [...SLOT];

/**
 * Hero halaman utama: berapa lama lagi ke waktu seterusnya, dan perjalanan
 * matahari hari ini dengan setiap waktu solat ditanda di atasnya.
 *
 * Ketinggian matahari dimodelkan sebagai lengkung sinus yang naik pada
 * syuruk dan terbenam pada maghrib — cukup tepat untuk menunjukkan bahawa
 * Subuh dan Isyak berlaku dalam gelap, tanpa kiraan astronomi sebenar.
 * Menekan waktu yang sudah masuk menandanya sebagai sudah ditunaikan dalam
 * amalan "Solat 5 waktu", jika ada.
 */
export default function HeroLangit({
  waktu, seterusnya, masa, kini, zon, kategori, malam, paparan,
}: {
  waktu: WaktuSolat;
  seterusnya?: Waktu | null;
  masa?: Date | null;
  kini: Date;
  zon: string | null;
  /** Kategori waktu semasa (Fadhilat, Jawaz, …) dan bila ia bertukar. */
  kategori: { nama: string; tamat: Date | null } | null;
  /** Satu pertiga malam yang akan datang (atau sedang berjalan). */
  malam: { mula: Date; tamat: Date } | null;
  /**
   * Mod paparan untuk semalam dan esok: tiada kiraan detik, matahari atau
   * tanda solat — hanya jadual hari itu pada lengkung yang sama.
   */
  paparan?: { tajuk: string; keterangan: string; fasa: Fasa };
}) {
  const t = useTeks(TEKS);
  const { amalan, log, tulis } = useAmalanHariIni();

  const statik = !!paparan || !seterusnya || !masa;
  // Lengkung hanya memerlukan jarak relatif antara waktu, jadi tarikh asas
  // tidak penting dalam mod paparan.
  const asas = new Date(masa ?? kini);
  const jam = (w: Waktu) => parseTime(waktu[w], asas).getTime();
  const subuh = jam('subuh');
  const syuruk = jam('syuruk');
  const maghrib = jam('maghrib');
  const isyak = jam('isyak');
  const mula = subuh - 90 * 60_000;
  const tamat = isyak + 90 * 60_000;

  const x = (ms: number) => PAD + ((ms - mula) / (tamat - mula)) * (W - PAD * 2);
  const y = (ms: number) => UFUK - AMP * Math.sin((Math.PI * (ms - syuruk)) / (maghrib - syuruk));

  let laluan = '';
  for (let i = 0; i <= 90; i++) {
    const ms = mula + ((tamat - mula) * i) / 90;
    laluan += `${i ? 'L' : 'M'}${x(ms).toFixed(1)} ${y(ms).toFixed(1)}`;
  }

  // Baki dalam jam dan minit sahaja — tajuk, bukan jam randik.
  const jamMinit = (ms: number) => {
    const j = Math.floor(ms / 3_600_000);
    const m = Math.ceil((ms % 3_600_000) / 60_000);
    return m === 60 ? `${j + 1}${t.jam}` : `${j ? `${j}${t.jam} ` : ''}${m}${t.minit}`;
  };
  const bakiMs = masa ? Math.max(masa.getTime() - kini.getTime(), 0) : 0;
  // Tajuk berdetik setiap saat; cip kategori kekal jam dan minit sahaja.
  const jamMinitSaat = (ms: number) => {
    const j = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const sa = Math.floor((ms % 60_000) / 1000);
    return `${j ? `${j}${t.jam} ` : ''}${j || m ? `${m}${t.minit} ` : ''}${String(sa).padStart(j || m ? 2 : 1, '0')}${t.saat}`;
  };
  const bakiTeks = bakiMs < 1000 ? t.sekejap : jamMinitSaat(bakiMs);
  const fmt = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const namaSeterusnya = seterusnya ? seterusnya[0].toUpperCase() + seterusnya.slice(1) : '';

  const fasa = paparan?.fasa ?? fasaPada(waktu, kini).fasa;
  const kiniMs = kini.getTime();
  const nampakMatahari = !statik && kiniMs >= mula && kiniMs <= tamat && parseTime(waktu.subuh, kini).toDateString() === asas.toDateString();
  const siang = kiniMs > syuruk && kiniMs < maghrib;

  // Tanda solat dan ringkasan amalan hanya untuk hari ini.
  const amalanSolat = statik ? undefined : amalan.find(a => a.jenis === 'solat');
  const amalanZikir = amalan.find(a => a.jenis === 'zikir');
  const amalanQuran = amalan.find(adalahQuran);
  const ditunai = (amalanSolat && log[amalanSolat.id]?.solat) ?? [];

  const togolSolat = (sl: Slot) => {
    if (!amalanSolat) return;
    if (jam(sl) > kiniMs) { toast(t.belumMasuk(LABEL_SLOT[sl])); return; }
    const baru = ditunai.includes(sl) ? ditunai.filter(x => x !== sl) : LIMA.filter(x => x === sl || ditunai.includes(x));
    tulis(amalanSolat, { solat: baru }).catch(() => toast.error(t.gagal));
  };

  const cip: React.ReactNode[] = [];
  if (amalanSolat) cip.push(t.solat(ditunai.length));
  if (amalanZikir) {
    const n = amalanZikir.item?.length ?? 0;
    const hari = log[amalanZikir.id];
    cip.push(t.zikir(SLOT.filter(sl => slotLengkap(hari ? { ...hari, n } : hari, sl, n)).length));
  }
  if (amalanQuran) {
    const siap = (log[amalanQuran.id]?.jumlah ?? 0) >= (amalanQuran.sasaran ?? 1);
    cip.push(<><BookOpen className="size-3.5" /> {t.quran} {siap && <Check className="size-3.5" strokeWidth={3} />}</>);
  }

  const namaZon = zon?.split(' · ').slice(1).join(' · ') || zon;

  return (
    <section className="relative overflow-hidden rounded-3xl p-4 text-white shadow-[var(--bayang-kad)] sm:p-6" style={{ background: LANGIT[fasa] }}>
      <h1 className="tabular text-[1.75rem] font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
        {paparan ? paparan.tajuk : t.dalam(namaSeterusnya, bakiTeks)}
      </h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-white/90 sm:text-base">
        <span className="tabular">{paparan ? paparan.keterangan : seterusnya ? t.pada(waktu[seterusnya]) : ''}</span>
        {/* Zon dan pautan tukar untuk hari ini sahaja; hari lain sudah ada kad tarikh dan zon di bawah. */}
        {!statik && (
          <>
            {namaZon && <><span aria-hidden>·</span><span className="max-w-[16ch] truncate sm:max-w-none">{namaZon}</span></>}
            <span aria-hidden>·</span>
            <Link href="/tetapan" className="underline underline-offset-4">{t.tukar}</Link>
          </>
        )}
      </p>

      {/* Dua fakta masa hari ini sebagai cip, bukan dilukis pada lengkung —
          lengkung kekal untuk waktu solat sahaja. */}
      {!statik && (kategori || malam) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {kategori && (
            <Link href="/kategori-solat" className="inline-flex items-center gap-2 rounded-full bg-white/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/35">
              <span className="size-2 rounded-full bg-white" aria-hidden />
              {kategori.nama}
              {kategori.tamat && (
                <span className="font-normal opacity-90">· {t.bertukar(jamMinit(Math.max(kategori.tamat.getTime() - kiniMs, 0)))}</span>
              )}
            </Link>
          )}
          {malam && (
            <Link
              href="/satu-pertiga-malam"
              aria-label={t.sepertigaLabel(fmt(malam.mula), fmt(malam.tamat))}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/35"
            >
              <Moon className="size-3.5" />
              {t.sepertiga} <span className="tabular font-normal opacity-90">{fmt(malam.mula)}</span>
            </Link>
          )}
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className={`mx-auto w-full max-w-xl overflow-visible ${statik ? 'mt-7' : 'mt-1'}`} role="img" aria-label={paparan ? paparan.tajuk : t.dalam(namaSeterusnya, bakiTeks)}>
        <defs>
          <clipPath id="atasUfuk"><rect x="0" y="0" width={W} height={UFUK} /></clipPath>
          <clipPath id="bawahUfuk"><rect x="0" y={UFUK} width={W} height={H} /></clipPath>
          <radialGradient id="cahaya"><stop offset="0" stopColor="#ffe27a" stopOpacity=".7" /><stop offset="1" stopColor="#ffe27a" stopOpacity="0" /></radialGradient>
        </defs>
        <line x1={PAD - 6} x2={W - PAD + 6} y1={UFUK} y2={UFUK} stroke="#fff" strokeOpacity=".45" strokeWidth="1" />
        <path d={laluan} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" clipPath="url(#atasUfuk)" />
        <path d={laluan} fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" clipPath="url(#bawahUfuk)" />

        {nampakMatahari && (siang ? (
          <g>
            <circle cx={x(kiniMs)} cy={y(kiniMs)} r="18" fill="url(#cahaya)" />
            <circle cx={x(kiniMs)} cy={y(kiniMs)} r="7.5" fill="#ffe27a" />
          </g>
        ) : (
          <g>
            <mask id="bulanSabit">
              <rect x="0" y="0" width={W} height={H} fill="#fff" />
              <circle cx={x(kiniMs) + 3.4} cy={y(kiniMs) - 2.6} r="6.2" fill="#000" />
            </mask>
            <circle cx={x(kiniMs)} cy={y(kiniMs)} r="8" fill="#fff" mask="url(#bulanSabit)" />
          </g>
        ))}

        {LIMA.map(sl => {
          const ms = jam(sl);
          const cx = x(ms);
          const cy = y(ms);
          // Maghrib jatuh tepat di ufuk dan Isyak rapat selepasnya; labelnya
          // dipisahkan ke atas dan bawah supaya tidak bertindih.
          const atas = sl === 'maghrib' || (sl !== 'isyak' && cy <= UFUK);
          const sudah = ditunai.includes(sl);
          const masuk = ms <= kiniMs;
          const w = palet(WARNA_WAKTU[sl]);
          return (
            <g
              key={sl}
              role={amalanSolat ? 'button' : undefined}
              aria-label={amalanSolat ? t.tandaSolat(LABEL_SLOT[sl]) : LABEL_SLOT[sl]}
              aria-pressed={amalanSolat ? sudah : undefined}
              tabIndex={amalanSolat ? 0 : undefined}
              onClick={() => togolSolat(sl)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togolSolat(sl); } }}
              style={{ cursor: amalanSolat ? 'pointer' : undefined }}
            >
              <circle cx={cx} cy={cy} r="16" fill="transparent" />
              <circle
                cx={cx} cy={cy} r="8"
                fill={sudah ? w.css : statik ? '#ffffff2e' : masuk ? '#ffffff40' : '#ffffff14'}
                stroke="#fff" strokeWidth="2"
              />
              {sudah && <path d={`M${cx - 3.4} ${cy} l2.4 2.4 4.4 -4.8`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
              <text x={cx} y={atas ? cy - 13 : cy + 21} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" style={{ paintOrder: 'stroke', stroke: '#00000022', strokeWidth: 2 }}>
                {LABEL_SLOT[sl]}
              </text>

            </g>
          );
        })}
      </svg>

      {!statik && cip.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cip.map((c, i) => (
            <Link key={i} href="/amalan" className="flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/35">
              {c}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
