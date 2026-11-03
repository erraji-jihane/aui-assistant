import { useState, type MouseEvent, type ReactNode } from "react";

type RGB = [number, number, number];

const TERRACOTTA: RGB = [181, 83, 46];
const NEUTRAL: RGB = [236, 233, 226];
const FOREST: RGB = [31, 77, 58];
const PALE: RGB = [243, 240, 232];

function mix(a: RGB, b: RGB, t: number) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Diverging: negative → terracotta, 0 → neutral, positive → forest
function divergingColor(value: number, maxAbs: number) {
  const t = Math.max(-1, Math.min(1, value / (maxAbs || 1)));
  return t < 0 ? mix(NEUTRAL, TERRACOTTA, -t) : mix(NEUTRAL, FOREST, t);
}

// Sequential: 0 → pale, 1 → forest (negatives clamp to 0)
function sequentialColor(value: number) {
  return mix(PALE, FOREST, Math.max(0, Math.min(1, value)));
}

function Tooltip(props: { leftPct: number; topPct?: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs tabular-nums text-cream"
      style={{ left: `${props.leftPct}%`, top: `${props.topPct ?? 0}%`, marginTop: -6 }}
    >
      {props.children}
    </div>
  );
}

// Index under the pointer for a chart drawn as `n` equal columns
function columnAt(e: MouseEvent<HTMLElement>, n: number) {
  const rect = e.currentTarget.getBoundingClientRect();
  const i = Math.floor(((e.clientX - rect.left) / rect.width) * n);
  return Math.max(0, Math.min(n - 1, i));
}

