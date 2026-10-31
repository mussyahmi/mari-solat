'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import KadPeringatan from '@/components/KadPeringatan';
import { palet } from '@/lib/aksen';
import { KUNCI_TOPIK, pasanganHari, TOPIK, topikSemasa, type IdTopik } from '@/lib/peringatan';
import { cn } from '@/lib/utils';

const ms = { tajuk: 'Peringatan hari ini', lain: 'Lain', fokus: 'Fokus', tukar: 'tukar', siap: 'siap', semua: 'Lihat semua peringatan' };
const en: typeof ms = { tajuk: "Today's reminder", lain: 'Another', fokus: 'Focus', tukar: 'change', siap: 'done', semua: 'See all reminders' };
const TEKS = { ms, en };

/** Satu ayat dan satu hadis setiap hari, mengikut topik pilihan. */
export default function PeringatanHariIni() {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [topik, setTopik] = useState<IdTopik | null>(null);
  const [anjakan, setAnjakan] = useState(0);
  const [pilih, setPilih] = useState(false);

  // Dibaca selepas lekap: localStorage tiada di pelayan.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTopik(topikSemasa()); }, []);

  if (!topik) return null;
  const semasa = TOPIK.find(x => x.id === topik)!;

  const tukar = (id: IdTopik) => {
    setTopik(id);
    setAnjakan(0);
    setPilih(false);
    try { localStorage.setItem(KUNCI_TOPIK, id); } catch { /* storan disekat */ }
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-w1-lembut text-w1">
            <Sparkles className="size-5" />
          </span>
          <span className="paparan text-2xl">{t.tajuk}</span>
        </h2>
        <button type="button" onClick={() => setAnjakan(n => n + 1)} className="text-sm font-semibold text-primary">
          {t.lain}
        </button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {t.fokus}: <span className="text-foreground">{semasa.nama[bahasa]}</span> ·{' '}
        <button type="button" onClick={() => setPilih(v => !v)} className="font-semibold text-primary">
          {pilih ? t.siap : t.tukar}
        </button>
      </p>

      {pilih && (
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPIK.map(x => (
            <button
              key={x.id}
              type="button"
              onClick={() => tukar(x.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm transition-colors',
                x.id === topik ? cn(palet(x.warna).lembut, palet(x.warna).teks, 'font-semibold') : 'bg-card text-foreground/80 shadow-sm hover:text-foreground'
              )}
            >
              {x.nama[bahasa]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {pasanganHari(topik, anjakan).map((p, i) => <KadPeringatan key={p.id} p={p} kedudukan={i + anjakan * 2} />)}
      </div>

      <Link href="/peringatan" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {t.semua} <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
