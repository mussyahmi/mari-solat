import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import type { Timestamp } from 'firebase-admin/firestore';
import { adminApp, adminDb } from '@/lib/fcm-admin';

/**
 * Data pelawat untuk /pantau.
 *
 * Koleksi `visits` membawa koordinat, UUID kekal dan user agent bagi setiap
 * pengguna, jadi ia tidak lagi boleh dibaca dari klien. Laluan ini mengesahkan
 * token ID Firebase pemanggil dan menyemaknya terhadap senarai putih UID.
 * Jika ADMIN_UIDS tidak ditetapkan, tiada sesiapa dibenarkan — gagal tertutup.
 */
export async function GET(request: Request) {
  const dibenarkan = (process.env.ADMIN_UIDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Lihat lib/track.ts: Authorization dirampas oleh Cloud Run.
  const token = request.headers.get('x-id-token') ?? '';
  if (!token || dibenarkan.length === 0) {
    return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 403 });
  }

  let uid: string;
  try {
    uid = (await getAuth(adminApp()).verifyIdToken(token)).uid;
  } catch (e) {
    // Kegagalan kelayakan Admin SDK dilontar dari panggilan yang sama seperti
    // token yang tidak sah. Menganggap semuanya sebagai "token tidak sah"
    // menyembunyikan sebab sebenar — kod ralat 'auth/' membezakannya.
    const kod = (e as { code?: string }).code ?? '';
    if (!kod.startsWith('auth/')) {
      console.error('[pantau] Firebase Admin gagal:', e);
      return NextResponse.json(
        { error: 'Pelayan tidak dapat mengesahkan token. Semak kelayakan Firebase Admin.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Token tidak sah.' }, { status: 403 });
  }
  if (!dibenarkan.includes(uid)) {
    return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 403 });
  }

  const snap = await adminDb().collection('visits').orderBy('timestamp', 'desc').get();
  return NextResponse.json(
    snap.docs.map(d => {
      const data = d.data();
      return {
        uuid: data.uuid,
        // Baris tanpa lokasi kini sah; hantar rentetan kosong dan biarkan
        // halaman memutuskan cara memaparkannya.
        lat: data.lat === undefined ? '' : String(data.lat),
        lng: data.lng === undefined ? '' : String(data.lng),
        zone: data.zone,
        ua: data.ua ?? '',
        timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      };
    })
  );
}
