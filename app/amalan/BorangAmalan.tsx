'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { idBaru, SASARAN_SYAWAL, warnaAmalan, type Amalan, type ItemZikir, type Jadual } from '@/lib/amalan';
import { PALET } from '@/lib/aksen';
import { cn } from '@/lib/utils';
import { HARI } from '@/lib/bahasa';
import { useBahasa, useTeks } from '@/components/BahasaProvider';

type Draf = Omit<Amalan, 'id' | 'susunan'>;

const ms = {
  jenis: [
    { k: 'sasaran', nama: 'Sasaran harian', huraian: 'Kuantiti setiap hari. Yang tertinggal dibawa ke hari berikutnya.' },
    { k: 'solat', nama: 'Solat 5 waktu', huraian: 'Tandakan setiap solat fardu yang ditunaikan hari itu.' },
    { k: 'zikir', nama: 'Selepas solat', huraian: 'Senarai semak selepas setiap lima solat fardu.' },
    { k: 'jadual', nama: 'Hari tertentu', huraian: 'Selesai atau tidak, pada hari yang dijadualkan sahaja.' },
  ] as { k: Amalan['jenis']; nama: string; huraian: string }[],
  ubah: 'Ubah amalan',
  baru: 'Amalan baru',
  huraian: 'Tetapkan nama, jenis dan jadual amalan.',
  nama: 'Nama',
  warna: 'Warna',
  contohNama: 'cth. Membaca Al-Quran',
  jenisLabel: 'Jenis',
  sehari: 'Sehari',
  unit: 'Unit',
  unitLalai: 'muka surat',
  unitGanti: 'kali',
  selepasSolat: 'Selepas setiap solat',
  naik: 'Naik',
  turun: 'Turun',
  buang: 'Buang',
  contohZikir: 'cth. Selawat 10x',
  tambah: 'Tambah',
  bila: 'Bila',
  pilihanJadual: {
    hari: 'Hari dalam minggu',
    hijri: 'Tarikh Hijri',
    syawal: 'Puasa Enam Syawal',
    harian: 'Setiap hari',
  },
  syawal: (n: number) => `Mana-mana ${n} hari sepanjang Syawal. Hari yang tidak berpuasa tidak dikira terlepas.`,
  mula: 'Mula dijejak',
  mulaHuraian: 'Pilih tarikh lebih awal jika mahu memasukkan rekod lama dari kalendar.',
  padamSedia: 'Padam semua rekod?',
  padam: 'Padam',
  batal: 'Batal',
  simpan: 'Simpan',
};
const en: typeof ms = {
  jenis: [
    { k: 'sasaran', nama: 'Daily target', huraian: 'An amount each day. Anything missed carries over to the next day.' },
    { k: 'solat', nama: 'Five daily prayers', huraian: 'Tick each obligatory prayer as you pray it.' },
    { k: 'zikir', nama: 'After prayer', huraian: 'A checklist after each of the five daily prayers.' },
    { k: 'jadual', nama: 'Specific days', huraian: 'Done or not, on scheduled days only.' },
  ],
  ubah: 'Edit practice',
  baru: 'New practice',
  huraian: 'Set the name, type and schedule of the practice.',
  nama: 'Name',
  warna: 'Colour',
  contohNama: 'e.g. Reading the Quran',
  jenisLabel: 'Type',
  sehari: 'Per day',
  unit: 'Unit',
  unitLalai: 'pages',
  unitGanti: 'times',
  selepasSolat: 'After each prayer',
  naik: 'Move up',
  turun: 'Move down',
  buang: 'Remove',
  contohZikir: 'e.g. Selawat 10x',
  tambah: 'Add',
  bila: 'When',
  pilihanJadual: {
    hari: 'Days of the week',
    hijri: 'Hijri dates',
    syawal: 'Six days of Syawal',
    harian: 'Every day',
  },
  syawal: n => `Any ${n} days during Syawal. Days you don't fast aren't counted as missed.`,
  mula: 'Start tracking from',
  mulaHuraian: 'Choose an earlier date if you want to add past records from the calendar.',
  padamSedia: 'Delete all records?',
  padam: 'Delete',
  batal: 'Cancel',
  simpan: 'Save',
};
const TEKS = { ms, en };

const label = 'text-xs text-muted-foreground/60 uppercase tracking-widest';
const input = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring';
const cip = (aktif: boolean) => cn(
  'rounded-full border px-3 py-1.5 text-sm transition-colors',
  aktif ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
);

