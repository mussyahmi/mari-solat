import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'MariSolat — waktu solat & jejak ibadah';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Pratonton pautan (Threads, WhatsApp, Facebook) — mengikut rupa 2.0: logo
// mihrab, kecerunan "Sky", dan lengkung matahari dengan lima waktu solat
// seperti kad langit di halaman utama.
const W = 1200;
const H = 630;

// Lengkung di separuh kanan: sinus ringkas dari Subuh ke Isyak.
const KIRI = 660;
const KANAN = 1150;
const UFUK = 440;
const AMP = 170;
const titik = (t: number) => ({
  x: KIRI + (KANAN - KIRI) * t,
  y: UFUK - AMP * Math.sin(Math.PI * ((t - 0.1) / 0.8)),
});
const WAKTU = [
  { nama: 'Subuh', t: 0.05, warna: '#8b5cf6', siap: true },
  { nama: 'Zohor', t: 0.42, warna: '#14b8a6', siap: true },
  { nama: 'Asar', t: 0.68, warna: '#22c55e', siap: false },
  { nama: 'Maghrib', t: 0.88, warna: '#ec4899', siap: false },
  { nama: 'Isyak', t: 0.98, warna: '#3b82f6', siap: false },
];

export default async function Image() {
  const [fraunces, jakarta] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/Fraunces.ttf')),
    readFile(join(process.cwd(), 'app/fonts/PlusJakartaSans.ttf')),
  ]);

  let laluan = '';
  for (let i = 0; i <= 60; i++) {
    const p = titik(i / 60);
    laluan += `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  const matahari = titik(0.56);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundImage: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 55%, #e879f9 100%)',
        }}
      >
        {/* viewBox diperlukan — tanpanya Satori meregangkan bulatan menjadi bujur. */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <line x1={KIRI - 20} x2={KANAN + 20} y1={UFUK} y2={UFUK} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
          <path d={laluan} fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
          <circle cx={matahari.x} cy={matahari.y} r="46" fill="#fff3c4" fillOpacity="0.45" />
          <circle cx={matahari.x} cy={matahari.y} r="22" fill="#ffe27a" />
          {WAKTU.map(w => {
            const p = titik(w.t);
            return (
              <g key={w.nama}>
                <circle cx={p.x} cy={p.y} r="19" fill={w.siap ? w.warna : '#ffffff'} fillOpacity={w.siap ? 1 : 0.25} stroke="#ffffff" strokeWidth="5" />
                {w.siap && <path d={`M${p.x - 8} ${p.y} l6 6 11 -12`} fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
              </g>
            );
          })}
        </svg>

        {/* Label waktu sebagai teks HTML — Satori tidak memaparkan <text> dalam SVG. */}
        {WAKTU.map(w => {
          const p = titik(w.t);
          const atas = w.nama === 'Maghrib' || p.y < UFUK - 10;
          return (
            <div
              key={w.nama}
              style={{
                position: 'absolute',
                left: p.x - 70,
                top: atas ? p.y - 62 : p.y + 26,
                width: 140,
                display: 'flex',
                justifyContent: 'center',
                fontFamily: 'Jakarta',
                fontSize: 26,
                color: '#ffffff',
              }}
            >
              {w.nama}
            </div>
          );
        })}

        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 72, top: 70 }}>
          {/* Logo mihrab */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="104" height="104" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="15" fill="#ffffff" fillOpacity="0.22" />
              <path d="M14 56 V30 Q14 15 32 7 Q50 15 50 30 V56" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="31" cy="25" r="7.4" fill="#ffffff" />
              <circle cx="35.4" cy="21.4" r="5.6" fill="#8fa2f9" />
              <path d="M37.6 15.6 l1 2.3 2.3 1 -2.3 1 -1 2.3 -1 -2.3 -2.3 -1 2.3 -1z" fill="#ffd45e" />
              <path d="M32 36 C27 39 24 41.5 24 45.5 C24 47.5 25 48.6 26 49 H38 C39 48.6 40 47.5 40 45.5 C40 41.5 37 39 32 36Z" fill="#ffffff" />
              <rect x="23.5" y="49" width="17" height="7" rx="1.2" fill="#ffffff" />
              <path d="M30 56 V52.6 a2 2 0 0 1 4 0 V56Z" fill="#818cf8" />
            </svg>
            <div
              style={{
                marginLeft: 22,
                fontFamily: 'Jakarta',
                fontSize: 30,
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.22)',
                padding: '8px 22px',
                borderRadius: 999,
              }}
            >
              Versi 2.0
            </div>
          </div>

          <div style={{ fontFamily: 'Fraunces', fontSize: 112, color: '#ffffff', lineHeight: 1, marginTop: 36 }}>
            MariSolat
          </div>
          <div style={{ fontFamily: 'Jakarta', fontSize: 34, color: '#ffffff', marginTop: 22, maxWidth: 600, lineHeight: 1.3 }}>
            Waktu solat & jejak ibadah harian
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 34, maxWidth: 540 }}>
            {['Solat', 'Zikir', 'Al-Quran', 'Istighfar'].map(c => (
              <div
                key={c}
                style={{
                  fontFamily: 'Jakarta',
                  fontSize: 24,
                  color: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  padding: '8px 20px',
                  borderRadius: 999,
                  marginRight: 12,
                  marginBottom: 12,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Fraunces', data: fraunces, style: 'normal', weight: 600 },
        { name: 'Jakarta', data: jakarta, style: 'normal', weight: 500 },
      ],
    }
  );
}
