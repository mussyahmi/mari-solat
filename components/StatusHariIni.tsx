'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Check, ListChecks, Sparkles } from 'lucide-react';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { useAmalanHariIni } from '@/components/useAmalanHariIni';
import { palet, WARNA_WAKTU } from '@/lib/aksen';
import { adalahQuran, LABEL_SLOT, SLOT, slotLengkap, unitPapar, type Slot } from '@/lib/amalan';
import { parseTime, type WaktuSolat } from '@/lib/solat';
import { namaSurah, pautanAyat } from '@/lib/surah';
import { cn } from '@/lib/utils';

const ms = {
  tajuk: 'Status hari ini',
  solat: 'Solat',
  zikir: 'Zikir selepas solat',
  quran: 'Al-Quran',
  belumDibaca: 'Belum dibaca',
  terakhir: 'Terakhir',
  buka: 'Buka',
  kemasKini: 'Kemas kini di Jejak Ibadah',
  logMasuk: 'Log masuk untuk menjejak solat, zikir dan bacaan Al-Quran anda.',
  mula: 'Buka Jejak Ibadah',
};
const en: typeof ms = {
  tajuk: "Today's status",
  solat: 'Solat',
  zikir: 'Zikir after solat',
  quran: 'Quran',
  belumDibaca: 'Not read yet',
  terakhir: 'Last read',
  buka: 'Open',
  kemasKini: 'Update in Ibadah Tracker',
  logMasuk: 'Sign in to track your solat, zikir and Quran reading.',
  mula: 'Open Ibadah Tracker',
};
const TEKS = { ms, en };

/** Waktu fardu yang sedang berjalan, untuk ditonjolkan. */
function semasa(waktu: WaktuSolat, kini: Date): Slot | null {
  const n = kini.getTime();
  const t = (w: Slot | 'syuruk') => parseTime(waktu[w], kini).getTime();
  if (n >= t('isyak')) return 'isyak';
  if (n >= t('maghrib')) return 'maghrib';
  if (n >= t('asar')) return 'asar';
  if (n >= t('zohor')) return 'zohor';
  if (n >= t('subuh') && n < t('syuruk')) return 'subuh';
  return null;
}

/**
 * Ringkasan ibadah hari ini di halaman utama — STATUS SAHAJA. Tiada butang
 * untuk menanda di sini; lencana dan titik hanya melaporkan, dan satu pautan
 * membawa ke Jejak Ibadah untuk mengemas kini.
 */
export default function StatusHariIni({ waktu, kini }: { waktu: WaktuSolat; kini: Date }) {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const { amalan, log, adaAkaun } = useAmalanHariIni();

  const solat = amalan.find(a => a.jenis === 'solat');
  const zikir = amalan.find(a => a.jenis === 'zikir');
  const quran = amalan.find(adalahQuran);
  const ditunai = (solat && log[solat.id]?.solat) ?? [];
  const nZikir = zikir?.item?.length ?? 0;
  const logZikir = zikir ? log[zikir.id] : undefined;
  const zikirSiap = SLOT.filter(sl => slotLengkap(logZikir ? { ...logZikir, n: nZikir } : logZikir, sl, nZikir));
  const halaman = quran ? log[quran.id]?.jumlah ?? 0 : 0;
  const quranSiap = !!quran && halaman >= (quran.sasaran ?? 1);
  const kiniSlot = semasa(waktu, kini);

  const kepala = (
    <h2 className="mb-4 flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-w2-lembut text-w2">
        <ListChecks className="size-5" />
      </span>
      <span className="paparan text-2xl">{t.tajuk}</span>
    </h2>
  );

  if (!adaAkaun) {
    return (
      <section className="mt-6">
        {kepala}
        <div className="kad p-5">
          <p className="text-sm text-muted-foreground">{t.logMasuk}</p>
          <Link href="/amalan" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            {t.mula} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  const baris = (label: React.ReactNode, kanan: React.ReactNode, isi: React.ReactNode) => (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">{label}</p>
        <span className="text-sm text-muted-foreground tabular-nums">{kanan}</span>
      </div>
      <div className="mt-2">{isi}</div>
    </div>
  );

  return (
    <section className="mt-6">
      {kepala}
      <div className="kad divide-y divide-border/50 p-5">
        {baris(
          t.solat,
          `${ditunai.length}/${SLOT.length}`,
          // Lima lencana sebaris, sama lebar — tidak terbalut ke baris kedua.
          <div className="grid grid-cols-5 gap-1">
            {SLOT.map(sl => {
              const w = palet(WARNA_WAKTU[sl]);
              const sudah = ditunai.includes(sl);
              return (
                <span
                  key={sl}
                  className={cn(
                    'flex min-w-0 items-center justify-center gap-0.5 rounded-full px-1 py-1 text-[11px] font-medium sm:gap-1 sm:text-xs',
                    sudah ? cn(w.lembut, w.teks) : 'border border-dashed border-border text-muted-foreground',
                    kiniSlot === sl && !sudah && 'border-solid'
                  )}
                  style={kiniSlot === sl && !sudah ? { borderColor: w.css } : undefined}
                >
                  {/* Pada telefon warna isian sudah menandakan "selesai"; ✓ hanya pada skrin lebih lebar. */}
                  {sudah && <Check className="hidden size-3 shrink-0 sm:block" strokeWidth={3} />}
                  <span className="truncate">{LABEL_SLOT[sl]}</span>
                </span>
              );
            })}
          </div>
        )}

        {zikir && baris(
          <><Sparkles className="size-4 text-muted-foreground" />{t.zikir}</>,
          `${zikirSiap.length}/${SLOT.length}`,
          <div className="flex gap-1.5" aria-hidden>
            {SLOT.map(sl => (
              <span key={sl} className={cn('h-1.5 flex-1 rounded-full', zikirSiap.includes(sl) ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        )}

        {quran && baris(
          <><BookOpen className="size-4 text-muted-foreground" />{t.quran}</>,
          quranSiap
            ? <span className="inline-flex items-center gap-1 font-semibold text-primary"><Check className="size-3.5" strokeWidth={3} />{halaman} {unitPapar(quran.unit, bahasa, halaman)}</span>
            : halaman > 0 ? `${halaman} ${unitPapar(quran.unit, bahasa, halaman)}` : t.belumDibaca,
          quran.penanda ? (
            <p className="text-sm text-muted-foreground">
              {t.terakhir}: <span className="font-medium text-foreground">{namaSurah(quran.penanda.surah)} {quran.penanda.surah}:{quran.penanda.ayat}</span>
              {' · '}
              <a href={pautanAyat(quran.penanda.surah, quran.penanda.ayat)} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
                {t.buka}
              </a>
            </p>
          ) : null
        )}
      </div>

      <Link href="/amalan" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {t.kemasKini} <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
