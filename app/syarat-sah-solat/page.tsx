import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';


const SYARAT_SAH: {
  name: string;
  desc: string;
  quote?: { text: string; source: string };
}[] = [
  {
    name: 'Suci daripada hadas besar dan kecil',
    desc: 'Seseorang itu telah berwuduk dan mandi hadas.',
    quote: {
      text: 'Allah SWT tidak menerima solat mereka yang berhadas sehingga dia berwudhu\'.',
      source: 'Hadis riwayat Imam Bukhari, No. 6954',
    },
  },
  {
    name: 'Suci badan, pakaian, dan tempat solat daripada najis',
    desc: 'Wajib suci pakaian dan tempat solat daripada najis, kecuali najis yang dimaafkan seperti darah yang sedikit atau kotoran yang melekat pada kaki — najis yang dimaafkan tidak membatalkan solat.',
  },
  {
    name: 'Menutup aurat',
    desc: 'Aurat wanita ialah seluruh tubuh kecuali muka dan kedua tapak tangan. Aurat lelaki ialah antara pusat hingga lutut.',
    quote: {
      text: 'Wahai anak-anak Adam! Pakailah pakaian kamu yang indah berhias pada tiap-tiap kali kamu ke tempat ibadat (atau mengerjakan sembahyang).',
      source: 'Al-A\'raf: 31',
    },
  },
  {
    name: 'Menghadap kiblat',
    desc: 'Diwajibkan menghadap kiblat iaitu Kaabah.',
    quote: {
      text: 'Oleh itu palingkanlah mukamu ke arah Masjid Al-Haraam (tempat letaknya Kaabah).',
      source: 'Al-Baqarah: 144',
    },
  },
  {
    name: 'Yakin waktu solat telah masuk',
    desc: 'Yakin bahawa waktu solat fardu yang hendak dilaksanakan telah masuk.',
  },
];

export default function SyaratSahSolatPage() {
  return (
    <PageShell
      tajuk="Syarat Sah Solat"
      lede="Lima syarat yang menentukan sama ada solat itu sah. Jika satu tidak dipenuhi, solat perlu diulang."
    >
      <SenaraiSkrol>
      <ul className="divide-y divide-border/50">
        {SYARAT_SAH.map(item => (
          <ItemSkrol key={item.name} className="py-9 lg:py-12">
            <div className="min-w-0">
              <p className="text-xl font-medium leading-snug lg:text-2xl">{item.name}</p>
              <p className="mt-1.5 max-w-[58ch] leading-relaxed text-muted-foreground">{item.desc}</p>
              {item.quote && (
                <blockquote className="mt-3 border-l-2 border-primary/30 pl-4">
                  <p className="max-w-[54ch] text-sm italic leading-relaxed text-muted-foreground">
                    {item.quote.text}
                  </p>
                  <cite className="mt-1.5 block text-xs not-italic text-muted-foreground">{item.quote.source}</cite>
                </blockquote>
              )}
            </div>
          </ItemSkrol>
        ))}
      </ul>
      </SenaraiSkrol>

      <section className="mt-20 max-w-[68ch]">
        <h2 className="paparan text-2xl">Jika disedari selepas solat</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Jika anda menyedari selepas selesai solat bahawa salah satu syarat ini tidak dipenuhi,
          contohnya ada najis pada sejadah, solat itu perlu diulang kerana ia tidak menepati
          syarat sah.
        </p>
      </section>
    </PageShell>
  );
}
