'use client';

import { useState } from 'react';
import { RukunBadge, TYPE_META, type RukunType } from '@/components/RukunBadge';
import Sidebar from '@/components/Sidebar';

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
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-10 lg:px-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-display tracking-tight">Rukun Solat</h1>
          <p className="text-sm text-muted-foreground/70 mt-2">13 perkara yang wajib dilakukan dalam solat.</p>

          {/* Category descriptions */}
          <div className="flex flex-col gap-1 mt-3">
            {(Object.entries(TYPE_META) as [RukunType, typeof TYPE_META[RukunType]][]).map(([type, meta]) => (
              <div key={type} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`font-semibold px-1.5 py-0.5 rounded w-12 text-center shrink-0 ${meta.className}`}>{meta.label}</span>
                {meta.description}
              </div>
            ))}
          </div>

        </header>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-6">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === f.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="divide-y divide-border/50">
          {visible.map(item => {
            const globalIndex = RUKUN_SOLAT.indexOf(item);
            return (
              <div key={item.name} className="flex items-center justify-between py-5 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-sm font-bold text-muted-foreground/30 w-5 shrink-0 text-right">
                    {globalIndex + 1}
                  </span>
                  <span className="text-sm leading-snug">
                    {item.name}
                    {item.note && <sup className="ml-0.5 text-muted-foreground/40">*</sup>}
                  </span>
                </div>
                <RukunBadge type={item.type} />
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <p className="text-xs text-muted-foreground/40 mt-6">
          * tama'ninah — berhenti seketika (sekadar menyebut subhanallah)
        </p>
      </main>
    </div>
  );
}
