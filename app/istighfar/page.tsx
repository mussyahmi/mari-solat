'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { useTeks } from '@/components/BahasaProvider';
import { cn } from '@/lib/utils';

const ms = {
  tajuk: 'Nafas Istighfar',
  lede: 'Tarik nafas perlahan-lahan, kemudian hembus sambil beristighfar. Seminit untuk menenangkan hati.',
  masuk: 'Tarik nafas',
  keluar: 'Hembus · Astaghfirullah',
  makna: 'Aku memohon ampun kepada Allah',
  mula: 'Mula',
  jeda: 'Jeda',
  sambung: 'Sambung',
  henti: 'Henti',
  ulang: 'Ulang',
  saat: (n: number) => `${n} saat`,
  minit: '1 minit',
  tempoh: 'Tempoh',
  kiraan: (n: number, j: number) => `${n} / ${j} istighfar`,
  siap: 'Selesai. Alhamdulillah.',
  siapNota: (n: number) => `${n} kali istighfar dengan nafas yang tenang.`,
  sedia: 'Tekan Mula, kemudian ikut bulatan.',
};
const en: typeof ms = {
  tajuk: 'Istighfar Breathing',
  lede: 'Breathe in slowly, then breathe out while seeking forgiveness. A minute to settle the heart.',
  masuk: 'Breathe in',
  keluar: 'Breathe out · Astaghfirullah',
  makna: 'I seek forgiveness from Allah',
  mula: 'Start',
  jeda: 'Pause',
  sambung: 'Resume',
  henti: 'Stop',
  ulang: 'Again',
  saat: n => `${n} sec`,
  minit: '1 min',
  tempoh: 'Length',
  kiraan: (n, j) => `${n} / ${j} istighfar`,
  siap: 'Done. Alhamdulillah.',
  siapNota: n => `${n} istighfar with calm breathing.`,
  sedia: 'Tap Start, then follow the circle.',
};
const TEKS = { ms, en };

/** Irama satu nafas: 4 saat tarik, 6 saat hembus sambil beristighfar. */
const MASUK = 4_000;
const KELUAR = 6_000;
const NAFAS = MASUK + KELUAR;
const PILIHAN = [30_000, 60_000] as const;

type Keadaan = 'sedia' | 'jalan' | 'jeda' | 'siap';


