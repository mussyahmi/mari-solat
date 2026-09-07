import { X } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';


const PEMBATAL_SOLAT = [
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
];

export default function PembatalSolatPage() {
  return (
    <PageShell
      tajuk="Pembatal Solat"
      lede="Sebelas perkara yang membatalkan solat. Jika salah satu berlaku, solat perlu diulang dari awal."
    >
      {/* Ini satu senarai perkara, bukan urutan langkah — jadi nombor tidak
          sesuai. Tanda silang menyampaikan maksudnya terus. */}
      <SenaraiSkrol>
        <ul className="divide-y divide-border/50">
          {PEMBATAL_SOLAT.map(item => (
            <ItemSkrol key={item} className="flex gap-4 py-9 lg:py-11">
              <X className="mt-1.5 size-4 shrink-0 text-destructive" aria-hidden />
              <p className="max-w-[62ch] text-xl leading-relaxed lg:text-2xl">{item}</p>
            </ItemSkrol>
          ))}
        </ul>
      </SenaraiSkrol>
    </PageShell>
  );
}
