import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'MariSolat — waktu solat Malaysia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Lengkung yang sama seperti halaman utama, tetapi ufuknya diletakkan di bawah
// bingkai supaya hanya puncak lengkung kelihatan dan teks mendapat ruang lapang.
const W = 1200;
const H = 630;
const UFUK = 900;
const RX = 700;
const RY = 470;
const titik = (t: number) => ({
  x: W / 2 + RX * Math.cos(Math.PI - Math.PI * t),
  y: UFUK - RY * Math.sin(Math.PI * t),
});

export default async function Image() {
  const [fraunces, jakarta] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/Fraunces.ttf')),
    readFile(join(process.cwd(), 'app/fonts/PlusJakartaSans.ttf')),
  ]);
  const matahari = titik(0.7);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundImage: 'linear-gradient(to bottom, #4076b4, #c9e0f2)',
        }}
      >
        {/* viewBox diperlukan — tanpanya Satori meregangkan bulatan menjadi bujur. */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <path
            d={`M ${titik(0).x} ${titik(0).y} A ${RX} ${RY} 0 0 1 ${titik(1).x} ${titik(1).y}`}
            fill="none"
            stroke="#14324d"
            strokeOpacity="0.35"
            strokeWidth="2"
          />
          <circle cx={matahari.x} cy={matahari.y} r="72" fill="#fdf6cf" fillOpacity="0.18" />
          <circle cx={matahari.x} cy={matahari.y} r="50" fill="#fdf3bd" fillOpacity="0.3" />
          <circle cx={matahari.x} cy={matahari.y} r="30" fill="#fbeaa0" />
        </svg>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            left: 84,
            top: 150,
          }}
        >
          <div style={{ fontFamily: 'Fraunces', fontSize: 120, color: '#0e2019', lineHeight: 1 }}>
            MariSolat
          </div>
          <div
            style={{
              fontFamily: 'Jakarta',
              fontSize: 32,
              color: '#14324d',
              opacity: 0.8,
              marginTop: 26,
            }}
          >
            Waktu solat Malaysia, mengikut perjalanan matahari
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
