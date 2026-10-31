'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { localDateStr } from '@/lib/qada';
import { tambahHari, tarikhKe, type Petak } from '@/lib/amalan';
import { BULAN, HARI_PENDEK } from '@/lib/bahasa';
import { useBahasa } from '@/components/BahasaProvider';
import { cn } from '@/lib/utils';

export type Paparan = 'minggu' | 'bulan' | 'tahun';

/** Julat tarikh bagi satu paparan, `anjakan` tempoh ke belakang dari hari ini. */
export function julat(paparan: Paparan, anjakan: number, hariIni: string) {
  const d = tarikhKe(hariIni);
  if (paparan === 'minggu') {
    // Minggu bermula Isnin.
    const isnin = tambahHari(hariIni, -((d.getDay() + 6) % 7) - anjakan * 7);
    return { dari: isnin, hingga: tambahHari(isnin, 6) };
  }
  if (paparan === 'bulan') {
    const awal = new Date(d.getFullYear(), d.getMonth() - anjakan, 1, 12);
    const akhir = new Date(awal.getFullYear(), awal.getMonth() + 1, 0, 12);
    return { dari: localDateStr(awal), hingga: localDateStr(akhir) };
  }
  const y = d.getFullYear() - anjakan;
  return { dari: `${y}-01-01`, hingga: `${y}-12-31` };
}

/** Warna setiap keadaan — legenda di halaman membaca dari sini juga. */
export function kelasPetak(p: Petak | undefined) {
  switch (p?.k) {
    case 'penuh': return '';
    case 'qada': return 'bg-amaran';
    case 'terlepas': return 'bg-batu-300 dark:bg-batu-600';
    case 'kosong': return 'bg-muted ring-1 ring-inset ring-border/60';
    case 'separa': return '';
    // Bergaris putus, seperti kalendar kertas: hari ini tidak dikira langsung.
    default: return 'border border-dashed border-border';
  }
}

/** Warna keadaan seragam untuk semua amalan, sepadan dengan legenda. */
export function gayaPetak(p: Petak | undefined, warna = 'var(--primary)'): React.CSSProperties | undefined {
  if (p?.k === 'penuh') return { background: warna };
  if (p?.k !== 'separa') return undefined;
  // Tiga tona, seperti grid GitHub: sedikit, separuh, hampir.
  const alfa = p.kadar < 0.34 ? 0.3 : p.kadar < 0.67 ? 0.52 : 0.75;
  return { background: `oklch(from ${warna} l c h / ${alfa})` };
}

export type BarisMatriks = {
  id: string;
  nama: string;
  petak: Record<string, Petak>;
  /** Ringkasan kecil di bawah nama, cth. "24 / 31". */
  ringkasan?: React.ReactNode;
  /** Warna CSS amalan; lalai --primary. */
  warna?: string;
  utama?: boolean;
  /** Buka borang ubah amalan ini. */
  onUbah?: () => void;
  /** Minta pengesahan untuk memadam amalan ini. */
  onPadam?: () => void;
  labelPadam?: string;
};

/**
 * Semua amalan dalam satu jadual: baris = amalan, lajur = hari. Satu
 * pandangan menjawab "hari mana yang terlepas, dan amalan apa" tanpa perlu
 * membandingkan kalendar yang bertindan.
 *
 * Lajur nama berada di luar kawasan tatal dan bukan `sticky`: latar halaman
 * ialah basuhan kecerunan, jadi lajur melekat memerlukan latar padu yang
 * kelihatan seperti kotak gelap di atasnya.
 */
