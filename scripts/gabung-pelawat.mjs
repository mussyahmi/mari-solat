// Gabungkan UUID dalam `visits` yang sebenarnya orang yang sama.
//
// UUID hanyalah profil pelayar (lihat lib/track.ts), jadi satu orang boleh
// muncul dengan beberapa UUID. Dua UUID dianggap orang yang sama jika ada
// baris dengan user agent yang SAMA TEPAT dan koordinat dalam JARAK_M meter.
// Padanan bersifat transitif (union-find): A~B dan B~C menjadikan A, B, C satu.
// UUID kanonik ialah yang paling awal dilihat; yang asal disimpan dalam
// `uuidAsal` supaya penggabungan boleh diundur.
//
// --buang-pendua juga memadam baris pendua: UUID yang sama (selepas gabung)
// dalam PENDUA_S saat — hasil dua panggilan trackVisit yang berlumba.
//
// Usage:
//   node scripts/gabung-pelawat.mjs                  # larian kering, tiada tulisan
//   node scripts/gabung-pelawat.mjs --tulis [--buang-pendua]
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim();
  }
}

const TULIS = process.argv.includes('--tulis');
const BUANG_PENDUA = process.argv.includes('--buang-pendua');
const JARAK_M = 30;
const PENDUA_S = 5;

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
initializeApp(sa
  ? { credential: cert(JSON.parse(Buffer.from(sa, 'base64').toString())) }
  : { projectId: 'mari-solat' });
const db = getFirestore();

const snap = await db.collection('visits').get();
const baris = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data(), ms: d.data().timestamp.toMillis() }));
console.log(`${baris.length} baris dibaca.`);

const sandaran = resolve(process.argv.find(a => a.startsWith('--sandaran='))?.slice(11) ?? `visits-sandaran-${Date.now()}.json`);
writeFileSync(sandaran, JSON.stringify(baris.map(({ ref, ...r }) => r), null, 1));
console.log(`Sandaran: ${sandaran}`);

// --- union-find atas uuid ---
const induk = new Map();
const cari = u => {
  while (induk.get(u) !== u) { induk.set(u, induk.get(induk.get(u))); u = induk.get(u); }
  return u;
};
for (const r of baris) induk.set(r.uuid, r.uuid);
const satukan = (a, b) => { const x = cari(a), y = cari(b); if (x !== y) induk.set(x, y); };

const jarak = (a, b) => {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const ikutUa = new Map();
for (const r of baris) {
  if (!r.ua || typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;
  if (!ikutUa.has(r.ua)) ikutUa.set(r.ua, []);
  ikutUa.get(r.ua).push(r);
}
for (const kumpulan of ikutUa.values()) {
  for (let i = 0; i < kumpulan.length; i++)
    for (let j = i + 1; j < kumpulan.length; j++)
      if (kumpulan[i].uuid !== kumpulan[j].uuid && jarak(kumpulan[i], kumpulan[j]) <= JARAK_M)
        satukan(kumpulan[i].uuid, kumpulan[j].uuid);
}

// UUID kanonik = yang paling awal dilihat dalam setiap komponen.
const awal = new Map();
for (const r of baris) if (!awal.has(r.uuid) || r.ms < awal.get(r.uuid)) awal.set(r.uuid, r.ms);
const komponen = new Map();
for (const u of induk.keys()) {
  const akar = cari(u);
  if (!komponen.has(akar)) komponen.set(akar, []);
  komponen.get(akar).push(u);
}
const kanonik = new Map();
for (const ahli of komponen.values()) {
  ahli.sort((a, b) => awal.get(a) - awal.get(b));
  for (const u of ahli) kanonik.set(u, ahli[0]);
}

const kumpulanGabung = [...komponen.values()].filter(a => a.length > 1);
const kemaskini = baris.filter(r => kanonik.get(r.uuid) !== r.uuid);
console.log(`\nUUID unik: ${induk.size} → ${komponen.size} (${kumpulanGabung.length} kumpulan digabung, ${kemaskini.length} baris dikemas kini)`);
for (const ahli of kumpulanGabung) {
  const contoh = baris.find(r => r.uuid === ahli[0]);
  console.log(`  ${ahli.map(u => u.slice(0, 8)).join(' + ')}  ←  ${contoh.ua.slice(0, 60)}`);
}

// --- pendua: uuid kanonik sama dalam PENDUA_S saat ---
// Zon sengaja tidak dibandingkan: pasangan berlumba sering berbeza zon kerana
// satu ditulis sebelum geolokasi mengemas kini zon dan satu lagi selepasnya.
const susun = [...baris].sort((a, b) => a.ms - b.ms);
const pendua = [];
const terakhir = new Map();
for (const r of susun) {
  const k = kanonik.get(r.uuid);
  const sebelum = terakhir.get(k);
  if (sebelum && r.ms - sebelum.ms <= PENDUA_S * 1000) {
    // Simpan baris yang terkemudian (zon terkini), kecuali ia tiada koordinat.
    if (typeof r.lat === 'number' || typeof sebelum.lat !== 'number') {
      pendua.push(sebelum);
      terakhir.set(k, r);
    } else pendua.push(r);
  } else terakhir.set(k, r);
}
console.log(`Baris pendua (≤${PENDUA_S}s): ${pendua.length}${BUANG_PENDUA ? '' : ' — tidak dipadam tanpa --buang-pendua'}`);

if (!TULIS) { console.log('\nLarian kering. Tambah --tulis untuk menulis.'); process.exit(0); }

const dipadam = new Set(BUANG_PENDUA ? pendua.map(r => r.id) : []);
const ops = [
  ...kemaskini.filter(r => !dipadam.has(r.id)).map(r => b => b.update(r.ref, { uuid: kanonik.get(r.uuid), uuidAsal: r.uuid })),
  ...[...dipadam].map(id => b => b.delete(db.collection('visits').doc(id))),
];
for (let i = 0; i < ops.length; i += 450) {
  const b = db.batch();
  ops.slice(i, i + 450).forEach(op => op(b));
  await b.commit();
}
console.log(`\nSelesai: ${ops.length - dipadam.size} dikemas kini, ${dipadam.size} dipadam.`);
