"use client";

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
      className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72"
      aria-label="Kompas Kiblat"
    >
      {/* Alignment glow */}
      {isAligned && (
        <circle cx={CX} cy={CY} r={R + 8} fill="none" strokeWidth={14}
          className="stroke-emerald-400/15" />
      )}

      {/* Rotating compass rose */}
      <g style={{
        transformOrigin: `${CX}px ${CY}px`,
        transform: `rotate(${compassRotation}deg)`,
        transition: 'transform 0.15s ease-out',
      }}>
        {/* Main ring */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          strokeWidth={isAligned ? 1.5 : 1}
          className={isAligned ? "stroke-emerald-400" : "stroke-border"}
          style={{ transition: 'stroke 0.5s ease' }}
        />

        {/* Tick marks */}
        {TICKS.map(({ angle, major }) => (
          <line key={angle}
            x1={px(angle, R - (major ? 14 : 7))} y1={py(angle, R - (major ? 14 : 7))}
            x2={px(angle, R)} y2={py(angle, R)}
            strokeWidth={major ? 1.5 : 1} strokeLinecap="round"
            className={major ? "stroke-foreground/20" : "stroke-foreground/10"}
          />
        ))}

        {/* Cardinal labels */}
        {CARDINALS.map(({ label, angle }) => (
          <text key={label}
            x={px(angle, R - 30)} y={py(angle, R - 30)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="11" fontWeight="600"
            className="fill-muted-foreground/40"
          >
            {label}
          </text>
        ))}

        {/* Qibla marker on the ring */}
        <polygon
          points={`${px(qibla, R - 8)},${py(qibla, R - 8)} ${px(qibla - 5, R - 26)},${py(qibla - 5, R - 26)} ${px(qibla + 5, R - 26)},${py(qibla + 5, R - 26)}`}
          className={isAligned ? "fill-emerald-400" : "fill-emerald-500"}
          style={{ transition: 'fill 0.5s ease' }}
        />
      </g>

      {/* Fixed needle — always points up (toward screen top = current facing direction) */}
      <g>
        <line x1={CX} y1={CY - 10} x2={CX} y2={CY - (R - 28)}
          strokeWidth={2} strokeLinecap="round"
          className="stroke-foreground/50"
        />
        <polygon
          points={`${CX},${CY - (R - 12)} ${CX - 6},${CY - (R - 30)} ${CX + 6},${CY - (R - 30)}`}
          className="fill-foreground/50"
        />
        <line x1={CX} y1={CY + 10} x2={CX} y2={CY + (R - 52)}
          strokeWidth={1.5} strokeLinecap="round"
          className="stroke-foreground/15"
        />
      </g>

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={5} strokeWidth={1.5}
        className="fill-background stroke-border/60"
      />
    </svg>
  );
}
