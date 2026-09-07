type RukunType = "fi'li" | 'qauli' | 'qalbi';

/**
 * Tiga kategori rukun.
 *
 * Sebelum ini setiap satu ialah cip berwarna penuh dengan tooltip, dan
 * maknanya diulang tiga kali: dalam legenda di atas halaman, pada cip itu
 * sendiri, dan sekali lagi di dalam tooltip. Ia kini satu label kecil di bawah
 * nama rukun — warna kekal membezakan kategori, tetapi tanpa cip mahupun
 * legenda berasingan.
 */
const TYPE_META: Record<RukunType, { label: string; description: string; warna: string }> = {
  "fi'li": {
    label: "Fi'li",
    description: 'perbuatan',
    warna: 'text-rukun-filii',
  },
  qauli: {
    label: 'Qauli',
    description: 'diucap dengan lidah',
    warna: 'text-rukun-qauli',
  },
  qalbi: {
    label: 'Qalbi',
    description: 'diingat dalam hati',
    warna: 'text-rukun-qalbi',
  },
};

export function RukunLabel({ type }: { type: RukunType }) {
  const meta = TYPE_META[type];
  return (
    <span className={`mt-2 block text-sm ${meta.warna}`}>
      {meta.label} — {meta.description}
    </span>
  );
}

export { TYPE_META };
export type { RukunType };
