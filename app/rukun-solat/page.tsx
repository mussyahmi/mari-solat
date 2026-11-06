'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { spring } from '@/lib/motion';
import { RukunLabel, type RukunType } from '@/components/RukunBadge';
import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';
import { useTeks } from '@/components/BahasaProvider';
import { palet } from '@/lib/aksen';
import type { Kamus } from '@/lib/bahasa';

type Rukun = { name: string; type: RukunType; note?: string };

const RUKUN_SOLAT: Kamus<Rukun[]> = {
  ms: [
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
  ],
  en: [
    { name: 'Standing, for those who are able', type: "fi'li" },
    { name: 'Niat (intention)', type: 'qalbi' },
    { name: 'Takbiratul Ihram (the first Allahu Akbar)', type: 'qauli' },
    { name: 'Reciting Surah Al-Fatihah', type: 'qauli' },
    { name: 'Rukuk (bowing) with tama\'ninah', type: "fi'li", note: "tama'ninah" },
    { name: 'Iktidal (standing up from rukuk) with tama\'ninah', type: "fi'li", note: "tama'ninah" },
    { name: 'Sujud (prostration) with tama\'ninah', type: "fi'li", note: "tama'ninah" },
    { name: 'Sitting between the two sujud with tama\'ninah', type: "fi'li", note: "tama'ninah" },
    { name: 'Sitting for the final Tasyahhud', type: "fi'li" },
    { name: 'Reciting the final Tasyahhud', type: 'qauli' },
    { name: 'Selawat upon Prophet Muhammad s.a.w. in the final Tasyahhud', type: 'qauli' },
    { name: 'Saying the first salam', type: 'qauli' },
    { name: 'Tertib (performing the pillars in their proper order)', type: 'qalbi' },
  ],
};

const FILTERS = [
  { id: 'all' },
  { id: "fi'li", label: "Fi'li" },
  { id: 'qauli', label: 'Qauli' },
  { id: 'qalbi', label: 'Qalbi' },
] as const;

const ms = {
  tajuk: 'Rukun Solat',
  lede: 'Tiga belas perkara yang wajib dilakukan dalam solat. Tidak seperti senarai lain, rukun ini satu urutan: ia dilakukan mengikut susunan.',
  semua: 'Semua',
  notaTamaninah: '* tama\u2019ninah: berhenti seketika, sekadar menyebut subhanallah.',
};
const en: typeof ms = {
  tajuk: 'Pillars of Prayer',
  lede: 'The pillars of prayer: thirteen things that must be performed in every prayer. Unlike the other lists, these pillars form a sequence: they are performed in order.',
  semua: 'All',
  notaTamaninah: '* tama\u2019ninah: pausing briefly, for as long as it takes to say subhanallah.',
};
const TEKS = { ms, en };

type FilterId = typeof FILTERS[number]['id'];


export default function RukunSolatPage() {
  const [filter, setFilter] = useState<FilterId>('all');
  const t = useTeks(TEKS);
  const rukun = useTeks(RUKUN_SOLAT);

  const visible = filter === 'all' ? rukun : rukun.filter(r => r.type === filter);

  return (
    <PageShell
      tajuk={t.tajuk}
      lede={t.lede}
    >
      {/* Kawalan pil bersegmen yang sama seperti halaman lain. Legenda
          kategori yang dulu berdiri di atasnya dibuang — makna setiap kategori
          kini duduk terus di bawah nama rukun, di tempat ia benar-benar
          diperlukan. */}
      <div className="inline-flex items-center rounded-full bg-muted p-1">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className="group relative rounded-full px-4 py-1.5 text-sm"
          >
            {filter === f.id && (
              <motion.span
                layoutId="tabRukun"
                className="absolute inset-0 rounded-full bg-card shadow-sm"
                transition={spring.susunAtur}
              />
            )}
            <span className={`relative ${filter === f.id ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
              {f.id === 'all' ? t.semua : f.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tiga belas rukun ialah satu urutan, jadi kaunter melekat menjejak
          kedudukan pembaca di dalamnya semasa mereka menatal. Warna nombor
          berputar mengikut kedudukan asal supaya kekal sama walau ditapis. */}
      <SenaraiSkrol className="mt-6 max-w-3xl">
        <ol className="kad divide-y divide-border/50 px-4 sm:px-5">
          {visible.map(item => {
            const no = rukun.indexOf(item);
            const p = palet(no);
            return (
              <ItemSkrol
                key={item.name}
                className="py-4 sm:py-5"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <span className={`angka-paparan flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg ${p.lembut} ${p.teks}`}>
                    {no + 1}
                  </span>
                  <span className="min-w-0 pt-1.5">
                    <span className="block text-lg font-medium leading-snug lg:text-xl">
                      {item.name}
                      {item.note && <sup className="ml-0.5 text-muted-foreground">*</sup>}
                    </span>
                    <RukunLabel type={item.type} />
                  </span>
                </div>
              </ItemSkrol>
            );
          })}
        </ol>
      </SenaraiSkrol>

      <p className="mt-4 px-1 text-sm text-muted-foreground">
        {t.notaTamaninah}
      </p>
    </PageShell>
  );
}
