'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { useTeks } from '@/components/BahasaProvider';

const ms = { irama: 'Tarik 4 saat · hembus 6 saat', makna: 'Aku memohon ampun kepada Allah', s30: '30 saat', m1: '1 minit' };
const en: typeof ms = { irama: 'In 4 sec · out 6 sec', makna: 'I seek forgiveness from Allah', s30: '30 sec', m1: '1 min' };
const TEKS = { ms, en };

/**
 * Pintu masuk ke /istighfar dari halaman utama. Tajuk sudah ada di atas kad,
 * jadi kad ini menunjukkan amalannya sendiri: bola yang bernafas mengikut
 * irama sebenar (4 saat tarik, 6 saat hembus), lafaz istighfar, dan dua
 * butang mula pantas.
 */
export default function KadIstighfar() {
  const t = useTeks(TEKS);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-w2-lembut via-w2-lembut to-w6-lembut p-5 shadow-[var(--bayang-kad)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          {/* Bola nafas — irama yang sama seperti halaman penuh. */}
          <div className="relative flex size-20 shrink-0 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-w2/25 animate-[nafas_10s_ease-in-out_infinite]" />
            <span
              className="relative size-14 rounded-full shadow-[0_0_30px_-6px_var(--w2)] animate-[nafas_10s_ease-in-out_infinite]"
              style={{ background: 'radial-gradient(circle at 35% 30%, oklch(from var(--w2) calc(l + 0.12) c h), var(--w2) 70%)' }}
            />
          </div>
          <div className="min-w-0">
            <p dir="rtl" lang="ar" className="font-arab text-right text-3xl leading-[1.7] text-w2 sm:text-left">أَسْتَغْفِرُ ٱللَّٰهَ</p>
            <p className="text-sm text-foreground/70">{t.makna}</p>
            <p className="mt-1 text-xs font-semibold text-w2">{t.irama}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/istighfar?t=30" className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-w2 shadow-sm transition-transform hover:-translate-y-0.5 sm:flex-none">
            <Play className="size-3.5" /> {t.s30}
          </Link>
          <Link href="/istighfar?t=60" className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-w2 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 sm:flex-none">
            <Play className="size-3.5" /> {t.m1}
          </Link>
        </div>
      </div>
    </div>
  );
}
