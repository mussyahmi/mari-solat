import Sidebar from '@/components/Sidebar';

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
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-10 lg:px-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-display tracking-tight">Syarat Sah Solat</h1>
          <p className="text-sm text-muted-foreground/70 mt-2">5 syarat sah solat seseorang.</p>
        </header>

        <div className="divide-y divide-border/50">
          {SYARAT_SAH.map((item, i) => (
            <div key={item.name} className="flex gap-4 py-5">
              <span className="text-sm font-bold text-muted-foreground/30 w-5 shrink-0 text-right mt-0.5">{i + 1}</span>
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium leading-snug">{item.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                {item.quote && (
                  <blockquote className="border-l-2 border-border pl-3 mt-2">
                    <p className="text-xs text-muted-foreground/70 italic leading-relaxed">"{item.quote.text}"</p>
                    <p className="text-xs text-muted-foreground/40 mt-1">{item.quote.source}</p>
                  </blockquote>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Nota */}
        <div className="mt-8 rounded-lg bg-muted/50 border border-border/50 px-4 py-3">
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            <span className="font-semibold text-muted-foreground">Nota:</span> Sekiranya sesudah tamat solat lalu disedari salah satu syarat di atas tidak dipenuhi — misalnya didapati ada najis di sejadah — maka perlulah diulangi solat tersebut kerana ia tidak menepati syarat sah solat.
          </p>
        </div>
      </main>
    </div>
  );
}
