'use client';

import { useState } from 'react';
import { Bookmark, Check, Minus, Plus } from 'lucide-react';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { GRADIEN_UTAMA, palet, PALET_UTAMA } from '@/lib/aksen';
import { bakiSebelum, unitPapar, warnaAmalan, type Amalan, type LogHari, type LogTahun } from '@/lib/amalan';
import { namaSurah, pautanAyat, SURAH } from '@/lib/surah';
import { cn } from '@/lib/utils';

const ms = {
  dibaca: 'Dibaca hari ini',
  belum: 'Belum dibaca',
  dibacaSemalam: 'Dibaca',
  belumLepas: 'Tidak dibaca',
  dibacaUnit: (u: string) => `${u[0].toUpperCase()}${u.slice(1)} dibaca`,
  perlu: (n: number, u: string, sasaran: number) => `Perlu ${n} ${u} · ${sasaran} + `,
  baki: (n: number) => `baki ${n}`,
  dilunas: (n: number) => `Baki ${n} dilunaskan`,
  terakhir: 'Bacaan terakhir',
  tiadaPenanda: 'Belum ditanda',
  kemasKini: 'Kemas kini',
  buka: 'Buka',
  tolak: 'Kurang satu',
  tambah: 'Tambah satu',
  tajukPenanda: 'Bacaan terakhir',
  huraianPenanda: 'Pilih surah dan ayat tempat anda berhenti membaca.',
  surah: 'Surah',
  ayat: (n: number) => `Ayat (1–${n})`,
  simpan: 'Simpan',
  batal: 'Batal',
};
const en: typeof ms = {
  dibaca: 'Recited today',
  belum: 'Not read yet',
  dibacaSemalam: 'Recited',
  belumLepas: 'Not read',
  dibacaUnit: u => `${u[0].toUpperCase()}${u.slice(1)} read`,
  perlu: (n, u, sasaran) => `Need ${n} ${u} · ${sasaran} + `,
  baki: n => `${n} backlog`,
  dilunas: n => `Cleared a backlog of ${n}`,
  terakhir: 'Last read',
  tiadaPenanda: 'Not set',
  kemasKini: 'Update',
  buka: 'Open',
  tolak: 'One less',
  tambah: 'One more',
  tajukPenanda: 'Last read',
  huraianPenanda: 'Choose the surah and ayah where you stopped reading.',
  surah: 'Surah',
  ayat: n => `Ayah (1–${n})`,
  simpan: 'Save',
  batal: 'Cancel',
};
const TEKS = { ms, en };

/**
 * Kad khas bacaan Al-Quran: tanda selesai yang besar, pengira muka surat,
 * dan penanda bacaan terakhir yang membuka terus ayat itu di Quran.com.
 * Dikongsi oleh Jejak Amalan dan halaman utama supaya kedua-duanya menulis
 * rekod yang sama.
 */
