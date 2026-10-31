'use client';

import { X } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';
import { useTeks } from '@/components/BahasaProvider';
import { palet } from '@/lib/aksen';
import type { Kamus } from '@/lib/bahasa';


const PEMBATAL_SOLAT: Kamus<string[]> = {
  ms: [
    'Keluar atau kedatangan hadas besar atau kecil.',
    'Berkata-kata dengan sengaja walau sedikit yang memberi faham, atau ketawa.',
    'Makan atau minum dengan sengaja.',
    'Melakukan pergerakan di luar rukun solat tiga kali berturut-turut (mutawaliyat).',
    'Berniat keluar dari solat (mufaraqah).',
    'Terkena najis yang tidak dimaafkan pada badan, pakaian, dan tempat solat.',
    'Beralih arah dari kiblat dengan sengaja (berpaling dada).',
    'Terbuka aurat dengan sengaja, atau tidak sengaja tetapi tidak segera ditutup.',
    'Berubah niat dari satu solat ke solat yang lain.',
    'Meninggalkan rukun solat.',
    'Murtad.',
  ],
  en: [
    'Incurring major or minor hadas.',
    'Speaking deliberately, even a little, in a way that conveys meaning, or laughing.',
    'Eating or drinking deliberately.',
    'Making movements outside the pillars of prayer three times in succession (mutawaliyat).',
    'Intending to leave the prayer (mufaraqah).',
    'Coming into contact with najis that is not pardoned, on the body, clothing or place of prayer.',
    'Deliberately turning away from the kiblat (turning the chest away).',
    'Exposing the aurat deliberately, or accidentally without covering it straight away.',
    'Changing the intention from one prayer to another.',
    'Leaving out a pillar (rukun) of prayer.',
    'Apostasy (murtad).',
  ],
};

const ms = {
  tajuk: 'Pembatal Solat',
  lede: 'Sebelas perkara yang membatalkan solat. Jika salah satu berlaku, solat perlu diulang dari awal.',
};
const en: typeof ms = {
  tajuk: 'Prayer Invalidators',
  lede: 'What invalidates prayer: eleven things that break a prayer. If any one of them happens, the prayer must be repeated from the beginning.',
};
const TEKS = { ms, en };

export default function PembatalSolatPage() {
  const t = useTeks(TEKS);
  const senarai = useTeks(PEMBATAL_SOLAT);

  return (
    <PageShell
      tajuk={t.tajuk}
      lede={t.lede}
    >
      {/* Ini satu senarai perkara, bukan urutan langkah — jadi nombor tidak
          sesuai. Tanda silang menyampaikan maksudnya terus; cipnya berputar
          warna supaya baris bersebelahan mudah dibezakan. */}
      <SenaraiSkrol className="max-w-3xl">
        <ul className="kad divide-y divide-border/50 px-4 sm:px-5">
          {senarai.map((item, i) => {
            const p = palet(i);
            return (
              <ItemSkrol key={item} className="flex items-start gap-4 py-4 sm:py-5">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${p.lembut} ${p.teks}`}>
                  <X className="size-5" strokeWidth={2.25} aria-hidden />
                </span>
                <p className="max-w-[62ch] pt-1.5 text-lg leading-snug lg:text-xl">{item}</p>
              </ItemSkrol>
            );
          })}
        </ul>
      </SenaraiSkrol>
    </PageShell>
  );
}
