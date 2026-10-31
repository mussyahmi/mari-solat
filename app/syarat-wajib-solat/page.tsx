'use client';

import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';
import { useTeks } from '@/components/BahasaProvider';
import { palet } from '@/lib/aksen';
import type { Kamus } from '@/lib/bahasa';


type Syarat = { name: string; note?: string };

const SYARAT_WAJIB: Kamus<Syarat[]> = {
  ms: [
    { name: 'Islam' },
    { name: 'Baligh' },
    {
      name: 'Berakal',
      note: 'Tidak wajib untuk orang bodoh (lemah akal), orang gila, dan orang nyanyuk.',
    },
    { name: 'Suci daripada haid dan nifas bagi perempuan' },
    {
      name: 'Ada pendengaran dan penglihatan',
      note: 'Tidak wajib untuk orang pekak dan buta sejak lahir. Jika pekak atau buta sahaja, masih wajib solat.',
    },
    {
      name: 'Terjaga dan teringat',
      note: 'Tidak wajib untuk orang tertidur dan terlupa. Wajib qada selepas terjaga dan teringat.',
    },
    { name: 'Sampai seruan Islam' },
  ],
  en: [
    { name: 'Islam (being a Muslim)' },
    { name: 'Baligh (having reached puberty)' },
    {
      name: 'Berakal (being of sound mind)',
      note: 'Not obligatory for those who are feeble-minded (weak of intellect), insane, or senile.',
    },
    { name: 'For women, being free from haid (menstruation) and nifas (post-natal bleeding)' },
    {
      name: 'Having hearing and sight',
      note: 'Not obligatory for someone who has been both deaf and blind since birth. Someone who is only deaf or only blind must still pray.',
    },
    {
      name: 'Being awake and not forgetful',
      note: 'Not obligatory for someone who is asleep or has forgotten. Qada becomes obligatory once they wake up or remember.',
    },
    { name: 'The call of Islam has reached them' },
  ],
};

const ms = {
  tajuk: 'Syarat Wajib Solat',
  lede: 'Tujuh syarat yang menjadikan solat wajib ke atas seseorang. Semuanya perlu dipenuhi serentak.',
  tonton: 'Tonton penerangan',
  tajukVideo: 'Penerangan syarat wajib solat',
};
const en: typeof ms = {
  tajuk: 'Obligation Conditions',
  lede: 'The conditions of obligation: seven conditions that make prayer obligatory upon a person. All of them must be met at the same time.',
  tonton: 'Watch the explanation (in Malay)',
  tajukVideo: 'Explanation of the conditions of obligation for prayer',
};
const TEKS = { ms, en };

export default function SyaratWajibSolatPage() {
  const t = useTeks(TEKS);
  const senarai = useTeks(SYARAT_WAJIB);

  return (
    <PageShell
      tajuk={t.tajuk}
      lede={t.lede}
    >
      {/* Satu kad, satu baris bagi setiap syarat; nombor berwarna memberi
          setiap syarat identitinya sendiri. */}
      <SenaraiSkrol className="max-w-3xl">
      <ul className="kad divide-y divide-border/50 px-4 sm:px-5">
        {senarai.map((syarat, i) => {
          const p = palet(i);
          return (
            <ItemSkrol key={syarat.name} className="flex items-start gap-4 py-4 sm:py-5">
              <span className={`angka-paparan flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg ${p.lembut} ${p.teks}`}>
                {i + 1}
              </span>
              <div className="min-w-0 pt-1.5">
                <p className="text-lg font-medium leading-snug lg:text-xl">{syarat.name}</p>
                {syarat.note && (
                  <p className="mt-1 max-w-[58ch] leading-relaxed text-muted-foreground">{syarat.note}</p>
                )}
              </div>
            </ItemSkrol>
          );
        })}
      </ul>
      </SenaraiSkrol>

      {/* Videonya menegak. Bingkai 16:9 selebar halaman hanya menghasilkan
          palang hitam yang besar, jadi bingkai mengikut nisbah video itu
          sendiri dan kadnya digugurkan seperti kad lain dalam aplikasi. */}
      <section className="mt-14">
        <h2 className="paparan text-2xl">{t.tonton}</h2>
        <div className="relative mt-5 aspect-[9/16] w-full max-w-xs overflow-hidden kad">
          <iframe
            src="https://www.youtube-nocookie.com/embed/UJqkAkh37pE"
            title={t.tajukVideo}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </section>
    </PageShell>
  );
}
