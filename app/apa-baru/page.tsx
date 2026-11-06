'use client';

import PageShell from '@/components/PageShell';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { CHANGELOG } from '@/lib/changelog';
import { BULAN } from '@/lib/bahasa';
import { APP_VERSION } from '@/lib/version';
import { cn } from '@/lib/utils';

const ms = {
  tajuk: 'Apa yang baru',
  lede: 'Perubahan dalam setiap versi MariSolat, bermula dari 2.0.',
  semasa: 'Versi anda',
};
const en: typeof ms = {
  tajuk: "What's new",
  lede: 'Changes in each version of MariSolat, starting from 2.0.',
  semasa: 'Your version',
};
const TEKS = { ms, en };

/** Log perubahan sebagai garis masa — versi terbaru di atas. */
export default function ApaBaruPage() {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const tarikh = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return `${d} ${BULAN[bahasa][m - 1]} ${y}`;
  };

  return (
    <PageShell tajuk={t.tajuk} lede={t.lede}>
      <ol className="relative max-w-2xl space-y-8 border-l-2 border-border/70 pl-6">
        {CHANGELOG.map((e, i) => {
          const kini = e.versi === APP_VERSION;
          return (
            <li key={e.versi} className="relative">
              <span
                className={cn(
                  'absolute -left-[33px] top-1 size-4 rounded-full border-[3px] border-background',
                  i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'
                )}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="paparan text-2xl">v{e.versi}</h2>
                {e.tajuk && <span className="text-sm font-semibold text-primary">{e.tajuk[bahasa]}</span>}
                {kini && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                    {t.semasa}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tarikh(e.tarikh)}</p>
              <ul className="kad mt-3 space-y-2 p-4">
                {e.perubahan[bahasa].map(p => (
                  <li key={p} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </PageShell>
  );
}
