import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Building2,
  Droplets,
  Activity,
  MapPin,
  Loader2,
} from "lucide-react";
import { geoMercator, geoPath, geoBounds, geoCentroid } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/scada/AppShell";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useThailandGeoJson } from "@/hooks/use-thailand-geojson";
import { getProvinceRegion } from "@/lib/thailand-provinces";
import {
  HOSPITALS,
  REGION_INFO,
  STATUS_CONFIG,
  type ThaiRegion,
  type NetworkHospital,
} from "@/lib/network-data";

const REGION_ORDER: ThaiRegion[] = [
  "north",
  "northeast",
  "central",
  "east",
  "west",
  "south",
];

// Map viewBox — chosen to roughly match Thailand's aspect ratio so the
// projection fills the available space without distortion.
const MAP_VB_W = 200;
const MAP_VB_H = 440;

// ─── Status counts ───────────────────────────────────────────────────────────
function useCounts(hospitals: NetworkHospital[]) {
  return useMemo(() => {
    const online = hospitals.filter((h) => h.status === "online").length;
    const warning = hospitals.filter((h) => h.status === "warning").length;
    const critical = hospitals.filter((h) => h.status === "critical").length;
    const offline = hospitals.filter((h) => h.status === "offline").length;
    return { total: hospitals.length, online, warning, critical, offline };
  }, [hospitals]);
}

// ─── Thailand Real Map (GeoJSON-based) ──────────────────────────────────────
//
// Renders Thailand's actual province polygons fetched lazily from a CDN.
// Provinces are coloured by region (north / northeast / central / east /
// west / south); hospital markers are positioned by their province centroid
// so they always land inside the correct shape regardless of viewBox size.

