import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { LineChart as LineChartIcon, Droplets, Waves, Activity, FlaskConical } from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBuildingConfigs, type BuildingConfig } from "@/lib/buildings";
import { useDarkMode } from "@/hooks/use-dark-mode";

// ─── Time ranges ─────────────────────────────────────────────────────────────

type RangeKey = "1h" | "6h" | "24h" | "7d";

const RANGES: { key: RangeKey; label: string; points: number; stepMin: number }[] = [
  { key: "1h", label: "1 ชั่วโมง", points: 30, stepMin: 2 },
  { key: "6h", label: "6 ชั่วโมง", points: 36, stepMin: 10 },
  { key: "24h", label: "24 ชั่วโมง", points: 48, stepMin: 30 },
  { key: "7d", label: "7 วัน", points: 56, stepMin: 180 },
];

// ─── Metric definitions ──────────────────────────────────────────────────────
//
// Each metric carries its baseline accessor, a noise amplitude, a unit and the
// acceptable [min, max] band. Values outside the band are flagged.

interface MetricDef {
  key: "pH" | "do" | "turbidity" | "cl2";
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  base: (b: BuildingConfig) => number;
  amp: number;
  decimals: number;
  band: [number, number];
  color: string;
}

const METRICS: MetricDef[] = [
  {
    key: "pH",
    label: "pH",
    unit: "",
    icon: Droplets,
    base: (b) => b.basePH,
    amp: 0.25,
    decimals: 2,
    band: [5.5, 9.0],
    color: "#22d3ee",
  },
  {
    key: "do",
    label: "DO",
    unit: "mg/L",
    icon: Waves,
    base: (b) => b.baseDO,
    amp: 0.45,
    decimals: 2,
    band: [2.0, 8.0],
    color: "#4ade80",
  },
  {
    key: "turbidity",
    label: "Turbidity",
    unit: "NTU",
    icon: Activity,
    base: (b) => b.baseTurbidity,
    amp: 0.8,
    decimals: 1,
    band: [0, 5.0],
    color: "#a78bfa",
  },
  {
    key: "cl2",
    label: "Cl₂",
    unit: "mg/L",
    icon: FlaskConical,
    base: (b) => b.baseCl2,
    amp: 0.18,
    decimals: 2,
    band: [0.5, 1.0],
    color: "#fb923c",
  },
];

// Deterministic pseudo-random so the chart is stable across re-renders for a
// given building+range (seeded by building id + range + index).
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1; // [-1, 1)
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface SeriesPoint {
  t: string;
  value: number;
  out: boolean;
}

function buildSeries(
  building: BuildingConfig,
  metric: MetricDef,
  range: { points: number; stepMin: number },
): SeriesPoint[] {
  const now = Date.now();
  const baseSeed = hashStr(`${building.id}-${metric.key}`);
  const out: SeriesPoint[] = [];
  for (let i = range.points - 1; i >= 0; i--) {
    const ts = new Date(now - i * range.stepMin * 60_000);
    const n = seededNoise(baseSeed + (range.points - i));
    const raw = metric.base(building) + n * metric.amp;
    const value = Number(raw.toFixed(metric.decimals));
    const isOut = value < metric.band[0] || value > metric.band[1];
    const label =
      range.stepMin >= 180
        ? ts.toLocaleDateString("th-TH", { day: "2-digit", month: "short" })
        : ts.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    out.push({ t: label, value, out: isOut });
  }
  return out;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Trends() {
  const buildings = useBuildingConfigs();
  const [buildingId, setBuildingId] = useState<string>(buildings[0]?.id ?? "");
  const [range, setRange] = useState<RangeKey>("24h");

  const building = useMemo(
    () => buildings.find((b) => b.id === buildingId) ?? buildings[0],
    [buildings, buildingId],
  );
  const rangeDef = RANGES.find((r) => r.key === range)!;

  return (
    <AppShell>
      <div className="flex flex-col gap-5 w-full max-w-[1500px] mx-auto pb-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <LineChartIcon className="w-6 h-6 text-primary" />
              แนวโน้มคุณภาพน้ำ
              <span className="text-sm font-normal text-muted-foreground">| Trends</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              กราฟแนวโน้ม pH / DO / ความขุ่น / คลอรีน ย้อนหลัง — เส้นประคือเกณฑ์มาตรฐาน
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="เลือกตึก" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nameTh} ({b.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-mono transition-colors",
                    range === r.key
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!building ? (
          <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-lg">
            ยังไม่มีตึกในระบบ
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {METRICS.map((m) => (
              <TrendCard
                key={m.key}
                metric={m}
                building={building}
                range={rangeDef}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Trend card ──────────────────────────────────────────────────────────────

function TrendCard({
  metric,
  building,
  range,
}: {
  metric: MetricDef;
  building: BuildingConfig;
  range: { points: number; stepMin: number };
}) {
  const isDark = useDarkMode();
  const data = useMemo(
    () => buildSeries(building, metric, range),
    [building, metric, range],
  );

  const outCount = data.filter((d) => d.out).length;
  const latest = data[data.length - 1]?.value ?? 0;
  const Icon = metric.icon;

  const grid = isDark ? "#1e293b" : "#e2e8f0";
  const axis = isDark ? "#64748b" : "#94a3b8";

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: `${metric.color}1f`, color: metric.color }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">
              {metric.label}
              {metric.unit && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({metric.unit})
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              เกณฑ์ {metric.band[0]}–{metric.band[1]} {metric.unit}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-mono font-bold tabular-nums"
            style={{ color: metric.color }}
          >
            {latest.toFixed(metric.decimals)}
          </div>
          {outCount > 0 ? (
            <div className="text-[10px] font-mono text-destructive">
              ⚠ หลุดเกณฑ์ {outCount} จุด
            </div>
          ) : (
            <div className="text-[10px] font-mono text-green-500">อยู่ในเกณฑ์</div>
          )}
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            {/* Acceptable band shading */}
            <ReferenceArea
              y1={metric.band[0]}
              y2={metric.band[1]}
              fill={metric.color}
              fillOpacity={0.06}
            />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 9, fill: axis, fontFamily: "monospace" }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 9, fill: axis, fontFamily: "monospace" }}
              domain={["auto", "auto"]}
              width={42}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? "#0f172a" : "#ffffff",
                border: `1px solid ${grid}`,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "monospace",
              }}
              labelStyle={{ color: axis }}
              formatter={(v: number) => [
                `${v.toFixed(metric.decimals)} ${metric.unit}`,
                metric.label,
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload, index } = props as {
                  cx: number;
                  cy: number;
                  payload: SeriesPoint;
                  index: number;
                };
                if (!payload.out) return <g key={index} />;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth={1}
                  />
                );
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
