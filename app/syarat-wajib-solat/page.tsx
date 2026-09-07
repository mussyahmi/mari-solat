import PageShell from '@/components/PageShell';
import { SenaraiSkrol, ItemSkrol } from '@/components/SenaraiSkrol';


const SYARAT_WAJIB: { name: string; note?: string }[] = [
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
];

export default function SyaratWajibSolatPage() {
  return (
    <PageShell
      tajuk="Syarat Wajib Solat"
      lede="Tujuh syarat yang menjadikan solat wajib ke atas seseorang. Semuanya perlu dipenuhi serentak."
    >
      <SenaraiSkrol>
      <ul className="divide-y divide-border/50">
        {SYARAT_WAJIB.map(syarat => (
          <ItemSkrol key={syarat.name} className="py-9 lg:py-11">
            <div className="min-w-0">
              <p className="text-xl font-medium leading-snug lg:text-2xl">{syarat.name}</p>
              {syarat.note && (
                <p className="mt-1 max-w-[58ch] leading-relaxed text-muted-foreground">{syarat.note}</p>
              )}
            </div>
          </ItemSkrol>
        ))}
      </ul>
      </SenaraiSkrol>

      {/* Videonya menegak. Bingkai 16:9 selebar halaman hanya menghasilkan
          palang hitam yang besar, jadi bingkai mengikut nisbah video itu
          sendiri dan kadnya digugurkan seperti kad lain dalam aplikasi. */}
      <section className="mt-20">
        <h2 className="paparan text-2xl">Tonton penerangan</h2>
        <div className="relative mt-5 aspect-[9/16] w-full max-w-xs overflow-hidden rounded-2xl">
          <iframe
            src="https://www.youtube-nocookie.com/embed/UJqkAkh37pE"
            title="Penerangan syarat wajib solat"
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
