'use client';

import { toast } from 'sonner';
import { Clock3 } from 'lucide-react';
import SenaraiSolat from '@/components/SenaraiSolat';
import { useTeks } from '@/components/BahasaProvider';
import { useAmalanHariIni } from '@/components/useAmalanHariIni';
import type { WaktuSolat } from '@/lib/solat';

const TEKS = {
  ms: { tajuk: 'Solat hari ini', gagal: 'Rekod tidak dapat disimpan.' },
  en: { tajuk: "Today's prayers", gagal: "Couldn't save your record." },
};

/** Kad lima waktu di halaman utama, terikat kepada amalan Solat dan Zikir hari ini. */
export default function SolatHariIni({ waktu, kini }: { waktu: WaktuSolat; kini: Date }) {
  const t = useTeks(TEKS);
  const { amalan, log, tulis, ciptaSolat, adaAkaun } = useAmalanHariIni();
  const solat = amalan.find(a => a.jenis === 'solat');
  const zikir = amalan.find(a => a.jenis === 'zikir');

  return (
    <section className="mt-6">
      {/* Tajuk sama gaya dengan bahagian lain di halaman utama (Al-Quran, Peringatan). */}
      <h2 className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-w2-lembut text-w2">
          <Clock3 className="size-5" />
        </span>
        <span className="paparan text-2xl">{t.tajuk}</span>
      </h2>
    <SenaraiSolat
      waktu={waktu}
      kini={kini}
      hariLepas={false}
      tanpaNotaWaktu
      solat={solat}
      zikir={zikir}
      logSolat={solat ? log[solat.id] : undefined}
      logZikir={zikir ? log[zikir.id] : undefined}
      onTulis={(a, isi) => { tulis(a, isi).catch(() => toast.error(t.gagal)); }}
      ciptaSolat={adaAkaun ? () => ciptaSolat().catch(() => { toast.error(t.gagal); return undefined; }) : undefined}
    />
    </section>
  );
}