export default function KadQuran({
  a, s, hariIni, log, onTulis, onUbah, tunjukNama = true, seragam = false,
}: {
  a: Amalan;
  s: string;
  hariIni: string;
  log: LogTahun;
  onTulis: (isi: LogHari) => void;
  onUbah: (ubah: Partial<Amalan>) => void;
  tunjukNama?: boolean;
  /** Jejak Ibadah: warna tema dan kad putih, sama seperti amalan lain. */
  seragam?: boolean;
}) {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [ubahPenanda, setUbahPenanda] = useState(false);
  const p = seragam ? PALET_UTAMA : palet(warnaAmalan(a));

  const sasaran = a.sasaran ?? 1;
  const baki = bakiSebelum(a, log, s, hariIni);
  const perlu = sasaran + baki;
  const dibuat = log[s]?.jumlah ?? 0;
  const siap = dibuat >= perlu;
  const set = (n: number) => onTulis({ jumlah: Math.max(0, n) });
  const unit = unitPapar(a.unit, bahasa, perlu);
  const hariIniDipilih = s === hariIni;
  const status = siap
    ? (hariIniDipilih ? t.dibaca : t.dibacaSemalam)
    : (hariIniDipilih ? t.belum : t.belumLepas);

  return (
    <div
      className={cn('rounded-3xl border p-4 shadow-[var(--bayang-kad)] transition-colors duration-500', seragam ? (siap ? 'bg-accent/70' : 'border-border/70 bg-card') : p.lembut)}
      style={seragam ? (siap ? { borderColor: 'oklch(from var(--primary) l c h / 0.35)' } : undefined) : { borderColor: `oklch(from ${p.css} l c h / 0.3)` }}
    >

      <div className="flex items-center gap-3">
        <span
          className={cn('relative flex size-14 shrink-0 items-center justify-center rounded-full transition-colors', siap ? (seragam ? cn('shadow-sm', p.teks) : 'text-white') : 'border-[3px] bg-card')}
          style={siap ? { background: seragam ? GRADIEN_UTAMA : p.css } : { borderColor: `oklch(from ${p.css} l c h / 0.35)` }}
        >
          {siap ? <Check className="size-7" strokeWidth={3} /> : <IkonMushaf warna={p.css} />}
        </span>

        <div className="min-w-0 flex-1">
          {/* Dalam Jejak Ibadah, tajuk ialah nama amalan seperti kad lain dan
              status turun ke baris kedua; di halaman utama tajuk bahagian
              sudah menamakannya, jadi status menjadi tajuk. */}
          <p className="truncate text-lg font-bold leading-tight">
            {tunjukNama ? a.nama : status}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tunjukNama && <span className={cn('font-medium', siap ? p.teks : 'text-foreground/70')}>{status} · </span>}
            {siap && baki > 0 ? (
              <span className="text-amaran">{t.dilunas(baki)}</span>
            ) : baki > 0 ? (
              <>{t.perlu(perlu, unit, sasaran)}<span className="text-amaran">{t.baki(baki)}</span></>
            ) : (
              t.dibacaUnit(unitPapar(a.unit, bahasa, 2))
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center rounded-full border border-border/60 bg-card shadow-sm">
          <button type="button" aria-label={t.tolak} disabled={dibuat === 0} onClick={() => set(dibuat - 1)} className="flex size-10 items-center justify-center rounded-full disabled:opacity-30">
            <Minus className="size-4" />
          </button>
          <span className="angka-paparan w-7 text-center text-xl">{dibuat}</span>
          <button type="button" aria-label={t.tambah} onClick={() => set(dibuat + 1)} className={cn('flex size-10 items-center justify-center rounded-full', p.teks)}>
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Penanda bacaan — tempat untuk menyambung, bukan sebahagian rekod harian. */}
      <div className="mt-4 flex items-center gap-2 border-t border-foreground/5 pt-3 text-sm">
        <Bookmark className={cn('size-4 shrink-0', p.teks)} />
        <span className="text-muted-foreground">{t.terakhir}:</span>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {a.penanda ? `${namaSurah(a.penanda.surah)} ${a.penanda.surah}:${a.penanda.ayat}` : t.tiadaPenanda}
        </span>
        <button type="button" onClick={() => setUbahPenanda(true)} className={cn('shrink-0 font-semibold', p.teks)}>
          {t.kemasKini}
        </button>
        {a.penanda && (
          <a
            href={pautanAyat(a.penanda.surah, a.penanda.ayat)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('shrink-0 font-semibold underline underline-offset-4', p.teks)}
          >
            {t.buka}
          </a>
        )}
      </div>

      <Dialog open={ubahPenanda} onOpenChange={setUbahPenanda}>
        <DialogContent className="sm:max-w-sm">
          {ubahPenanda && (
            <BorangPenanda
              asal={a.penanda}
              t={t}
              onBatal={() => setUbahPenanda(false)}
              onSimpan={penanda => { onUbah({ penanda }); setUbahPenanda(false); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Mushaf terbuka di atas rehal — ilustrasi kecil dalam bulatan sebelum bacaan hari ini selesai. */
function IkonMushaf({ warna }: { warna: string }) {
  return (
    <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
      {/* Rehal: dua kaki bersilang di bawah mushaf. */}
      <path d="M9 28 L22 18 M23 28 L10 18" stroke={warna} strokeWidth="2.2" strokeLinecap="round" />
      {/* Halaman kiri dan kanan. */}
      <path d="M16 11 C12.5 8.6 8.5 8.4 4.5 9.6 V20.6 C8.5 19.4 12.5 19.6 16 22 Z" fill="#fff" stroke={warna} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 11 C19.5 8.6 23.5 8.4 27.5 9.6 V20.6 C23.5 19.4 19.5 19.6 16 22 Z" style={{ fill: `oklch(from ${warna} l c h / 0.18)` }} stroke={warna} strokeWidth="1.6" strokeLinejoin="round" />
      {/* Baris tulisan. */}
      <path d="M7.5 12.6 C9.6 12.1 11.6 12.2 13.5 13 M7.5 15.4 C9.6 14.9 11.6 15 13.5 15.8 M18.5 13 C20.4 12.2 22.4 12.1 24.5 12.6 M18.5 15.8 C20.4 15 22.4 14.9 24.5 15.4" stroke={warna} strokeOpacity=".55" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Bintang kecil di atas. */}
      <path d="M16 3.2 l.7 1.6 1.6 .7 -1.6 .7 -.7 1.6 -.7 -1.6 -1.6 -.7 1.6 -.7z" fill="#ffc94a" />
    </svg>
  );
}

function BorangPenanda({
  asal, t, onBatal, onSimpan,
}: {
  asal?: { surah: number; ayat: number };
  t: typeof ms;
  onBatal: () => void;
  onSimpan: (p: { surah: number; ayat: number }) => void;
}) {
  const [surah, setSurah] = useState(asal?.surah ?? 1);
  const [ayat, setAyat] = useState(String(asal?.ayat ?? 1));
  const maks = SURAH[surah - 1][1];
  const n = Number(ayat);
  const sah = Number.isInteger(n) && n >= 1 && n <= maks;
  const medan = 'mt-2 w-full rounded-2xl bg-muted px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <>
      <DialogTitle className="paparan text-xl font-normal">{t.tajukPenanda}</DialogTitle>
      <DialogDescription>{t.huraianPenanda}</DialogDescription>
      <label className="block">
        <span className="text-sm font-medium">{t.surah}</span>
        <select
          value={surah}
          onChange={e => { const s = Number(e.target.value); setSurah(s); if (Number(ayat) > SURAH[s - 1][1]) setAyat('1'); }}
          className={medan}
        >
          {SURAH.map(([nama], i) => <option key={i} value={i + 1}>{i + 1}. {nama}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t.ayat(maks)}</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={maks}
          value={ayat}
          onChange={e => setAyat(e.target.value)}
          className={cn(medan, 'tabular-nums', !sah && 'ring-2 ring-destructive')}
        />
      </label>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onBatal} className="rounded-full bg-muted px-4 py-2 text-sm font-medium">{t.batal}</button>
        <button
          type="button"
          disabled={!sah}
          onClick={() => onSimpan({ surah, ayat: n })}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {t.simpan}
        </button>
      </div>
    </>
  );
}
