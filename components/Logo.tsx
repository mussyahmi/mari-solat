'use client';

/**
 * Tanda MariSolat: gerbang mihrab yang membingkai bulan sabit, bintang emas
 * dan kubah masjid, di atas kecerunan warna yang ceria.
 *
 * Tanda lama ialah huruf "M:" — tepat, tetapi tidak berkata apa-apa tentang
 * solat. Pemilik memilih mihrab daripada beberapa lakaran: ia membaca sebagai
 * tempat solat, bukan sekadar simbol umum. Jubin mengikut warna tema pilihan
 * pengguna (--rona) dengan kecerahan tetap, supaya putih dan emas kekal jelas
 * dalam mod gelap. Ikon aplikasi statik dalam public/ menggunakan kecerunan
 * "Sky" (biru → ungu muda → merah jambu) yang dipilih pemilik.
 */

import { useId } from 'react';
import { useTeks } from '@/components/BahasaProvider';

const ms = { tagline: 'Waktu solat Malaysia' };
const en: typeof ms = { tagline: 'Malaysian prayer times' };
const TEKS = { ms, en };

export function LogoMark({ className = '', title }: { className?: string; title?: string }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          {/* Tiga rona di sekitar warna tema — cerah dan ceria, bukan satu
              warna gelap. Pada tema lalai ia hijau limau → teal → biru langit. */}
          <stop offset="0" style={{ stopColor: 'oklch(0.80 0.13 calc(var(--rona) - 30))' }} />
          <stop offset=".55" style={{ stopColor: 'oklch(0.70 0.14 calc(var(--rona) + 15))' }} />
          <stop offset="1" style={{ stopColor: 'oklch(0.68 0.17 calc(var(--rona) + 60))' }} />
        </linearGradient>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#ffc94a" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="35.4" cy="21.4" r="5.6" fill="#000" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}a)`} />
      <path d="M14 56 V30 Q14 15 32 7 Q50 15 50 30 V56" fill="none" stroke="#fff" strokeOpacity=".95" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M19 56 V31 Q19 19.5 32 13 Q45 19.5 45 31 V56Z" fill="#fff" fillOpacity=".16" />
      <circle cx="31" cy="25" r="7.4" fill="#fff" mask={`url(#${id}m)`} />
      <path d="M37.6 15.6 l1 2.3 2.3 1 -2.3 1 -1 2.3 -1 -2.3 -2.3 -1 2.3 -1z" fill={`url(#${id}e)`} />
      <path d="M32 36 C27 39 24 41.5 24 45.5 C24 47.5 25 48.6 26 49 H38 C39 48.6 40 47.5 40 45.5 C40 41.5 37 39 32 36Z" fill="#fff" />
      <rect x="23.5" y="49" width="17" height="7" rx="1.2" fill="#fff" fillOpacity=".9" />
      <path d="M30 56 V52.6 a2 2 0 0 1 4 0 V56Z" style={{ fill: 'oklch(0.70 0.14 calc(var(--rona) + 15))' }} />
    </svg>
  );
}

export default function Logo({
  className = '',
  tagline = false,
}: {
  className?: string;
  /** Tunjukkan baris "Waktu solat Malaysia" di bawah nama. */
  tagline?: boolean;
}) {
  const t = useTeks(TEKS);
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-10" title="MariSolat" />
      <span className="flex flex-col leading-none">
        <span
          className="paparan text-[1.375rem] "
          style={{ fontVariationSettings: "'wght' 600, 'opsz' 144, 'SOFT' 60, 'WONK' 1" }}
        >
          Mari<span className="text-primary">:</span>Solat
        </span>
        {tagline && <span className="mt-1 text-xs text-muted-foreground">{t.tagline}</span>}
      </span>
    </span>
  );
}