export default function BorangAmalan({
  buka,
  asal,
  hariIni,
  onTutup,
  onSimpan,
  onPadam,
}: {
  buka: boolean;
  /** Amalan sedia ada untuk diubah, atau null untuk amalan baru. */
  asal: Amalan | null;
  hariIni: string;
  onTutup: () => void;
  onSimpan: (d: Draf) => Promise<void>;
  onPadam?: () => Promise<void>;
}) {
  return (
    <Dialog open={buka} onOpenChange={b => !b && onTutup()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {/* Dilekap semula setiap kali dibuka supaya draf bermula dari asal. */}
        {buka && <Isi asal={asal} hariIni={hariIni} onTutup={onTutup} onSimpan={onSimpan} onPadam={onPadam} />}
      </DialogContent>
    </Dialog>
  );
}

function Isi({
  asal, hariIni, onTutup, onSimpan, onPadam,
}: {
  asal: Amalan | null;
  hariIni: string;
  onTutup: () => void;
  onSimpan: (d: Draf) => Promise<void>;
  onPadam?: () => Promise<void>;
}) {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [d, setD] = useState<Draf>(() => asal ? {
    nama: asal.nama, jenis: asal.jenis, sasaran: asal.sasaran, unit: asal.unit,
    item: asal.item, jadual: asal.jadual, mula: asal.mula, warna: warnaAmalan(asal),
  } : { nama: '', jenis: 'sasaran', sasaran: 1, unit: t.unitLalai, mula: hariIni });
  const [itemBaru, setItemBaru] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [padamSedia, setPadamSedia] = useState(false);

  const kemas = (ubah: Partial<Draf>) => setD(prev => ({ ...prev, ...ubah }));
  const item = d.item ?? [];
  const jadual: Jadual = d.jadual ?? { jenis: 'hari', hari: [1, 4] };

  const tambahItem = () => {
    const nama = itemBaru.trim();
    if (!nama) return;
    kemas({ item: [...item, { id: idBaru(), nama }] });
    setItemBaru('');
  };
  const alih = (i: number, arah: -1 | 1) => {
    const baru = [...item];
    [baru[i], baru[i + arah]] = [baru[i + arah], baru[i]];
    kemas({ item: baru });
  };

  const sah =
    d.nama.trim().length > 0 &&
    (d.jenis !== 'sasaran' || (d.sasaran ?? 0) >= 1) &&
    (d.jenis !== 'zikir' || item.length > 0) &&
    (d.jenis !== 'jadual' ||
      (jadual.jenis === 'hari' && jadual.hari.length > 0) ||
      (jadual.jenis === 'hijri' && jadual.tarikh.length > 0) ||
      jadual.jenis === 'syawal' || jadual.jenis === 'harian');

  const simpan = async () => {
    if (!sah) return;
    setMenyimpan(true);
    const bersih: Draf = { nama: d.nama.trim(), jenis: d.jenis, mula: d.mula };
    if (d.warna !== undefined) bersih.warna = d.warna;
    if (d.jenis === 'sasaran') { bersih.sasaran = d.sasaran; bersih.unit = d.unit?.trim() || t.unitGanti; }
    if (d.jenis === 'zikir') bersih.item = item;
    if (d.jenis === 'jadual') bersih.jadual = jadual;
    try { await onSimpan(bersih); } finally { setMenyimpan(false); }
  };

  return (
    <>
      <DialogTitle className="paparan text-2xl font-normal">{asal ? t.ubah : t.baru}</DialogTitle>
      <DialogDescription className="sr-only">{t.huraian}</DialogDescription>

      <div className="mt-2 space-y-7">
        <label className="block">
          <span className={label}>{t.nama}</span>
          <input
            className={cn(input, 'mt-2')}
            value={d.nama}
            onChange={e => kemas({ nama: e.target.value })}
            placeholder={t.contohNama}
            maxLength={60}
          />
        </label>

        <div>
          <span className={label}>{t.warna}</span>
          <div className="mt-2 flex gap-2.5">
            {PALET.map((w, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${t.warna} ${i + 1}`}
                aria-pressed={d.warna === i}
                onClick={() => kemas({ warna: i })}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-white transition-transform hover:scale-105',
                  w.pekat,
                  d.warna === i && 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                )}
              >
                {d.warna === i && <Check className="size-4" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* Jenis menentukan bagaimana rekod lama dinilai, jadi ia tidak
            boleh ditukar selepas amalan dicipta. */}
        {!asal && (
          <div>
            <span className={label}>{t.jenisLabel}</span>
            <div className="mt-2 divide-y divide-border/50 border-y border-border/50">
              {t.jenis.map(j => (
                <button
                  key={j.k}
                  type="button"
                  onClick={() => kemas({ jenis: j.k })}
                  className="flex w-full items-start gap-3 py-3 text-left"
                >
                  <span className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    d.jenis === j.k ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  )}>
                    {d.jenis === j.k && <Check className="size-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{j.nama}</span>
                    <span className="block text-sm text-muted-foreground">{j.huraian}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {d.jenis === 'sasaran' && (
          <div className="flex gap-3">
            <label className="w-28">
              <span className={label}>{t.sehari}</span>
              <input
                type="number" inputMode="numeric" min={1}
                className={cn(input, 'mt-2 tabular-nums')}
                value={d.sasaran ?? ''}
                onChange={e => kemas({ sasaran: Math.max(0, Math.floor(Number(e.target.value))) || undefined })}
              />
            </label>
            <label className="flex-1">
              <span className={label}>{t.unit}</span>
              <input className={cn(input, 'mt-2')} value={d.unit ?? ''} onChange={e => kemas({ unit: e.target.value })} placeholder={t.unitLalai} maxLength={20} />
            </label>
          </div>
        )}

        {d.jenis === 'zikir' && (
          <div>
            <span className={label}>{t.selepasSolat}</span>
            <ul className="mt-2 divide-y divide-border/50 border-y border-border/50">
              {item.map((it: ItemZikir, i) => (
                <li key={it.id} className="flex items-center gap-1 py-1.5">
                  <input
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
                    value={it.nama}
                    onChange={e => kemas({ item: item.map(x => x.id === it.id ? { ...x, nama: e.target.value } : x) })}
                    maxLength={60}
                  />
                  <button type="button" aria-label={t.naik} disabled={i === 0} onClick={() => alih(i, -1)} className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label={t.turun} disabled={i === item.length - 1} onClick={() => alih(i, 1)} className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowDown className="size-4" /></button>
                  <button type="button" aria-label={t.buang} onClick={() => kemas({ item: item.filter(x => x.id !== it.id) })} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                className={input}
                value={itemBaru}
                onChange={e => setItemBaru(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); tambahItem(); } }}
                placeholder={t.contohZikir}
                maxLength={60}
              />
              <button type="button" onClick={tambahItem} disabled={!itemBaru.trim()} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:opacity-40">
                <Plus className="size-4" /> {t.tambah}
              </button>
            </div>
          </div>
        )}

        {d.jenis === 'jadual' && (
          <div>
            <span className={label}>{t.bila}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['hari', 'hijri', 'syawal', 'harian'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  className={cip(jadual.jenis === k)}
                  onClick={() => kemas({
                    jadual: k === 'hari' ? { jenis: 'hari', hari: [1, 4] }
                      : k === 'hijri' ? { jenis: 'hijri', tarikh: [13, 14, 15] }
                        : { jenis: k },
                  })}
                >
                  {t.pilihanJadual[k]}
                </button>
              ))}
            </div>

            {jadual.jenis === 'hari' && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map(h => {
                  const ada = jadual.hari.includes(h);
                  return (
                    <button key={h} type="button" className={cip(ada)} onClick={() => kemas({
                      jadual: { jenis: 'hari', hari: ada ? jadual.hari.filter(x => x !== h) : [...jadual.hari, h] },
                    })}>
                      {HARI[bahasa][h]}
                    </button>
                  );
                })}
              </div>
            )}

            {jadual.jenis === 'hijri' && (
              <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                {Array.from({ length: 30 }, (_, i) => i + 1).map(t => {
                  const ada = jadual.tarikh.includes(t);
                  return (
                    <button key={t} type="button" className={cn(cip(ada), 'px-0 tabular-nums')} onClick={() => kemas({
                      jadual: { jenis: 'hijri', tarikh: ada ? jadual.tarikh.filter(x => x !== t) : [...jadual.tarikh, t] },
                    })}>
                      {t}
                    </button>
                  );
                })}
              </div>
            )}

            {jadual.jenis === 'syawal' && (
              <p className="mt-4 text-sm text-muted-foreground">
                {t.syawal(SASARAN_SYAWAL)}
              </p>
            )}
          </div>
        )}

        <label className="block">
          <span className={label}>{t.mula}</span>
          <input
            type="date"
            className={cn(input, 'mt-2')}
            value={d.mula}
            max={hariIni}
            onChange={e => e.target.value && kemas({ mula: e.target.value })}
          />
          <span className="mt-2 block text-sm text-muted-foreground">
            {t.mulaHuraian}
          </span>
        </label>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        {asal && onPadam ? (
          <button
            type="button"
            onClick={async () => { if (!padamSedia) { setPadamSedia(true); return; } await onPadam(); }}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors',
              padamSedia ? 'bg-destructive text-white' : 'text-muted-foreground hover:text-destructive'
            )}
          >
            <Trash2 className="size-4" />
            {padamSedia ? t.padamSedia : t.padam}
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onTutup} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">{t.batal}</button>
          <button
            type="button"
            onClick={simpan}
            disabled={!sah || menyimpan}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {t.simpan}
          </button>
        </div>
      </div>
    </>
  );
}
