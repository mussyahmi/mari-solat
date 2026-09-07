import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

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
  /** Visual pilihan di bawah nilai. */
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border px-5 py-4 transition-colors ${
        aksen ? 'border-primary/40 bg-accent/40 hover:bg-accent/60' : 'border-border/60 hover:bg-muted/50'
      }`}
    >
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {ikon}
        {tajuk}
        <ChevronRight className="ml-auto size-4 opacity-0 transition-opacity group-hover:opacity-60" />
      </span>

      <span className={`mt-2 paparan text-3xl leading-none  ${aksen ? 'text-primary' : ''}`}>
        {nilai}
      </span>

      {nota && <span className="mt-2 text-sm text-muted-foreground">{nota}</span>}
      {children}
    </Link>
  );
}
