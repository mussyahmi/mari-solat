'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Pencil } from 'lucide-react';
import { useTeks } from '@/components/BahasaProvider';
import { GRADIEN_UTAMA, palet, PALET_UTAMA, WARNA_WAKTU } from '@/lib/aksen';
import { LABEL_SLOT, SLOT, type Amalan, type LogHari, type Slot } from '@/lib/amalan';
import { parseTime, type WaktuSolat } from '@/lib/solat';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const ms = {
  sekarang: 'sekarang',
  syuruk: 'Syuruk',
  imsak: 'Imsak',
  dhuha: 'Dhuha',
  zikir: 'Zikir',
  tanda: (w: string) => `Tandakan solat ${w}`,
  belumMasuk: (w: string) => `Waktu ${w} belum masuk.`,
  tandaSemua: 'Tandakan semua',
  kosongkan: 'Kosongkan',
  ubahZikir: 'Ubah senarai zikir',
  tajukZikir: (w: string) => `Zikir selepas ${w}`,
  huraianZikir: (a: number, n: number) => `${a} daripada ${n} selesai`,
  siap: 'Siap',
};
const en: typeof ms = {
  sekarang: 'now',
  syuruk: 'Syuruk',
  imsak: 'Imsak',
  dhuha: 'Dhuha',
  zikir: 'Zikir',
  tanda: w => `Mark ${w} prayed`,
  belumMasuk: w => `It isn't ${w} time yet.`,
  tandaSemua: 'Mark all',
  kosongkan: 'Clear',
  ubahZikir: 'Edit zikir list',
  tajukZikir: w => `Zikir after ${w}`,
  huraianZikir: (a, n) => `${a} of ${n} done`,
  siap: 'Done',
};
const TEKS = { ms, en };

/** Waktu yang sedang berjalan: Subuh hingga Syuruk, kemudian setiap waktu hingga waktu berikutnya. */
function slotSemasa(waktu: WaktuSolat, kini: Date): Slot | null {
  const t = (w: keyof WaktuSolat) => parseTime(waktu[w] as string, kini).getTime();
  const n = kini.getTime();
  if (n >= t('isyak')) return 'isyak';
  if (n >= t('maghrib')) return 'maghrib';
  if (n >= t('asar')) return 'asar';
  if (n >= t('zohor')) return 'zohor';
  if (n >= t('subuh') && n < t('syuruk')) return 'subuh';
  return null;
}

/** ✓ bagi tanda yang sudah ditunaikan. */
function IsiTanda({ siap, kecil }: { siap: boolean; warna?: string; kecil?: boolean }) {
  return siap ? <Check className={kecil ? 'size-3.5' : 'size-5'} strokeWidth={3} /> : null;
}

/** Cincin kemajuan kecil untuk pil zikir. */
function Cincin({ kadar, warna }: { kadar: number; warna: string }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 18 18" className="size-[15px] -rotate-90" aria-hidden>
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <circle cx="9" cy="9" r={r} fill="none" stroke={warna} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - kadar)} />
    </svg>
  );
}

/**
 * Lima kad solat, satu bagi setiap waktu: tanda solat ditunaikan dan pil
 * zikir selepasnya. Dikongsi oleh halaman utama (hari ini) dan Jejak Ibadah
 * (mana-mana hari) supaya kedua-duanya menulis rekod yang sama.
 */
