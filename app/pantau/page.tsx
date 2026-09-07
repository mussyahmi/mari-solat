'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { auth } from '@/firebase';
import { fetchVisits } from '@/lib/track';

import PageShell from '@/components/PageShell';
import { Skeleton } from '@/components/ui/skeleton';

const VisitorMap = dynamic(() => import('@/components/VisitorMap'), { ssr: false });

type Visit = {
  uuid: string;
  lat: string;
  lng: string;
  zone: string;
  timestamp: string;
  ua: string;
};

function UaCell({ ua }: { ua: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const short = ua.slice(0, 32) + (ua.length > 32 ? '…' : '');

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="text-left text-muted-foreground hover:text-foreground transition font-mono">
        {short}
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-80 rounded-lg border border-border bg-background p-3 shadow-lg text-xs text-muted-foreground break-all">
          {ua}
        </div>
      )}
    </div>
  );
}

export default function PantauPage() {
  const [rows, setRows] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [ditolak, setDitolak] = useState(false);

  // Data ini tidak lagi boleh dibaca dari klien, jadi halaman perlu token ID
  // untuk memintanya daripada pelayan. Hanya UID dalam ADMIN_UIDS diterima.
  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u);
      if (!u) { setLoading(false); return; }
      setLoading(true);
      try {
        setRows(await fetchVisits(await u.getIdToken()));
        setDitolak(false);
      } catch (e) {
        if ((e as Error).message === 'tidak-dibenarkan') setDitolak(true);
        else setError('Gagal memuatkan data.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  // Bukan "pengguna": UUID hidup dalam localStorage, jadi ia mengira profil
  // pelayar yang belum dikosongkan. Aplikasi yang dipasang mendapat storan
  // berasingan daripada Safari, tetingkap peribadi bermula kosong, dan ITP
  // Safari memadam localStorage selepas tujuh hari tanpa interaksi — satu
  // orang boleh muncul beberapa kali. "Peranti" ialah dakwaan yang paling
  // hampir dengan apa yang data ini benar-benar tahu.
  const perantiUnik = new Set(rows.map(r => r.uuid)).size;
  const zoneCount: Record<string, number> = {};
  for (const r of rows) zoneCount[r.zone] = (zoneCount[r.zone] ?? 0) + 1;
  const topZones = Object.entries(zoneCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const jumlahZon = Object.keys(zoneCount).length;

  const terkini = [...rows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const HAD_LOG = 50;
  const logDipapar = terkini.slice(0, HAD_LOG);
  const tarikhPendek = (iso: string) =>
    new Date(iso).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  const masaTerkini = terkini[0] ? tarikhPendek(terkini[0].timestamp) : '—';
  const masaTerawal = terkini.length ? tarikhPendek(terkini[terkini.length - 1].timestamp) : '—';
  const zonTertinggi = topZones[0]?.[1] ?? 0;

  // Satu-satunya isyarat aktiviti sebenar yang boleh dijawab oleh jadual
  // "kali terakhir dilihat" ini.
  const MINGGU_MS = 7 * 24 * 60 * 60 * 1000;
  const aktif7 = rows.filter(r => Date.now() - new Date(r.timestamp).getTime() < MINGGU_MS).length;

  // User agent sudah disimpan pada setiap baris tetapi sebelum ini hanya
  // kelihatan sebagai teks terpotong yang tiada siapa baca. Sebagai tiga
  // nombor ia memberitahu di mana aplikasi ini perlu diuji.
  const platform = (ua: string) => {
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    if (/windows|macintosh|linux|cros/i.test(ua)) return 'Desktop';
    return 'Lain';
  };
  const kiraPlatform: Record<string, number> = {};
  for (const r of rows) {
    const nama = platform(r.ua ?? '');
    kiraPlatform[nama] = (kiraPlatform[nama] ?? 0) + 1;
  }
  const senaraiPlatform = Object.entries(kiraPlatform).sort((a, b) => b[1] - a[1]);

  return (
    <PageShell tajuk="Pantau" lede="Data pelawat MariSolat.">
      {!user && !loading ? (
        <div className="max-w-md">
          <p className="paparan text-2xl">Halaman peribadi</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Data pelawat mengandungi lokasi dan peranti pengguna, jadi ia hanya
            dibuka kepada akaun yang dibenarkan.
          </p>
          <button
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
          >
            Log masuk
          </button>
        </div>
      ) : ditolak && user ? (
        <div className="max-w-md">
          <p className="paparan text-2xl">Akaun ini tiada akses</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Akaun yang log masuk tidak berada dalam senarai pentadbir. UID ini
            perlu dimasukkan ke dalam pemboleh ubah persekitaran ADMIN_UIDS.
          </p>
          {/* Tanpa ini tiada cara untuk mengetahui UID sendiri, jadi senarai
              putih yang kosong tidak boleh diisi buat kali pertama. */}
          <p className="mt-4 break-all font-mono text-sm">{user.uid}</p>
        </div>
      ) : loading ? (
        <RangkaMuat />
      ) : error ? (
        <div className="max-w-md">
          <p className="paparan text-2xl">Data tidak dimuatkan</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">{error}</p>
        </div>
      ) : (
        <>
          {/* Bilangan pengguna unik ialah fakta halaman ini; dua nombor lain
              hanyalah konteks untuknya. */}
          <div className="flex flex-col items-start gap-2">
            <p className="paparan text-2xl leading-none lg:text-3xl">Peranti unik</p>
            <p className="angka-paparan text-[22vw] leading-none sm:text-[16vw] lg:text-[9vw]">
              {perantiUnik}
            </p>
          </div>

          {/* "Jumlah lawatan" pernah berada di sini, tetapi ia mustahil berbeza
              daripada bilangan pengguna unik: setiap penulisan menimpa satu
              dokumen bagi setiap UUID, jadi koleksi ini ialah jadual "kali
              terakhir dilihat", bukan log lawatan. Ia digantikan dengan julat
              tarikh yang benar-benar boleh dijawab oleh data ini. */}
          <dl className="mt-10 divide-y divide-border/50 border-t border-border/60 lg:flex lg:flex-wrap lg:gap-x-12 lg:divide-y-0 lg:pt-5">
            <div className="flex items-baseline justify-between py-3.5 lg:block lg:py-0">
              <dt className="text-sm text-muted-foreground">Aktif 7 hari</dt>
              <dd className="angka-paparan text-2xl lg:mt-1">{aktif7}</dd>
            </div>
            <div className="flex items-baseline justify-between py-3.5 lg:block lg:py-0">
              <dt className="text-sm text-muted-foreground">Zon berbeza</dt>
              <dd className="angka-paparan text-2xl lg:mt-1">{jumlahZon}</dd>
            </div>
            <div className="flex items-baseline justify-between py-3.5 lg:block lg:py-0">
              <dt className="text-sm text-muted-foreground">Direkod sejak</dt>
              <dd className="text-lg lg:mt-1">{masaTerawal}</dd>
            </div>
            <div className="flex items-baseline justify-between py-3.5 lg:block lg:py-0">
              <dt className="text-sm text-muted-foreground">Terakhir dilihat</dt>
              <dd className="text-lg lg:mt-1">{masaTerkini}</dd>
            </div>
          </dl>

          <section className="mt-20">
            <h2 className="paparan text-2xl">Peta pelawat</h2>
            <div className="mt-5 overflow-hidden rounded-2xl">
              <VisitorMap rows={rows} />
            </div>
          </section>

          <section className="mt-20 max-w-xl">
            <h2 className="paparan text-2xl">Peranti mengikut zon</h2>
            <ol className="mt-5 divide-y divide-border/50 border-t border-border/50">
              {topZones.map(([zone, count], i) => (
                <li key={zone} className="relative flex items-center justify-between gap-6 py-3.5">
                  {/* Ukuran kadar sebagai garis nipis di dasar baris. Blok
                      penuh di belakang teks terbaca seperti sorotan, bukan bar. */}
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
                    <span
                      className="block h-px bg-primary"
                      style={{ width: zonTertinggi ? `${(count / zonTertinggi) * 100}%` : 0 }}
                    />
                  </span>
                  <span className="flex min-w-0 items-baseline gap-4">
                    <span className="angka-paparan w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                    <span className="truncate">{zone}</span>
                  </span>
                  <span className="angka-paparan shrink-0 text-xl">{count}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* User agent sudah ada pada setiap baris tetapi hanya kelihatan
              sebagai teks terpotong di dalam log. Sebagai tiga nombor ia
              memberitahu di mana aplikasi ini perlu diuji. */}
          <section className="mt-20 max-w-xl">
            <h2 className="paparan text-2xl">Peranti mengikut platform</h2>
            <dl className="mt-5 divide-y divide-border/50 border-t border-border/50">
              {senaraiPlatform.map(([nama, kira]) => (
                <div key={nama} className="flex items-baseline justify-between gap-6 py-3.5">
                  <dt>{nama}</dt>
                  <dd className="angka-paparan text-xl">{kira}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-20">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="paparan text-2xl">Kali terakhir dilihat</h2>
              <p className="text-sm text-muted-foreground">
                {logDipapar.length} daripada {rows.length}
              </p>
            </div>

            {/* Lima lajur data hanya muat pada skrin lebar. Pada telefon jadual
                yang sama menjadi senarai berbaris, bukan skrol mendatar. */}
            <div className="mt-5 hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-2.5 pr-6 font-normal">Masa</th>
                    <th className="py-2.5 pr-6 font-normal">Zon</th>
                    <th className="py-2.5 pr-6 font-normal">Koordinat</th>
                    <th className="py-2.5 pr-6 font-normal">UUID</th>
                    <th className="py-2.5 font-normal">Pelayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {logDipapar.map((r, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap py-3 pr-6 text-muted-foreground">
                        {new Date(r.timestamp).toLocaleString('ms-MY')}
                      </td>
                      <td className="py-3 pr-6">{r.zone}</td>
                      <td className="tabular py-3 pr-6 font-mono text-muted-foreground">
                        {r.lat && r.lng ? (
                          <a
                            href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
                          >
                            {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lng).toFixed(4)}
                          </a>
                        ) : (
                          <span>Tiada lokasi</span>
                        )}
                      </td>
                      <td className="py-3 pr-6 font-mono text-muted-foreground">{r.uuid.slice(0, 8)}…</td>
                      <td className="py-3"><UaCell ua={r.ua ?? ''} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 divide-y divide-border/50 border-t border-border/50 lg:hidden">
              {logDipapar.map((r, i) => (
                <div key={i} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-semibold">{r.zone}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {new Date(r.timestamp).toLocaleString('ms-MY')}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 text-sm text-muted-foreground">
                    {r.lat && r.lng ? (
                      <a
                        href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tabular font-mono underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lng).toFixed(4)}
                      </a>
                    ) : (
                      <span>Tiada lokasi</span>
                    )}
                    <span className="font-mono">{r.uuid.slice(0, 8)}…</span>
                  </div>
                  <p className="mt-1 truncate font-mono text-sm text-muted-foreground">{r.ua}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

/** Rangka muat mengikut susun atur sebenar: nombor hero, baris meta, peta. */
function RangkaMuat() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-[22vw] w-[24vw] sm:h-[16vw] lg:h-[9vw] lg:w-[10vw]" />
      <div className="mt-12 flex flex-wrap gap-x-12 gap-y-5 border-t border-border/60 pt-5">
        {[0, 1, 2].map(i => (
          <div key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-16 h-8 w-40" />
      <Skeleton className="mt-5 h-[420px] w-full rounded-2xl" />
    </div>
  );
}
