"use client";

import { motion } from 'motion/react';
import { spring } from '@/lib/motion';

type Props = {
  qibla: number;
  heading: number | null;
  isAligned: boolean;
};

const CX = 150, CY = 150, R = 118;

function px(angle: number, radius: number) {
  return CX + Math.cos(((angle - 90) * Math.PI) / 180) * radius;
}
function py(angle: number, radius: number) {
  return CY + Math.sin(((angle - 90) * Math.PI) / 180) * radius;
}

const TICKS = Array.from({ length: 12 }, (_, i) => ({ angle: i * 30, major: i % 3 === 0 }));
const CARDINALS = [
  { label: 'U', angle: 0 },
  { label: 'T', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'B', angle: 270 },
];

export default function QiblaCard({ qibla, heading, isAligned }: Props) {
  const compassRotation = heading !== null ? -heading : 0;

  return (
    <svg
      viewBox="0 0 300 300"
      className="size-60 sm:size-72 lg:size-80"
      aria-label="Kompas Kiblat"
    >
      {/* Alignment glow */}
      {isAligned && (
        <circle cx={CX} cy={CY} r={R + 8} fill="none" strokeWidth={14}
          className="stroke-primary/30" />
      )}

      {/* Rotating compass rose */}
      <motion.g
        style={{ transformOrigin: `${CX}px ${CY}px` }}
        animate={{ rotate: compassRotation }}
        initial={false}
        transition={spring.jarum}
      >
        {/* Main ring */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          strokeWidth={isAligned ? 2.5 : 1.75}
          className={isAligned ? "stroke-primary" : "stroke-border"}
          style={{ transition: 'stroke 0.5s ease' }}
        />

        {/* Tick marks */}
        {TICKS.map(({ angle, major }) => (
          <line key={angle}
            x1={px(angle, R - (major ? 14 : 7))} y1={py(angle, R - (major ? 14 : 7))}
            x2={px(angle, R)} y2={py(angle, R)}
            strokeWidth={major ? 1.5 : 1} strokeLinecap="round"
            className={major ? "stroke-foreground/55" : "stroke-foreground/30"}
          />
        ))}

        {/* Cardinal labels */}
        {CARDINALS.map(({ label, angle }) => (
          <text key={label}
            x={px(angle, R - 30)} y={py(angle, R - 30)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="11" fontWeight="600"
            className="fill-muted-foreground"
          >
            {label}
          </text>
        ))}

        {/* Qibla marker on the ring */}
        <polygon
          points={`${px(qibla, R - 8)},${py(qibla, R - 8)} ${px(qibla - 5, R - 26)},${py(qibla - 5, R - 26)} ${px(qibla + 5, R - 26)},${py(qibla + 5, R - 26)}`}
          className={isAligned ? "fill-primary" : "fill-hijau-500"}
          style={{ transition: 'fill 0.5s ease' }}
        />
      </motion.g>

      {/* Fixed needle — always points up (toward screen top = current facing direction) */}
      <g>
        <line x1={CX} y1={CY - 10} x2={CX} y2={CY - (R - 28)}
          strokeWidth={2} strokeLinecap="round"
          className="stroke-foreground/80"
        />
        <polygon
          points={`${CX},${CY - (R - 12)} ${CX - 6},${CY - (R - 30)} ${CX + 6},${CY - (R - 30)}`}
          className="fill-foreground/80"
        />
        <line x1={CX} y1={CY + 10} x2={CX} y2={CY + (R - 52)}
          strokeWidth={1.5} strokeLinecap="round"
          className="stroke-foreground/35"
        />
      </g>

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={5} strokeWidth={1.5}
        className="fill-background stroke-border"
      />
    </svg>
  );
}