export default function SenaraiSolat({
  waktu, kini, hariLepas, solat, zikir, logSolat, logZikir, onTulis, onUbahZikir, ciptaSolat, tanpaNotaWaktu, seragam,
}: {
  waktu: WaktuSolat | null;
  /** Masa sekarang jika tarikh dipaparkan ialah hari ini, selainnya null. */
  kini: Date | null;
  /** Tarikh sudah berlalu — semua waktu boleh ditanda. */
  hariLepas: boolean;
  solat?: Amalan;
  zikir?: Amalan;
  logSolat?: LogHari;
  logZikir?: LogHari;
  onTulis: (a: Amalan, isi: LogHari) => void;
  onUbahZikir?: () => void;
  /** Cipta amalan Solat 5 waktu jika belum ada — bulatan tetap dipaparkan. */
  ciptaSolat?: () => Promise<Amalan | undefined>;
  /** Sembunyikan baris Imsak · Syuruk · Dhuha — halaman utama sudah memaparkan grid waktu penuh. */
  tanpaNotaWaktu?: boolean;
  /** Satu warna tema untuk semua waktu (Jejak Ibadah), bukan warna setiap waktu. */
  seragam?: boolean;
}) {
  const t = useTeks(TEKS);
  const [buka, setBuka] = useState<Slot | null>(null);
  const semasa = waktu && kini ? slotSemasa(waktu, kini) : null;

  const ditunai = logSolat?.solat ?? [];
  const item = zikir?.item ?? [];
  const n = item.length;

  const sudahMasuk = (sl: Slot) => hariLepas || !waktu || !kini || parseTime(waktu[sl], kini) <= kini;

  const togolSolat = async (sl: Slot) => {
    if (!sudahMasuk(sl)) { toast(t.belumMasuk(LABEL_SLOT[sl])); return; }
    // Tiada amalan solat lagi: cipta dahulu, kemudian rekod waktu ini.
    const a = solat ?? await ciptaSolat?.();
    if (!a) return;
    onTulis(a, { solat: ditunai.includes(sl) ? ditunai.filter(x => x !== sl) : SLOT.filter(x => x === sl || ditunai.includes(x)) });
  };

  const tulisZikir = (sl: Slot, ids: string[]) => {
    if (!zikir) return;
    const slot = Object.fromEntries(SLOT.map(x => [x, logZikir?.slot?.[x] ?? []])) as Record<Slot, string[]>;
    slot[sl] = ids.filter(id => item.some(it => it.id === id));
    onTulis(zikir, { slot, n });
  };

  // Sempit: bertindan. Lebar: lima waktu sebaris, dibaca kiri ke kanan seperti
  // hari berjalan. Ikut lebar bekas (container query), bukan skrin, supaya
  // kad tidak tersepit apabila diletakkan dalam lajur yang sempit.
  return (
    <div className="@container">
    <div className="grid gap-2 @md:grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-5">
      {SLOT.map(sl => {
        const w = seragam ? PALET_UTAMA : palet(WARNA_WAKTU[sl]);
        const kini_ = semasa === sl;
        const sudah = ditunai.includes(sl);
        const ditanda = (logZikir?.slot?.[sl] ?? []).filter(id => item.some(it => it.id === id));
        const zikirPenuh = n > 0 && ditanda.length >= n;
        const terbuka = buka === sl;

        return (
          <div
            key={sl}
            className={cn(
              'relative flex flex-col rounded-2xl border p-3 shadow-[var(--bayang-kad)] transition-colors',
              kini_ || (seragam && sudah) ? w.lembut : 'bg-card'
            )}
            style={{ borderColor: kini_ ? `oklch(from ${w.css} l c h / 0.45)` : undefined }}
          >

            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="text-base font-bold leading-tight">{LABEL_SLOT[sl]}</span>
                  {kini_ && (
                    <span className={cn('rounded-full bg-card/70 px-1.5 py-px text-[10px] font-semibold', w.teks)}>{t.sekarang}</span>
                  )}
                </p>
                {waktu && (
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    <span className="whitespace-nowrap">{waktu[sl]}</span>
                    {sl === 'subuh' && <> · <span className="whitespace-nowrap">{t.syuruk} {waktu.syuruk}</span></>}
                  </p>
                )}
              </div>

              {(solat || ciptaSolat) && (
                <button
                  type="button"
                  onClick={() => togolSolat(sl)}
                  aria-label={t.tanda(LABEL_SLOT[sl])}
                  aria-pressed={sudah}
                  className={cn(
                    'relative flex size-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90',
                    sudah ? (seragam ? cn('shadow-sm', w.teks) : 'text-white shadow-sm') : 'border-[2.5px]',
                    !sudahMasuk(sl) && !sudah && 'opacity-50'
                  )}
                  style={sudah ? { background: seragam ? GRADIEN_UTAMA : w.css } : { borderColor: `oklch(from ${w.css} l c h / 0.55)` }}
                >
                  <IsiTanda siap={sudah} warna={w.css} />
                </button>
              )}
            </div>

            {zikir && n > 0 && (
              <div className="mt-auto pt-2">
                <button
                  type="button"
                  onClick={() => setBuka(terbuka ? null : sl)}
                  aria-expanded={terbuka}
                  className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors', zikirPenuh ? cn(w.lembut, w.teks) : 'bg-card/80')}
                  style={{ borderColor: `oklch(from ${w.css} l c h / 0.4)` }}
                >
                  <Cincin kadar={ditanda.length / n} warna={w.css} />
                  {t.zikir} {ditanda.length}/{n}
                </button>

              </div>
            )}
          </div>
        );
      })}

      {waktu && !tanpaNotaWaktu && (
        <p className="col-span-full px-2 text-xs text-muted-foreground tabular-nums">
          {t.imsak} {waktu.imsak} · {t.syuruk} {waktu.syuruk} · {t.dhuha} {waktu.dhuha}
        </p>
      )}
    </div>

    {/* Senarai semak dibuka sebagai dialog, bukan di dalam kad, supaya
        kelima-lima kad kekal sama saiz walau mana satu dibuka. */}
    <Dialog open={buka !== null} onOpenChange={b => !b && setBuka(null)}>
      <DialogContent className="sm:max-w-sm">
        {buka && (() => {
          const w = seragam ? PALET_UTAMA : palet(WARNA_WAKTU[buka]);
          const ditanda = (logZikir?.slot?.[buka] ?? []).filter(id => item.some(it => it.id === id));
          const penuh = n > 0 && ditanda.length >= n;
          return (
            <>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: w.css }}>
                  <Cincin kadar={n ? ditanda.length / n : 0} warna="#fff" />
                </span>
                <div>
                  <DialogTitle className="text-lg font-bold">{t.tajukZikir(LABEL_SLOT[buka])}</DialogTitle>
                  <DialogDescription>{t.huraianZikir(ditanda.length, n)}</DialogDescription>
                </div>
              </div>
              <div className="-mx-2">
                {item.map(it => {
                  const ada = ditanda.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => tulisZikir(buka, ada ? ditanda.filter(x => x !== it.id) : [...ditanda, it.id])}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/60"
                    >
                      <span
                        className={cn('relative flex size-6 shrink-0 items-center justify-center rounded-lg border-2', ada ? 'border-transparent text-white' : 'border-border')}
                        style={ada ? { background: w.css } : undefined}
                      >
                        <IsiTanda siap={ada} warna={w.css} kecil />
                      </span>
                      <span className={cn(ada && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{it.nama}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-3">
                  <button type="button" onClick={() => tulisZikir(buka, penuh ? [] : item.map(it => it.id))} className={cn('text-sm font-semibold', w.teks)}>
                    {penuh ? t.kosongkan : t.tandaSemua}
                  </button>
                  {onUbahZikir && (
                    <button type="button" onClick={() => { setBuka(null); onUbahZikir(); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      <Pencil className="size-3.5" /> {t.ubahZikir}
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => setBuka(null)} className="rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ background: w.css }}>
                  {t.siap}
                </button>
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
    </div>
  );
}
