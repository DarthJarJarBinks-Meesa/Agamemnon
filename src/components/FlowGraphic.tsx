type Box = { x: number; y: number; w: number; label: string };
type Line = { x1: number; y1: number; x2: number; y2: number };

function Diagram({
  label,
  width,
  height,
  boxes,
  lines,
}: {
  label: string;
  width: number;
  height: number;
  boxes: Box[];
  lines: Line[];
}) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      {lines.map((line) => (
        <g key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}>
          <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(255,255,255,0.45)" strokeWidth="1.25" />
          <polygon
            points={arrow(line)}
            fill="rgba(255,255,255,0.7)"
          />
        </g>
      ))}
      {boxes.map((box) => (
        <g key={box.label}>
          <rect x={box.x} y={box.y} width={box.w} height="36" fill="#111111" stroke="rgba(255,255,255,0.4)" />
          <text
            x={box.x + box.w / 2}
            y={box.y + 19}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#f5f5f5"
            fontSize="12"
            fontFamily="inherit"
          >
            {box.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function arrow({ x1, y1, x2, y2 }: Line) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 6;
  const tipX = x2;
  const tipY = y2;
  const left = `${tipX - size * Math.cos(angle) + size * 0.6 * Math.sin(angle)},${tipY - size * Math.sin(angle) - size * 0.6 * Math.cos(angle)}`;
  const right = `${tipX - size * Math.cos(angle) - size * 0.6 * Math.sin(angle)},${tipY - size * Math.sin(angle) + size * 0.6 * Math.cos(angle)}`;
  return `${tipX},${tipY} ${left} ${right}`;
}

export function AthenaFlow() {
  return (
    <Diagram
      label="A question is checked. A restricted question stops. An ordinary question is searched, then answered."
      width={280}
      height={360}
      boxes={[
        { x: 80, y: 16, w: 120, label: "Question" },
        { x: 90, y: 104, w: 100, label: "Check" },
        { x: 12, y: 196, w: 112, label: "Fixed reply" },
        { x: 156, y: 196, w: 112, label: "Search" },
        { x: 156, y: 288, w: 112, label: "Answer" },
      ]}
      lines={[
        { x1: 140, y1: 52, x2: 140, y2: 104 },
        { x1: 110, y1: 140, x2: 68, y2: 196 },
        { x1: 170, y1: 140, x2: 212, y2: 196 },
        { x1: 212, y1: 232, x2: 212, y2: 288 },
      ]}
    />
  );
}

export function PriorisFlow() {
  return (
    <Diagram
      label="Claims are searched in patent indexes, charted against earlier art, and opened as a PDF."
      width={220}
      height={320}
      boxes={[
        { x: 50, y: 8, w: 120, label: "Claims" },
        { x: 45, y: 70, w: 130, label: "Indexes" },
        { x: 50, y: 132, w: 120, label: "Chart" },
        { x: 45, y: 194, w: 130, label: "Earlier art" },
        { x: 62, y: 256, w: 96, label: "PDF" },
      ]}
      lines={[
        { x1: 110, y1: 44, x2: 110, y2: 70 },
        { x1: 110, y1: 106, x2: 110, y2: 132 },
        { x1: 110, y1: 168, x2: 110, y2: 194 },
        { x1: 110, y1: 230, x2: 110, y2: 256 },
      ]}
    />
  );
}
