import Sidebar from '@/components/Sidebar';

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
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-10 lg:px-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-display tracking-tight">Syarat Wajib Solat</h1>
          <p className="text-sm text-muted-foreground/70 mt-2">7 syarat yang mewajibkan seseorang untuk menunaikan solat.</p>
        </header>

        <div className="divide-y divide-border/50">
          {SYARAT_WAJIB.map((syarat, i) => (
            <div key={syarat.name} className="flex gap-4 py-5">
              <span className="text-sm font-bold text-muted-foreground/30 w-5 shrink-0 text-right mt-0.5">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm leading-snug">{syarat.name}</p>
                {syarat.note && (
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{syarat.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Video */}
        <div className="mt-10">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-widest mb-3 font-semibold">Tonton</p>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/40">
            <iframe
              src="https://www.youtube.com/embed/UJqkAkh37pE"
              title="Syarat Wajib Solat"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
