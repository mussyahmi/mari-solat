'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchVisits } from '@/lib/track';
import Sidebar from '@/components/Sidebar';

const VisitorMap = dynamic(() => import('@/components/VisitorMap'), { ssr: false });

type Visit = {
  uuid: string;
  lat: string;
  lng: string;
  zone: string;
  timestamp: string;
  ua: string;
};

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1fbCLp9eSxYwIRyCN5eiKyybrjZEJ0UGumCOkfNEDwa0/edit?gid=620806291#gid=620806291';

export default function PantauPage() {
  const [rows, setRows] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVisits()
      .then(setRows)
      .catch(() => setError('Gagal memuatkan data.'))
      .finally(() => setLoading(false));
  }, []);

  const uniqueUsers = new Set(rows.map(r => r.uuid)).size;
  const zoneCount: Record<string, number> = {};
  for (const r of rows) zoneCount[r.zone] = (zoneCount[r.zone] ?? 0) + 1;
  const topZones = Object.entries(zoneCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (loading) return <div className="min-h-screen lg:flex"><Sidebar /><div className="p-10 text-sm text-muted-foreground">Memuatkan...</div></div>;
  if (error) return <div className="min-h-screen lg:flex"><Sidebar /><div className="p-10 text-sm text-destructive">{error}</div></div>;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 py-10 max-w-5xl mx-auto lg:mx-0 lg:max-w-none">
        <div className='flex items-start justify-between'>
          <div>
            <h1 className="text-2xl font-bold mb-1">Pantau</h1>
            <p className="text-sm text-muted-foreground mb-8">Data pelawat MariSolat</p>
          </div>
          <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="text-xs border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition whitespace-nowrap">
            ↗ Buka Spreadsheet
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-1">Pengguna Unik</p>
            <p className="text-3xl font-bold">{uniqueUsers}</p>
          </div>
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-1">Zon Berbeza</p>
            <p className="text-3xl font-bold">{Object.keys(zoneCount).length}</p>
          </div>
        </div>

        <div className="mb-10">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Peta Pelawat</p>
          <VisitorMap rows={rows} />
        </div>

        <div className="mb-10">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Zon Teratas</p>
          <div className="divide-y divide-border/50">
            {topZones.map(([zone, count]) => (
              <div key={zone} className="flex items-center justify-between py-2">
                <span className="text-sm">{zone}</span>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Log Terkini</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground/50 border-b border-border/50">
                  <th className="pb-2 pr-4 font-medium">Masa</th>
                  <th className="pb-2 pr-4 font-medium">Zon</th>
                  <th className="pb-2 pr-4 font-medium">Koordinat</th>
                  <th className="pb-2 font-medium">UUID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[...rows].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleString('ms-MY')}
                    </td>
                    <td className="py-2 pr-4">{r.zone}</td>
                    <td className="py-2 pr-4 font-mono text-muted-foreground">
                      <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
                        {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lng).toFixed(4)}
                      </a>
                    </td>
                    <td className="py-2 text-muted-foreground/50 font-mono">{r.uuid.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
