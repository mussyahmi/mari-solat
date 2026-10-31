import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { palet } from '@/lib/aksen';

/**
 * Kad ringkasan pada papan pemuka.
 *
 * Setiap satu menjawab satu soalan langsung — ke mana arah kiblat, kategori
 * mana sekarang, bila satu pertiga malam bermula — dan membuka halaman penuh
 * untuk selebihnya. Empat halaman "Waktu" sebelum ini bermakna empat lawatan
 * untuk satu solat.
 */
export default function ModulRingkas({
  href,
  tajuk,
  nilai,
  nota,
  ikon,
  aksen,
  warna = 0,
  children,
}: {
  href: string;
  tajuk: string;
  /** Jawapan langsung — perkara yang dicari orang. */
  nilai: React.ReactNode;
  nota?: React.ReactNode;
  ikon?: React.ReactNode;
  /** Tonjolkan bila modul ini sedang aktif. */
  aksen?: boolean;
  /** Indeks palet (lib/aksen) bagi cip ikon — setiap modul warnanya sendiri. */
  warna?: number;
  /** Visual pilihan di bawah nilai. */
  children?: React.ReactNode;
}) {
  const p = palet(warna);
  // Setiap modul ialah jubin warnanya sendiri (bukan kad putih seperti yang
  // lain), dengan ikon besar yang pudar sebagai tera air — supaya ringkasan
  // dibezakan daripada kandungan di sekelilingnya. Bila aktif, garis warna
  // menandakannya.
  return (
    <Link
      href={href}
      className={`group relative isolate flex flex-col overflow-hidden rounded-3xl p-5 shadow-[var(--bayang-kad)] transition-all hover:-translate-y-0.5 ${p.lembut}`}
      style={aksen ? { boxShadow: `inset 0 0 0 2px ${p.css}, var(--bayang-kad)` } : undefined}
    >
      {ikon && (
        <span aria-hidden className={`pointer-events-none absolute -bottom-7 -right-5 -z-10 rotate-[-12deg] opacity-[0.12] [&>svg]:size-32 ${p.teks}`}>
          {ikon}
        </span>
      )}

      <span className="flex items-center gap-3 text-sm font-semibold text-foreground/75">
        {ikon && (
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${p.pekat}`}>
            {ikon}
          </span>
        )}
        {tajuk}
        {aksen && <span className={`size-2 rounded-full ${p.pekat} animate-pulse`} aria-hidden />}
        <ChevronRight className="ml-auto size-4 opacity-40 transition-opacity group-hover:opacity-80" />
      </span>

      <span className={`mt-4 paparan text-3xl leading-none ${p.teks}`}>
        {nilai}
      </span>

      {nota && <span className="mt-2 text-sm text-foreground/70">{nota}</span>}
      {children}
    </Link>
  );
}
