import Sidebar from '@/components/Sidebar';

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
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-10 lg:px-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-display tracking-tight">Pembatal Solat</h1>
          <p className="text-sm text-muted-foreground/70 mt-2">11 perkara yang membatalkan solat.</p>
        </header>

        <div className="divide-y divide-border/50">
          {PEMBATAL_SOLAT.map((item, i) => (
            <div key={i} className="flex gap-4 py-5">
              <span className="text-sm font-bold text-muted-foreground/30 w-5 shrink-0 text-right mt-0.5">{i + 1}</span>
              <p className="text-sm leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
