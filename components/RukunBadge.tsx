'use client';

import { useTeks } from '@/components/BahasaProvider';
import { palet } from '@/lib/aksen';

type RukunType = "fi'li" | 'qauli' | 'qalbi';

/**
 * Tiga kategori rukun.
 *
 * Sebelum ini setiap satu ialah cip berwarna penuh dengan tooltip, dan
 * maknanya diulang tiga kali: dalam legenda di atas halaman, pada cip itu
 * sendiri, dan sekali lagi di dalam tooltip. Ia kini satu pil lembut kecil di
 * bawah nama rukun, diikuti maknanya.
 *
 * Warna dipetakan ke palet mengikut rona --rukun-* yang asal: fi'li biru,
 * qauli jingga, qalbi merah jambu — sama di setiap tempat.
 */
const TYPE_META: Record<RukunType, { label: string; warna: number }> = {
  "fi'li": {
    label: "Fi'li",
    warna: 5,
  },
  qauli: {
    label: 'Qauli',
    warna: 4,
  },
  qalbi: {
    label: 'Qalbi',
    warna: 3,
  },
};

const ms: Record<RukunType, string> = {
  "fi'li": 'perbuatan',
  qauli: 'diucap dengan lidah',
  qalbi: 'diingat dalam hati',
};
const en: typeof ms = {
  "fi'li": 'physical action',
  qauli: 'uttered with the tongue',
  qalbi: 'held in the heart',
};
const TEKS = { ms, en };

export function RukunLabel({ type }: { type: RukunType }) {
  const meta = TYPE_META[type];
  const description = useTeks(TEKS)[type];
  const p = palet(meta.warna);
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.lembut} ${p.teks}`}>
        {meta.label}
      </span>
      <span className="text-muted-foreground">{description}</span>
    </span>
  );
}

export { TYPE_META };
export type { RukunType };
