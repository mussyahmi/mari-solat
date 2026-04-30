// Seeds historical visit data into Firestore via REST API (no admin credentials needed).
// Uses the public API key — works because firestore.rules allows `create: if true` on /visits.

const PROJECT_ID = 'mari-solat';
const API_KEY = 'AIzaSyD0zMlyWfP6ExnG0gu5LfImaMNC3b-0lhM';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/visits`;

const visits = [
  { timestamp: '2026-04-30T02:26:24.546Z', uuid: '99580823-04cc-478a-b253-c531f1ea6c8b', lat: 3.162595718, lng: 101.716654,   zone: 'WLY01', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' },
  { timestamp: '2026-04-30T02:07:31.100Z', uuid: 'b25969b5-51c0-4730-84aa-46ca9d7a1f44', lat: 3.162437624, lng: 101.716675,   zone: 'WLY01', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Mobile/15E148 Safari/604.1' },
  { timestamp: '2026-04-29T11:21:30.101Z', uuid: '69e69449-51d0-42cb-95bd-a37f241bda8d', lat: 3.241059896, lng: 101.4652771,  zone: 'SGR02', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1' },
  { timestamp: '2026-04-27T07:34:50.479Z', uuid: 'af491b11-ca62-4853-86be-bdd0b0e9248c', lat: 3.162558303, lng: 101.7166364,  zone: 'WLY01', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' },
  { timestamp: '2026-04-26T05:29:49.397Z', uuid: 'de6faa62-ffd0-4d87-950d-1c143513d526', lat: 3.24105833,  lng: 101.4654411,  zone: 'SGR02', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' },
  { timestamp: '2026-04-25T23:39:55.801Z', uuid: '04900177-d72f-4437-b652-e52095cc36c7', lat: 5.8149261,   lng: 102.1473136,  zone: 'KTN01', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-04-25T11:04:45.274Z', uuid: '3e4fcb7b-b81b-4f1c-a632-84d7817e212d', lat: 3.2482475,   lng: 101.6654137,  zone: 'SGR01', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-04-23T08:27:46.803Z', uuid: '92178ae1-5c13-414a-a838-3ed62298157f', lat: 3.1624579,   lng: 101.7167945,  zone: 'WLY01', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-04-22T12:25:39.492Z', uuid: 'ce887e4b-4ffe-446f-9888-989dc07a56c0', lat: 3.2411519,   lng: 101.4653287,  zone: 'SGR02', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-04-22T03:07:49.898Z', uuid: '6182862b-cbd3-4fa1-ae9f-f39ab7bce596', lat: 3.162466126, lng: 101.7166558,  zone: 'WLY01', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/23D8133 Barcelona 423.1.0.35.69 (iPhone18,3; iOS 26_3_1; en_GB; en-GB; scale=3.00; 1206x2622; IABMV/1; 925944384)' },
  { timestamp: '2026-04-21T07:41:03.530Z', uuid: '59750b4e-2e79-47f3-bcbb-580324726760', lat: 3.162462657, lng: 101.716662,   zone: 'WLY01', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1' },
  { timestamp: '2026-04-15T12:14:53.695Z', uuid: 'd87215f9-ec74-4b92-8010-98d29423fa06', lat: 3.2411252,   lng: 101.4652966,  zone: 'SGR02', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-04-04T02:59:56.224Z', uuid: 'edc94c12-1123-47f8-a938-b533153696a5', lat: 3.241146101, lng: 101.465292,   zone: 'SGR02', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' },
  { timestamp: '2026-04-03T09:10:06.175Z', uuid: '329eb2e1-07aa-486e-b07d-18df7b5e1f76', lat: 3.162469051, lng: 101.7166558,  zone: 'WLY01', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1' },
  { timestamp: '2026-04-02T11:02:28.937Z', uuid: '3420fb6b-16b4-40fb-98d7-442ab09715ab', lat: 3.241013134, lng: 101.4651845,  zone: 'SGR02', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15' },
  { timestamp: '2026-04-01T01:18:55.959Z', uuid: '2294013a-9b29-42c1-9701-e74b91c59425', lat: 2.986183483, lng: 101.5498574,  zone: 'SGR03', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_14 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6.1 Mobile/15E148 Safari/604.1' },
  { timestamp: '2026-03-28T16:57:39.600Z', uuid: 'f736c090-49b9-4e8e-8a13-6b1429ed09f3', lat: 3.1333,      lng: 101.6833,     zone: 'WLY01', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-03-28T16:57:00.754Z', uuid: '3f96a6d3-bac9-4527-80e5-c5127084c937', lat: 1.56,        lng: 110.345,      zone: 'SWK08', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-03-20T11:15:40.929Z', uuid: '5202d338-db05-4219-b4b0-b219d246e7ac', lat: 3.1590993,   lng: 101.7662117,  zone: 'SGR01', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-03-15T22:16:48.782Z', uuid: '1dff9e7a-7a9f-4e81-977f-53d05cbd98a9', lat: 3.1333,      lng: 101.6833,     zone: 'WLY01', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36' },
  { timestamp: '2026-03-12T22:12:34.532Z', uuid: 'c6527475-11a0-455b-aa39-3919fcac0b95', lat: 3.1333,      lng: 101.6833,     zone: 'WLY01', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' },
];

function toFirestoreDoc(v) {
  return {
    fields: {
      uuid:      { stringValue: v.uuid },
      lat:       { doubleValue: v.lat },
      lng:       { doubleValue: v.lng },
      zone:      { stringValue: v.zone },
      ua:        { stringValue: v.ua },
      timestamp: { timestampValue: v.timestamp },
    },
  };
}

async function seed() {
  let ok = 0;
  for (const v of visits) {
    const url = `${BASE}/${v.uuid}?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFirestoreDoc(v)),
    });
    if (res.ok) {
      ok++;
      process.stdout.write(`✓ ${v.uuid.slice(0, 8)} ${v.zone}\n`);
    } else {
      const err = await res.text();
      process.stdout.write(`✗ ${v.uuid.slice(0, 8)} — ${res.status} ${err}\n`);
    }
  }
  console.log(`\nDone: ${ok}/${visits.length} seeded.`);
}

seed().catch((e) => { console.error(e); process.exit(1); });
