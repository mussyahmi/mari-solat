/**
 * Tanda MariSolat.
 *
 * Tanda lama ialah lengkung dengan matahari menunggangnya — ia dilukis ketika
 * lengkung itu masih menjadi idea aplikasi. Lengkung itu sudah tiada di setiap
 * skrin, jadi tanda itu menggambarkan sesuatu yang tidak lagi wujud.
 *
 * Identiti kini bersifat taipografi: satu muka huruf, tiada ilustrasi. Tanda
 * ini mengikutinya — huruf pertama nama, dengan titik bertindih yang sama
 * seperti pemisah pada kiraan detik di halaman utama. Ia membaca sebagai nama
 * dan sebagai masa serentak, dan pada dua glif ia masih terbaca pada 16px.
 */

export function LogoMark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <span
      className={`inline-flex select-none items-center justify-center rounded-[22%] bg-primary paparan leading-none text-primary-foreground ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      style={{ fontVariationSettings: "'wght' 600, 'opsz' 144, 'SOFT' 60, 'WONK' 1" }}
    >
      <span aria-hidden>
        M<span className="opacity-45">:</span>
      </span>
    </span>
  );
}

export default function Logo({
  className = '',
  tagline = false,
}: {
  className?: string;
  /** Tunjukkan baris "Waktu solat Malaysia" di bawah nama. */
  tagline?: boolean;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-8 shrink-0 text-[1.05rem]" title="MariSolat" />
      <span className="flex flex-col leading-none">
        <span
          className="paparan text-[1.375rem] "
          style={{ fontVariationSettings: "'wght' 600, 'opsz' 144, 'SOFT' 60, 'WONK' 1" }}
        >
          Mari<span className="text-primary">:</span>Solat
        </span>
        {tagline && <span className="mt-1 text-xs text-muted-foreground">Waktu solat Malaysia</span>}
      </span>
    </span>
  );
}