function ThailandMap({
  selectedRegion,
  onSelectRegion,
  hospitalsByRegion,
}: {
  selectedRegion: ThaiRegion | null;
  onSelectRegion: (r: ThaiRegion | null) => void;
  hospitalsByRegion: Record<ThaiRegion, NetworkHospital[]>;
}) {
  const [hoveredRegion, setHoveredRegion] = useState<ThaiRegion | null>(null);
  const isDark = useDarkMode();
  const { data: geo, loading, error } = useThailandGeoJson();

  // ── Region colour helpers (unchanged from rectangle map) ─────────────────
  function getRegionFill(region: ThaiRegion) {
    const info = REGION_INFO[region];
    if (isDark) {
      if (selectedRegion === region) return info.fillSelected;
      if (hoveredRegion === region) return info.fillHover;
      return info.fill;
    }
    if (selectedRegion === region) return info.fillSelectedLight;
    if (hoveredRegion === region) return info.fillHoverLight;
    return info.fillLight;
  }
  function getRegionAccent(region: ThaiRegion) {
    const info = REGION_INFO[region];
    return isDark ? info.accent : info.accentLight;
  }

  // ── Group features by region + build a projection that fits the viewBox ──
  const { provincesByRegion, projection, regionLabelPos, provinceCentroid } = useMemo(() => {
    if (!geo) {
      return {
        provincesByRegion: null,
        projection: null,
        regionLabelPos: null,
        provinceCentroid: null,
      };
    }
    type ProvFeature = Feature<Polygon | MultiPolygon, Record<string, unknown>>;
    const byRegion: Record<ThaiRegion, ProvFeature[]> = {
      north: [], northeast: [], central: [], east: [], west: [], south: [],
    };
    const byProvince = new Map<string, ProvFeature>();
    for (const f of geo.features) {
      const region = getProvinceRegion(f.properties);
      if (region) byRegion[region].push(f as ProvFeature);
      // Index by every name variant for easy hospital → province lookup.
      const props = f.properties ?? {};
      for (const key of ["NAME_1", "name", "NL_NAME_1", "province", "PROVINCE", "ADM1_TH", "ADM1_EN", "shapeName"]) {
        const v = (props as Record<string, unknown>)[key];
        if (typeof v === "string") byProvince.set(v.trim(), f as ProvFeature);
      }
    }

    // Fit projection to the union of all polygons so the map fills the
    // viewBox tightly. Using `fitSize` is the simplest cross-feature solution.
    const fc = { type: "FeatureCollection" as const, features: geo.features };
    const proj = geoMercator().fitSize([MAP_VB_W, MAP_VB_H], fc as Feature);

    // Region label = centroid of the union of that region's polygons,
    // projected into SVG space.
    const labels: Record<ThaiRegion, { x: number; y: number }> = {} as never;
    for (const r of REGION_ORDER) {
      const features = byRegion[r];
      if (features.length === 0) { labels[r] = { x: 0, y: 0 }; continue; }
      const fc = { type: "FeatureCollection" as const, features };
      const c = geoCentroid(fc as Feature);
      const projected = proj(c);
      labels[r] = projected
        ? { x: projected[0], y: projected[1] }
        : { x: 0, y: 0 };
    }

    function provinceCentroid(provinceName: string): [number, number] | null {
      const f = byProvince.get(provinceName);
      if (!f) return null;
      const c = geoCentroid(f);
      const p = proj(c);
      return p ?? null;
    }

    return {
      provincesByRegion: byRegion,
      projection: proj,
      regionLabelPos: labels,
      provinceCentroid,
    };
  }, [geo]);

  const allHospitals = REGION_ORDER.flatMap((r) => hospitalsByRegion[r]);

  // Loading skeleton — keeps the layout stable so nothing reflows when the
  // map arrives. We don't animate the spinner aggressively; the data lives
  // in localStorage after first load so most sessions skip this entirely.
  if (loading || !geo || !provincesByRegion || !projection || !regionLabelPos) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-[10px] font-mono uppercase tracking-wider">
          กำลังโหลดแผนที่ประเทศไทย…
        </span>
        {error && (
          <span className="text-[9px] text-destructive max-w-[200px] text-center">
            {error}
          </span>
        )}
      </div>
    );
  }

  const pathGen = geoPath(projection);

  return (
    <svg
      viewBox={`0 0 ${MAP_VB_W} ${MAP_VB_H}`}
      className="w-full h-full"
      style={{
        filter: isDark
          ? "drop-shadow(0 4px 24px rgba(0,0,0,0.5))"
          : "drop-shadow(0 2px 8px rgba(0,0,0,0.10))",
      }}
    >
      {/* Region polygons — each region's provinces share fill and stroke
          so visually it reads as a single connected area, but each province
          stays its own <path> for crisp borders. */}
      {REGION_ORDER.map((region) => {
        const info = REGION_INFO[region];
        const isSelected = selectedRegion === region;
        const isHovered = hoveredRegion === region;
        const hospitals = hospitalsByRegion[region];
        const hasCritical = hospitals.some((h) => h.status === "critical");
        const lp = regionLabelPos[region];
        const features = provincesByRegion[region];

        return (
          <g key={region}>
            {features.map((f, i) => {
              const d = pathGen(f);
              if (!d) return null;
              return (
                <path
                  key={i}
                  d={d}
                  fill={getRegionFill(region)}
                  stroke={info.stroke}
                  strokeWidth={isSelected ? 0.5 : 0.25}
                  strokeOpacity={isSelected ? 1 : 0.55}
                  style={{ cursor: "pointer", transition: "fill 0.15s" }}
                  onClick={() => onSelectRegion(selectedRegion === region ? null : region)}
                  onMouseEnter={() => setHoveredRegion(region)}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
              );
            })}
            {/* Region label — Thai name + hospital count, positioned at
                geographic centroid of the region's union polygon. */}
            <text
              x={lp.x} y={lp.y - 4}
              textAnchor="middle" fontSize="7" fontFamily="sans-serif"
              fill={getRegionAccent(region)} opacity={isSelected || isHovered ? 1 : 0.9}
              style={{ pointerEvents: "none", fontWeight: "bold",
                paintOrder: "stroke",
                stroke: isDark ? "rgba(2,8,23,0.9)" : "rgba(255,255,255,0.85)",
                strokeWidth: 2,
                strokeLinecap: "round",
                strokeLinejoin: "round",
              }}
            >
              {REGION_INFO[region].nameTh}
            </text>
            <text
              x={lp.x} y={lp.y + 5}
              textAnchor="middle" fontSize="4.5" fontFamily="sans-serif"
              fill={getRegionAccent(region)} opacity={isSelected || isHovered ? 0.95 : 0.7}
              style={{ pointerEvents: "none",
                paintOrder: "stroke",
                stroke: isDark ? "rgba(2,8,23,0.9)" : "rgba(255,255,255,0.85)",
                strokeWidth: 1.5,
              }}
            >
              {hospitals.length} รพ.
            </text>
            {hasCritical && (
              <circle cx={lp.x + 16} cy={lp.y - 5} r="2.5"
                fill="#ef4444" opacity="0.85" style={{ pointerEvents: "none" }}>
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* Hospital markers — positioned by province centroid so they always
          land inside the correct region polygon. */}
      {allHospitals.map((h) => {
        const sc = STATUS_CONFIG[h.status];
        const isHighlighted = !selectedRegion || selectedRegion === h.region;
        const isConnected = h.connected;
        const pos = provinceCentroid?.(h.province);
        if (!pos) return null;
        const [mx, my] = pos;

        return (
          <g key={h.id} style={{ opacity: isHighlighted ? 1 : 0.25, transition: "opacity 0.2s" }}>
            {h.status === "critical" && (
              <circle cx={mx} cy={my} r="5" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.6">
                <animate attributeName="r" values="3;7;3" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            {h.status === "warning" && (
              <circle cx={mx} cy={my} r="4" fill="none" stroke="#f59e0b" strokeWidth="0.6" opacity="0.5">
                <animate attributeName="r" values="2;5;2" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={mx} cy={my}
              r={isConnected ? 3 : 2.5}
              fill={sc.color}
              stroke={isConnected ? "#ffffff" : "#1e293b"}
              strokeWidth={isConnected ? 0.8 : 0.5}
            />
            {isConnected && (
              <circle cx={mx} cy={my} r="4.5" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.5" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Hospital Card ────────────────────────────────────────────────────────────
function HospitalCard({ hospital }: { hospital: NetworkHospital }) {
  const [, navigate] = useLocation();
  const sc = STATUS_CONFIG[hospital.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      onClick={() => navigate(`/hospital/${hospital.id}`)}
      className="rounded-lg border border-border bg-card p-3 cursor-pointer transition-all hover:border-primary/50 hover:bg-card/80 hover:shadow-sm group"
    >
      <div className="flex items-start gap-2.5">
        {/* Status dot */}
        <div className="mt-0.5 shrink-0 flex flex-col items-center gap-1">
          <span
            className={cn(
              "inline-flex h-2.5 w-2.5 rounded-full",
              sc.dot,
              hospital.status === "critical" && "animate-pulse",
            )}
          />
          {hospital.connected && (
            <Wifi className="w-3 h-3 text-cyan-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono font-bold text-muted-foreground">
              {hospital.shortCode}
            </span>
            <span
              className={cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                sc.badge,
              )}
            >
              {sc.label}
            </span>
            {hospital.connected && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5 leading-tight truncate">
            {hospital.nameTh}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground truncate">
              {hospital.province}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <div>
              <p className="text-[9px] font-mono text-muted-foreground uppercase">ความจุ</p>
              <p className="text-[10px] font-mono font-bold text-foreground">
                {hospital.capacity.toLocaleString()}
                <span className="text-[8px] text-muted-foreground ml-0.5">m³/d</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-muted-foreground uppercase">Inflow</p>
              <p className="text-[10px] font-mono font-bold text-foreground">
                {hospital.status === "offline" ? "—" : hospital.inflow}
                <span className="text-[8px] text-muted-foreground ml-0.5">
                  {hospital.status !== "offline" && "m³/h"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-muted-foreground uppercase">Comply</p>
              <p
                className={cn(
                  "text-[10px] font-mono font-bold",
                  hospital.status === "offline"
                    ? "text-muted-foreground"
                    : hospital.compliance >= 95
                      ? "text-green-400"
                      : hospital.compliance >= 85
                        ? "text-amber-400"
                        : "text-red-400",
                )}
              >
                {hospital.status === "offline" ? "—" : `${hospital.compliance}%`}
              </p>
            </div>
          </div>

          {hospital.alarms > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
              <span className="text-[9px] text-amber-400 font-mono">
                {hospital.alarms} alarm{hospital.alarms > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-1 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NetworkPage() {
  const [selectedRegion, setSelectedRegion] = useState<ThaiRegion | null>(null);
  const isDark = useDarkMode();

  const hospitalsByRegion = useMemo(() => {
    const map = {} as Record<ThaiRegion, NetworkHospital[]>;
    for (const r of REGION_ORDER) map[r] = [];
    for (const h of HOSPITALS) map[h.region].push(h);
    return map;
  }, []);

  const displayedHospitals = useMemo(
    () =>
      selectedRegion
        ? hospitalsByRegion[selectedRegion]
        : REGION_ORDER.flatMap((r) => hospitalsByRegion[r]),
    [selectedRegion, hospitalsByRegion],
  );

  const counts = useCounts(HOSPITALS);

  function handleSelectRegion(region: ThaiRegion | null) {
    setSelectedRegion(region);
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Page header */}
        <div className="shrink-0 border-b border-border px-4 py-3 bg-card flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">
                เครือข่าย WWTP ทั่วประเทศ
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono">
                NATIONAL WWTP NETWORK — HOSPITAL MONITORING
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              {
                label: "ทั้งหมด",
                value: counts.total,
                cls: "bg-slate-700/50 text-slate-300 border-slate-600",
                icon: Building2,
              },
              {
                label: "ออนไลน์",
                value: counts.online,
                cls: "bg-green-500/10 text-green-400 border-green-500/30",
                icon: CheckCircle2,
              },
              {
                label: "เฝ้าระวัง",
                value: counts.warning,
                cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                icon: AlertTriangle,
              },
              {
                label: "วิกฤต",
                value: counts.critical,
                cls: "bg-red-500/10 text-red-400 border-red-500/30",
                icon: XCircle,
              },
              {
                label: "ออฟไลน์",
                value: counts.offline,
                cls: "bg-slate-800 text-slate-500 border-slate-700",
                icon: WifiOff,
              },
            ].map(({ label, value, cls, icon: Icon }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono",
                  cls,
                )}
              >
                <Icon className="w-3 h-3" />
                <span className="font-bold tabular-nums">{value}</span>
                <span className="opacity-70 hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT: Thailand map */}
          <div className="shrink-0 w-[220px] md:w-[260px] lg:w-[300px] border-r border-border bg-sidebar flex flex-col">
            <div className="px-3 pt-3 pb-1.5">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                คลิกภาคเพื่อกรอง
              </p>
            </div>

            {/* Region legend */}
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              <button
                onClick={() => handleSelectRegion(null)}
                className={cn(
                  "text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
                  !selectedRegion
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "text-muted-foreground border-border hover:border-border/80",
                )}
              >
                ทั้งหมด
              </button>
              {REGION_ORDER.map((r) => {
                const info = REGION_INFO[r];
                const isSelected = selectedRegion === r;
                return (
                  <button
                    key={r}
                    onClick={() => handleSelectRegion(isSelected ? null : r)}
                    className={cn(
                      "text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
                    )}
                    style={{
                      color: isSelected ? (isDark ? info.accent : info.accentLight) : undefined,
                      borderColor: isSelected ? info.stroke : undefined,
                      backgroundColor: isSelected
                        ? (isDark ? info.fillSelected : info.fillSelectedLight)
                        : undefined,
                    }}
                  >
                    {info.nameTh}
                  </button>
                );
              })}
            </div>

            {/* SVG map */}
            <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-0">
              <ThailandMap
                selectedRegion={selectedRegion}
                onSelectRegion={handleSelectRegion}
                hospitalsByRegion={hospitalsByRegion}
              />
            </div>

            {/* Map legend */}
            <div className="px-3 py-2 border-t border-border space-y-1">
              {[
                { color: "bg-green-500", label: "ออนไลน์" },
                { color: "bg-amber-500", label: "เฝ้าระวัง" },
                { color: "bg-red-500", label: "วิกฤต" },
                { color: "bg-slate-500", label: "ออฟไลน์" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                  <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="w-2 h-2 rounded-full shrink-0 bg-foreground ring-1 ring-foreground/50" />
                <span className="text-[9px] font-mono text-primary">LIVE SCADA</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Hospital list */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* List header */}
            <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {selectedRegion
                    ? REGION_INFO[selectedRegion].nameTh
                    : "โรงพยาบาลทั้งหมด"}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {displayedHospitals.length} โรงพยาบาล
                </p>
              </div>
              {selectedRegion && (
                <button
                  onClick={() => handleSelectRegion(null)}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5"
                >
                  ล้างตัวกรอง ✕
                </button>
              )}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              <AnimatePresence mode="popLayout">
                {displayedHospitals.map((hospital) => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
