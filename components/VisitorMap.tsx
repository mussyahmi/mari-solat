'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useTheme } from 'next-themes';
import 'leaflet/dist/leaflet.css';

type Visit = {
  uuid: string;
  lat: string;
  lng: string;
  zone: string;
  timestamp: string;
};

export default function VisitorMap({ rows }: { rows: Visit[] }) {
  const { resolvedTheme } = useTheme();
  const gelap = resolvedTheme === 'dark';

  const points = rows
    .map(r => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lng), zone: r.zone, uuid: r.uuid }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lng));

  return (
    <MapContainer
      center={[4.5, 109.5]}
      zoom={6}
      style={{
        height: '420px',
        width: '100%',
        borderRadius: '12px',
        zIndex: 0,
        filter: gelap ? 'invert(1) hue-rotate(180deg) brightness(0.92) saturate(0.6)' : undefined,
      }}
      scrollWheelZoom={false}
    >
      {/* Jubin CARTO kini memerlukan kunci API, jadi kembali ke OpenStreetMap
          tanpa kunci dan gelapkan jubin dengan penapis CSS untuk mod gelap. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={6}
          pathOptions={{
            color: gelap ? '#7fc6a0' : '#2c6a4f',
            fillColor: gelap ? '#7fc6a0' : '#2c6a4f',
            fillOpacity: 0.7,
            weight: 1,
          }}
        >
          <Tooltip>{p.zone} · {p.uuid.slice(0, 8)}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