export default function IstighfarPage() {
  const t = useTeks(TEKS);
  // Kad halaman utama membuka halaman ini dengan ?t=30 atau ?t=60.
  const [tempoh, setTempoh] = useState<number>(60_000);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('t');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t === '30') setTempoh(30_000);
  }, []);
  const [keadaan, setKeadaan] = useState<Keadaan>('sedia');
  const [berlalu, setBerlalu] = useState(0);

  // Masa diukur daripada jam sebenar, bukan dikira setiap bingkai, supaya
  // irama tidak hanyut apabila tab perlahan atau bingkai tercicir.
  const mulaRef = useRef(0);
  const asasRef = useRef(0);

  const henti = useCallback(() => {
    setKeadaan('sedia');
    setBerlalu(0);
  }, []);

  useEffect(() => {
    if (keadaan !== 'jalan') return;
    mulaRef.current = performance.now();
    let id = 0;
    const detik = () => {
      const e = asasRef.current + performance.now() - mulaRef.current;
      if (e >= tempoh) {
        setBerlalu(tempoh);
        setKeadaan('siap');
        return;
      }
      setBerlalu(e);
      id = requestAnimationFrame(detik);
    };
    id = requestAnimationFrame(detik);
    return () => {
      cancelAnimationFrame(id);
      asasRef.current += performance.now() - mulaRef.current;
    };
  }, [keadaan, tempoh]);

  const mula = () => {
    asasRef.current = 0;
    setBerlalu(0);
    setKeadaan('jalan');
  };

  const jumlah = tempoh / NAFAS;
  const dalamNafas = berlalu % NAFAS;
  const fasa: 'masuk' | 'keluar' = dalamNafas < MASUK ? 'masuk' : 'keluar';
  const selesai = Math.min(Math.floor(berlalu / NAFAS), jumlah);
  // Bulatan mengembang ketika tarik dan mengecut ketika hembus, dengan
  // pelonggaran sinus supaya ia terasa seperti nafas dan bukan mesin.
  const kadar = fasa === 'masuk' ? dalamNafas / MASUK : 1 - (dalamNafas - MASUK) / KELUAR;
  const lembut = (1 - Math.cos(Math.PI * kadar)) / 2;
  const skala = keadaan === 'sedia' || keadaan === 'siap' ? 0.72 : 0.55 + 0.45 * lembut;
  const bakiSaat = Math.ceil((tempoh - berlalu) / 1000);

  return (
    <PageShell tajuk={t.tajuk} lede={t.lede}>
      <div className="mx-auto flex max-w-md flex-col items-center">
        {/* Ruangnya dikekalkan walaupun tersembunyi, supaya bulatan tidak
            melompat ke atas sebaik sahaja nafas bermula. */}
        {(
          <div className={cn('flex w-full flex-col items-center gap-2', keadaan !== 'sedia' && 'pointer-events-none invisible')} aria-hidden={keadaan !== 'sedia'}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{t.tempoh}</p>
            <div className="flex rounded-full bg-muted p-1">
              {PILIHAN.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTempoh(p)}
                  className={cn(
                    'rounded-full px-5 py-2 text-sm transition-colors',
                    tempoh === p ? 'bg-card font-semibold shadow-sm dark:bg-accent dark:text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p === 60_000 ? t.minit : t.saat(p / 1000)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulatan nafas */}
        <div className="relative my-10 flex size-72 items-center justify-center sm:size-80">
          <div
            className="absolute inset-0 rounded-full bg-w2-lembut"
            style={{ transform: `scale(${Math.min(skala + 0.12, 1)})`, opacity: 0.6 }}
            aria-hidden
          />
          <div
            className="absolute inset-0 rounded-full shadow-[0_0_60px_-10px_var(--w2)]"
            style={{
              transform: `scale(${skala})`,
              background: 'radial-gradient(circle at 35% 30%, oklch(from var(--w2) calc(l + 0.12) c h), var(--w2) 70%)',
            }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center px-8 text-center text-white">
            {keadaan === 'jalan' || keadaan === 'jeda' ? (
              <>
                <p className="text-sm font-semibold opacity-90" aria-live="polite">{fasa === 'masuk' ? t.masuk : t.keluar}</p>
                {fasa === 'keluar' && (
                  <p dir="rtl" lang="ar" className="font-arab mt-2 text-3xl leading-[1.8]">أَسْتَغْفِرُ ٱللَّٰهَ</p>
                )}
                <p className="mt-2 text-xs tabular-nums opacity-80">{t.saat(bakiSaat)}</p>
              </>
            ) : keadaan === 'siap' ? (
              <p className="paparan text-2xl">{t.siap}</p>
            ) : (
              <p dir="rtl" lang="ar" className="font-arab text-3xl leading-[1.8]">أَسْتَغْفِرُ ٱللَّٰهَ</p>
            )}
          </div>
        </div>

        {/* Kemajuan: satu titik bagi setiap istighfar */}
        <div className="flex items-center gap-2" aria-label={t.kiraan(selesai, jumlah)}>
          {Array.from({ length: jumlah }, (_, i) => (
            <span
              key={i}
              className={cn('size-2.5 rounded-full transition-colors', i < selesai || keadaan === 'siap' ? 'bg-w2' : 'bg-muted')}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          {keadaan === 'siap' ? t.siapNota(jumlah) : keadaan === 'sedia' ? t.sedia : t.kiraan(selesai, jumlah)}
        </p>
        {keadaan !== 'sedia' && <p className="mt-1 text-xs italic text-muted-foreground">{t.makna}</p>}

        <div className="mt-8 flex gap-3">
          {keadaan === 'sedia' && (
            <button type="button" onClick={mula} className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm">
              <Play className="size-5" /> {t.mula}
            </button>
          )}
          {keadaan === 'jalan' && (
            <button type="button" onClick={() => setKeadaan('jeda')} className="flex items-center gap-2 rounded-full bg-muted px-6 py-3 text-sm font-semibold">
              <Pause className="size-4" /> {t.jeda}
            </button>
          )}
          {keadaan === 'jeda' && (
            <button type="button" onClick={() => setKeadaan('jalan')} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              <Play className="size-4" /> {t.sambung}
            </button>
          )}
          {(keadaan === 'jalan' || keadaan === 'jeda') && (
            <button type="button" onClick={henti} className="flex items-center gap-2 rounded-full bg-muted px-6 py-3 text-sm font-semibold">
              <Square className="size-4" /> {t.henti}
            </button>
          )}
          {keadaan === 'siap' && (
            <button type="button" onClick={mula} className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm">
              <RotateCcw className="size-5" /> {t.ulang}
            </button>
          )}
        </div>

      </div>
    </PageShell>
  );
}