// The 384 numbers of one embedding as a strip of thin colored columns
export function VectorStrip(props: { values: number[]; maxAbs: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = props.values.length;
  if (n === 0) {
    return <div className="flex h-8 items-center rounded-md bg-line/50 px-2 text-xs text-muted">No vector</div>;
  }

  return (
    <div>
      <div
        className="relative"
        onMouseMove={(e) => setHover(columnAt(e, n))}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" className="block h-8 w-full rounded-md" role="img" aria-label={props.label}>
          {props.values.map((v, i) => (
            <rect key={i} x={i} y={0} width={1.02} height={1} fill={divergingColor(v, props.maxAbs)} />
          ))}
          {hover !== null && <rect x={hover} y={0} width={1} height={1} fill="#1C2421" opacity={0.85} />}
        </svg>
        {hover !== null && (
          <Tooltip leftPct={((hover + 0.5) / n) * 100}>
            Number {hover + 1} of {n}: {props.values[hover] >= 0 ? "+" : ""}
            {props.values[hover].toFixed(3)}
          </Tooltip>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
        <span className="tabular-nums">−{props.maxAbs.toFixed(2)}</span>
        <div
          className="h-1.5 w-20 rounded-full"
          style={{ background: `linear-gradient(to right, ${divergingColor(-1, 1)}, ${divergingColor(0, 1)}, ${divergingColor(1, 1)})` }}
        />
        <span className="tabular-nums">+{props.maxAbs.toFixed(2)}</span>
      </div>
    </div>
  );
}

// Similarity of each chunk to the one before it, one bar per chunk
export function NeighborBars(props: {
  points: { index: number; value: number }[];
  onSelect?: (chunkIndex: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = props.points.length;
  if (n === 0) return null;

  return (
    <div>
      <div
        className="relative cursor-pointer"
        onMouseMove={(e) => setHover(columnAt(e, n))}
        onMouseLeave={() => setHover(null)}
        onClick={() => hover !== null && props.onSelect?.(props.points[hover].index)}
      >
        <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className="block h-40 w-full" role="img" aria-label="Similarity of each chunk to the previous one">
          {[25, 50, 75].map((y) => (
            <line key={y} x1={0} x2={n} y1={y} y2={y} stroke="#E7E1D3" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          ))}
          {props.points.map((p, i) => {
            const h = Math.max(1, Math.max(0, p.value) * 100);
            return (
              <rect
                key={p.index}
                x={i + (n > 80 ? 0.1 : 0.15)}
                y={100 - h}
                width={n > 80 ? 0.8 : 0.7}
                height={h}
                fill={hover === i ? "#173B2C" : "#1F4D3A"}
                opacity={hover === null || hover === i ? 1 : 0.55}
              />
            );
          })}
          <line x1={0} x2={n} y1={100} y2={100} stroke="#6B7570" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
        {hover !== null && (
          <Tooltip leftPct={((hover + 0.5) / n) * 100} topPct={100 - Math.max(0, props.points[hover].value) * 100}>
            Passage #{props.points[hover].index} vs #{props.points[hover].index - 1}: {props.points[hover].value.toFixed(2)}
          </Tooltip>
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted tabular-nums">
        <span>#{props.points[0].index}</span>
        <span>#{props.points[n - 1].index}</span>
      </div>
    </div>
  );
}

// n×n cosine similarity between chunks
export function SimilarityHeatmap(props: {
  indexes: number[];
  values: number[][];
  onSelect?: (chunkIndex: number) => void;
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const n = props.indexes.length;
  const showAxis = n <= 24;

  return (
    <div className="flex gap-1.5">
      {showAxis && (
        <div className="flex flex-col pt-5 text-[10px] text-muted tabular-nums" style={{ width: 18 }}>
          {props.indexes.map((idx) => (
            <span key={idx} className="flex flex-1 items-center justify-end pr-0.5">
              {idx}
            </span>
          ))}
        </div>
      )}
      <div className="w-full max-w-[380px]">
        {showAxis && (
          <div className="flex h-5 text-[10px] text-muted tabular-nums">
            {props.indexes.map((idx) => (
              <span key={idx} className="flex-1 text-center">
                {idx}
              </span>
            ))}
          </div>
        )}
        <div className="relative" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${n} ${n}`} className="block aspect-square w-full" role="img" aria-label="Chunk similarity grid">
            {props.values.map((row, r) =>
              row.map((v, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c + 0.04}
                  y={r + 0.04}
                  width={0.92}
                  height={0.92}
                  rx={0.08}
                  fill={sequentialColor(v)}
                  stroke={hover && hover.r === r && hover.c === c ? "#1C2421" : "none"}
                  strokeWidth={0.06}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({ r, c })}
                  onClick={() => props.onSelect?.(props.indexes[c])}
                />
              ))
            )}
          </svg>
          {hover && (
            <Tooltip leftPct={((hover.c + 0.5) / n) * 100} topPct={(hover.r / n) * 100}>
              #{props.indexes[hover.r]} vs #{props.indexes[hover.c]}: {props.values[hover.r][hover.c].toFixed(2)}
            </Tooltip>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span>Unrelated</span>
          <div className="h-1.5 w-24 rounded-full" style={{ background: `linear-gradient(to right, ${sequentialColor(0)}, ${sequentialColor(1)})` }} />
          <span>Identical</span>
        </div>
      </div>
    </div>
  );
}

// Token count of each chunk against the model's limit, one bar per chunk
export function TokenBars(props: {
  points: { index: number; value: number }[];
  limit: number;
  onSelect?: (chunkIndex: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = props.points.length;
  if (n === 0) return null;

  // Cap the axis a bit above the limit so one huge outlier doesn't flatten every other bar
  const yMax = props.limit * 1.4;
  const y = (v: number) => 100 - (Math.min(v, yMax) / yMax) * 100;
  const limitY = y(props.limit);

  return (
    <div className="flex gap-2">
      <div className="relative h-44 w-8 shrink-0 text-right text-xs text-muted tabular-nums">
        <span className="absolute right-0 -translate-y-1/2" style={{ top: `${(limitY / 100) * 100}%` }}>
          {props.limit}
        </span>
        <span className="absolute bottom-0 right-0 translate-y-1/2">0</span>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="relative h-44 cursor-pointer"
          onMouseMove={(e) => setHover(columnAt(e, n))}
          onMouseLeave={() => setHover(null)}
          onClick={() => hover !== null && props.onSelect?.(props.points[hover].index)}
        >
          <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className="block h-full w-full" role="img" aria-label="Tokens per passage compared with the model's limit">
            {props.points.map((p, i) => {
              const over = p.value > props.limit;
              return (
                <rect
                  key={p.index}
                  x={i + (n > 80 ? 0.1 : 0.15)}
                  y={y(p.value)}
                  width={n > 80 ? 0.8 : 0.7}
                  height={100 - y(p.value)}
                  fill={over ? "#C9A227" : "#1F4D3A"}
                  opacity={hover === null || hover === i ? 1 : 0.5}
                />
              );
            })}
            <line x1={0} x2={n} y1={limitY} y2={limitY} stroke="#B5532E" strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            <line x1={0} x2={n} y1={100} y2={100} stroke="#6B7570" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </svg>
          <span
            className="pointer-events-none absolute right-0 -translate-y-full pb-1 text-xs font-medium text-terracotta"
            style={{ top: `${limitY}%` }}
          >
            Model's reading limit
          </span>
          {hover !== null && (
            <Tooltip leftPct={((hover + 0.5) / n) * 100} topPct={y(props.points[hover].value)}>
              Passage #{props.points[hover].index}: {props.points[hover].value} tokens
              {props.points[hover].value > props.limit ? " (over the limit)" : ""}
            </Tooltip>
          )}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted tabular-nums">
          <span>#{props.points[0].index}</span>
          <span>Passages in document order</span>
          <span>#{props.points[n - 1].index}</span>
        </div>
      </div>
    </div>
  );
}
