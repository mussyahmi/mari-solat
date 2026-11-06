'use client';

import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';
import { useTeks } from '@/components/BahasaProvider';
import { palet } from '@/lib/aksen';
import type { Kamus } from '@/lib/bahasa';


type Syarat = {
  name: string;
  desc: string;
  quote?: { text: string; source: string };
};

const SYARAT_SAH: Kamus<Syarat[]> = {
  ms: [
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
      desc: 'Wajib suci pakaian dan tempat solat daripada najis, kecuali najis yang dimaafkan seperti darah yang sedikit atau kotoran yang melekat pada kaki. Najis yang dimaafkan tidak membatalkan solat.',
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
  ],
  en: [
    {
      name: 'Being free from major and minor hadas',
      desc: 'The person has performed wuduk and mandi hadas (the obligatory bath).',
      quote: {
        text: 'Allah SWT does not accept the prayer of one who is in a state of hadas until he performs wuduk.',
        source: 'Hadith narrated by Imam Bukhari, No. 6954',
      },
    },
    {
      name: 'Body, clothing and place of prayer free from najis',
      desc: 'Clothing and the place of prayer must be free from najis, except for pardoned najis such as a small amount of blood or dirt stuck to the feet. Pardoned najis does not invalidate the prayer.',
    },
    {
      name: 'Covering the aurat',
      desc: 'A woman\'s aurat is her whole body except the face and both palms. A man\'s aurat is between the navel and the knees.',
      quote: {
        text: 'O children of Adam! Put on your fine adornment every time you go to a place of worship (or perform prayer).',
        source: 'Al-A\'raf: 31',
      },
    },
    {
      name: 'Facing the kiblat (qibla)',
      desc: 'It is obligatory to face the kiblat, that is, the Kaabah.',
      quote: {
        text: 'So turn your face towards Al-Masjid Al-Haraam (where the Kaabah stands).',
        source: 'Al-Baqarah: 144',
      },
    },
    {
      name: 'Being certain the prayer time has begun',
      desc: 'Being certain that the time for the obligatory (fardu) prayer you are about to perform has begun.',
    },
  ],
};

const ms = {
  tajuk: 'Syarat Sah Solat',
  lede: 'Lima syarat yang menentukan sama ada solat itu sah. Jika satu tidak dipenuhi, solat perlu diulang.',
  selepasTajuk: 'Jika disedari selepas solat',
  selepasIsi:
    'Jika anda menyedari selepas selesai solat bahawa salah satu syarat ini tidak dipenuhi, ' +
    'contohnya ada najis pada sejadah, solat itu perlu diulang kerana ia tidak menepati ' +
    'syarat sah.',
};
const en: typeof ms = {
  tajuk: 'Validity Conditions',
  lede: 'The conditions of validity: five conditions that determine whether a prayer is valid. If any one is not met, the prayer must be repeated.',
  selepasTajuk: 'If you realise after praying',
  selepasIsi:
    'If you realise after finishing a prayer that one of these conditions was not met ' +
    '(for example, there was najis on the prayer mat), the prayer must be repeated, because ' +
    'it did not meet the conditions of validity.',
};
const TEKS = { ms, en };

export default function SyaratSahSolatPage() {
  const t = useTeks(TEKS);
  const senarai = useTeks(SYARAT_SAH);

  return (
    <PageShell
      tajuk={t.tajuk}
      lede={t.lede}
    >
      {/* Setiap syarat membawa huraian dan dalil, jadi setiap satu mendapat
          kadnya sendiri; dalil duduk dalam blok berwarna lembut sepadan. */}
      <SenaraiSkrol className="max-w-3xl">
      <ul className="space-y-3">
        {senarai.map((item, i) => {
          const p = palet(i);
          return (
            <ItemSkrol key={item.name} className="kad flex items-start gap-4 p-4 sm:p-5">
              <span className={`angka-paparan flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg ${p.lembut} ${p.teks}`}>
                {i + 1}
              </span>
              <div className="min-w-0 pt-1.5">
                <p className="text-lg font-medium leading-snug lg:text-xl">{item.name}</p>
                <p className="mt-1.5 max-w-[58ch] leading-relaxed text-muted-foreground">{item.desc}</p>
                {item.quote && (
                  <blockquote className={`mt-4 rounded-2xl px-4 py-3 ${p.lembut}`}>
                    <p className="max-w-[54ch] text-sm italic leading-relaxed text-foreground/80">
                      {item.quote.text}
                    </p>
                    <cite className={`mt-1.5 block text-xs font-medium not-italic ${p.teks}`}>{item.quote.source}</cite>
                  </blockquote>
                )}
              </div>
            </ItemSkrol>
          );
        })}
      </ul>
      </SenaraiSkrol>

      <section className="mt-10 max-w-3xl rounded-3xl bg-amaran-lembut p-5 sm:p-6">
        <h2 className="paparan text-2xl text-amaran">{t.selepasTajuk}</h2>
        <p className="mt-3 max-w-[68ch] leading-relaxed text-foreground/80">
          {t.selepasIsi}
        </p>
      </section>
    </PageShell>
  );
}
