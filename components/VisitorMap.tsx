'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type Visit = {
  uuid: string;
  lat: string;
  lng: string;
  zone: string;
  timestamp: string;
};

export default function VisitorMap({ rows }: { rows: Visit[] }) {
  const points = rows
    .map(r => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lng), zone: r.zone, uuid: r.uuid }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lng));

  return (
    <MapContainer
      center={[4.5, 109.5]}
      zoom={6}
      style={{ height: '420px', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={6}
          pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.7, weight: 1 }}
        >
          <Tooltip>{p.zone} · {p.uuid.slice(0, 8)}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