export function MatriksAmalan({
  baris,
  dari,
  hingga,
  hariIni,
  dipilih,
  onPilih,
}: {
  baris: BarisMatriks[];
  dari: string;
  hingga: string;
  hariIni: string;
  dipilih?: string;
  onPilih?: (s: string) => void;
}) {
  const { bahasa } = useBahasa();
  const tatal = useRef<HTMLDivElement>(null);
  const hari: string[] = [];
  for (let s = dari; s <= hingga; s = tambahHari(s, 1)) hari.push(s);
  const teks = (s: string) => {
    const d = tarikhKe(s);
    return `${d.getDate()} ${BULAN[bahasa][d.getMonth()]} ${d.getFullYear()}`;
  };

  // Hari ini berada di hujung kanan bulan semasa; pada telefon ia akan
  // tersembunyi di luar skrin tanpa ini.
  useEffect(() => {
    const el = tatal.current;
    if (!el) return;
    const sel = el.querySelector<HTMLElement>('[data-hari-ini]');
    el.scrollLeft = sel ? sel.offsetLeft - el.clientWidth + sel.offsetWidth + 24 : 0;
  }, [dari, hingga]);

  const lajur = (s: string, i: number) =>
    cn('flex w-7 shrink-0 justify-center', i > 0 && tarikhKe(s).getDay() === 1 && 'ml-2');

  return (
    <div className="flex">
      <div className="w-32 shrink-0 pr-3 sm:w-48">
        <div className="h-10" />
        {baris.map(b => (
          <div key={b.id} className="flex h-10 flex-col justify-center">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={b.onUbah}
                disabled={!b.onUbah}
                className={cn('flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm leading-tight', b.utama ? 'font-semibold' : 'text-foreground/80 enabled:hover:text-foreground')}
              >
                {!b.utama && <span className="size-2 shrink-0 rounded-full" style={{ background: b.warna }} />}
                <span className="truncate">{b.nama}</span>
              </button>
              {b.onPadam && (
                <button
                  type="button"
                  onClick={b.onPadam}
                  aria-label={b.labelPadam}
                  className="-my-1 shrink-0 rounded-full p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {b.ringkasan && <div className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground/80 tabular-nums">{b.ringkasan}</div>}
          </div>
        ))}
      </div>

      {/* Tepi kiri dipudarkan supaya petak yang terpotong ketika ditatal
          kelihatan seperti bersambung, bukan rosak. */}
      <div
        ref={tatal}
        className="-mr-5 min-w-0 flex-1 overflow-x-auto pr-5 lg:mr-0 lg:pr-0"
        style={{
          scrollbarWidth: 'none',
          maskImage: 'linear-gradient(to right, transparent, black 20px)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px)',
        }}
      >
        <div className="flex h-10 w-max items-end gap-1 pb-1.5">
          {hari.map((s, i) => {
            const d = tarikhKe(s);
            const kini = s === hariIni;
            const pilih = s === dipilih;
            return (
              <div key={s} className={cn(lajur(s, i), 'flex-col items-center text-[10px] leading-none text-muted-foreground/70')} {...(kini ? { 'data-hari-ini': '' } : {})}>
                <span>{HARI_PENDEK[bahasa][d.getDay()].slice(0, 1)}</span>
                <span className={cn(
                  'mt-1 flex size-5 items-center justify-center rounded-full tabular-nums',
                  kini && 'font-semibold text-primary',
                  pilih && 'bg-foreground font-semibold text-background'
                )}>
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
        {baris.map(b => (
          <div key={b.id} className="flex h-10 w-max items-center gap-1">
            {hari.map((s, i) => {
              const p = b.petak[s];
              const boleh = onPilih && s <= hariIni;
              return (
                <div key={s} className={lajur(s, i)}>
                  <button
                    type="button"
                    disabled={!boleh}
                    onClick={() => onPilih?.(s)}
                    title={`${b.nama} · ${teks(s)}`}
                    aria-label={`${b.nama} · ${teks(s)}`}
                    className={cn(
                      'block size-7 rounded-md transition-transform enabled:hover:scale-110',
                      kelasPetak(p),
                    )}
                    style={gayaPetak(p)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GridAmalan({
  paparan,
  dari,
  hingga,
  petak,
  hariIni,
  dipilih,
  onPilih,
}: {
  paparan: Paparan;
  dari: string;
  hingga: string;
  petak: Record<string, Petak>;
  hariIni: string;
  dipilih?: string;
  onPilih?: (s: string) => void;
}) {
  const { bahasa } = useBahasa();
  const hariPendek = HARI_PENDEK[bahasa];
  const teksPetak = (s: string) => {
    const d = tarikhKe(s);
    return `${d.getDate()} ${BULAN[bahasa][d.getMonth()]} ${d.getFullYear()}`;
  };
  // Isi ke Isnin sebelum `dari` dan Ahad selepas `hingga` supaya setiap
  // lajur ialah satu minggu penuh.
  const awal = tambahHari(dari, -((tarikhKe(dari).getDay() + 6) % 7));
  const minggu: string[][] = [];
  for (let s = awal; s <= hingga; s = tambahHari(s, 7)) {
    minggu.push(Array.from({ length: 7 }, (_, i) => tambahHari(s, i)));
  }

  const butang = (s: string, besar: boolean) => {
    const dalam = s >= dari && s <= hingga;
    if (!dalam) return <span key={s} className={besar ? 'aspect-square' : 'size-3'} />;
    const p = petak[s];
    const boleh = onPilih && s <= hariIni;
    return (
      <button
        key={s}
        type="button"
        disabled={!boleh}
        onClick={() => onPilih?.(s)}
        title={teksPetak(s)}
        aria-label={teksPetak(s)}
        className={cn(
          'shrink-0 transition-transform enabled:hover:scale-110',
          besar ? 'flex aspect-square items-center justify-center rounded-lg text-xs tabular-nums' : 'size-3 rounded-[3px]',
          kelasPetak(p),
          s === dipilih && 'outline-2 outline-offset-2 outline-foreground',
          besar && (p?.k === 'penuh' || p?.k === 'qada') && 'text-primary-foreground',
          besar && s === hariIni && 'font-semibold',
        )}
        style={gayaPetak(p)}
      >
        {besar && tarikhKe(s).getDate()}
      </button>
    );
  };

  if (paparan === 'tahun') {
    // Grid GitHub: lajur = minggu, baris = hari. Ditatal mendatar pada
    // telefon kerana 53 lajur tidak muat.
    return (
      <div className="-mx-5 overflow-x-auto px-5 pb-2 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
        <div className="flex w-max gap-[3px]">
          <div className="mr-1 flex flex-col gap-[3px] text-[10px] leading-3 text-muted-foreground">
            {[1, 2, 3, 4, 5, 6, 0].map((h, i) => (
              <span key={h} className="h-3">{i % 2 === 0 ? hariPendek[h] : ''}</span>
            ))}
          </div>
          {minggu.map(m => (
            <div key={m[0]} className="flex flex-col gap-[3px]">
              {m.map(s => butang(s, false))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Minggu dan bulan: susun atur kalendar biasa, baris = minggu.
  return (
    <div className="max-w-md">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
        {[1, 2, 3, 4, 5, 6, 0].map(h => <span key={h}>{hariPendek[h]}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {minggu.flat().map(s => butang(s, true))}
      </div>
    </div>
  );
}
