'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { spring } from '@/lib/motion';
import { RukunLabel, type RukunType } from '@/components/RukunBadge';
import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';

const RUKUN_SOLAT: { name: string; type: RukunType; note?: string }[] = [
  { name: 'Berdiri bagi yang mampu', type: "fi'li" },
  { name: 'Niat', type: 'qalbi' },
  { name: 'Takbiratul Ihram (Allahu Akbar yang pertama)', type: 'qauli' },
  { name: 'Membaca surah Al-Fatihah', type: 'qauli' },
  { name: 'Rukuk dengan tama\'ninah', type: "fi'li", note: "tama'ninah" },
  { name: 'Iktidal dengan tama\'ninah', type: "fi'li", note: "tama'ninah" },
  { name: 'Sujud dengan tama\'ninah', type: "fi'li", note: "tama'ninah" },
  { name: 'Duduk di antara dua sujud dengan tama\'ninah', type: "fi'li", note: "tama'ninah" },
  { name: 'Duduk Tasyahhud Akhir', type: "fi'li" },
  { name: 'Membaca bacaan Tasyahhud Akhir', type: 'qauli' },
  { name: 'Selawat kepada Nabi Muhammad s.a.w. dalam Tasyahhud Akhir', type: 'qauli' },
  { name: 'Mengucapkan salam yang pertama', type: 'qauli' },
  { name: 'Tertib', type: 'qalbi' },
];

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: "fi'li", label: "Fi'li" },
  { id: 'qauli', label: 'Qauli' },
  { id: 'qalbi', label: 'Qalbi' },
] as const;

type FilterId = typeof FILTERS[number]['id'];


export default function RukunSolatPage() {
  const [filter, setFilter] = useState<FilterId>('all');

  const visible = filter === 'all' ? RUKUN_SOLAT : RUKUN_SOLAT.filter(r => r.type === filter);

  return (
    <PageShell
      tajuk="Rukun Solat"
      lede="Tiga belas perkara yang wajib dilakukan dalam solat. Tidak seperti senarai lain, rukun ini satu urutan — ia dilakukan mengikut susunan."
    >
      {/* Baris tab yang sama seperti halaman lain. Legenda kategori yang dulu
          berdiri di atasnya dibuang — makna setiap kategori kini duduk terus
          di bawah nama rukun, di tempat ia benar-benar diperlukan. */}
      <div className="-ml-3 flex items-center border-b border-border/60 lg:-ml-3.5">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className="group relative px-3 py-3 text-sm transition-colors lg:px-3.5"
          >
            {filter === f.id && (
              <motion.span
                layoutId="tabRukun"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                transition={spring.susunAtur}
              />
            )}
            <span className={filter === f.id ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
              {f.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tiga belas rukun ialah satu urutan, jadi kaunter melekat menjejak
          kedudukan pembaca di dalamnya semasa mereka menatal. */}
      <SenaraiSkrol className="mt-10">
        <ol className="divide-y divide-border/50">
          {visible.map(item => (
            <ItemSkrol
              key={item.name}
              className="py-9 lg:py-11"
            >
              <div className="flex min-w-0 items-baseline gap-5">
                <span className="angka-paparan w-8 shrink-0 text-right text-xl text-muted-foreground">
                  {RUKUN_SOLAT.indexOf(item) + 1}
                </span>
                <span className="min-w-0">
                  <span className="text-xl leading-snug lg:text-2xl">
                    {item.name}
                    {item.note && <sup className="ml-0.5 text-muted-foreground">*</sup>}
                  </span>
                  <RukunLabel type={item.type} />
                </span>
              </div>
            </ItemSkrol>
          ))}
        </ol>
      </SenaraiSkrol>

      <p className="mt-6 text-sm text-muted-foreground">
        * tama&rsquo;ninah — berhenti seketika, sekadar menyebut subhanallah.
      </p>
    </PageShell>
  );
}
