import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Building2, Activity, Droplets, CheckCircle2,
  AlertTriangle, Cpu, Power, PowerOff, Fan, Settings2, Zap,
  FlaskConical, Gauge, Clock, Waves, Filter,
  Monitor, ToggleLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/scada/AppShell";
import {
  useBuildingConfigs, useBuildingsLive,
  type BuildingConfig, type BuildingLive,
  type BuildingTankLive, type BuildingEquipmentConfig,
  type TankKind, type EquipmentKind, type EquipmentStatus,
} from "@/lib/buildings";
import { ScadaSvgIcon, getTankIconUrl } from "@/components/scada/ScadaIcons";
import { getSavedDiagram } from "@/components/scada/ScadaDiagramEditor";
import { DiagramPreview } from "@/components/scada/DiagramPreview";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TANK_KIND_LABEL: Record<TankKind, { th: string; en: string }> = {
  equalization:     { th: "ถังปรับสภาพ",      en: "Equalization"      },
  anoxic:           { th: "ถังไร้อากาศ",       en: "Anoxic"            },
  aeration:         { th: "ถังเติมอากาศ",      en: "Aeration"          },
  clarifier:        { th: "ถังตกตะกอน",        en: "Clarifier"         },
  chlorine_contact: { th: "ถังสัมผัสคลอรีน",   en: "Chlorine Contact"  },
  sludge_holding:   { th: "ถังเก็บสลัดจ์",     en: "Sludge Holding"    },
  custom:           { th: "ถังอื่นๆ",           en: "Custom"            },
};

const EQ_KIND_ICON: Record<EquipmentKind, React.ComponentType<{ className?: string }>> = {
  pump:       Droplets,
  blower:     Fan,
  aerator:    Waves,
  screen:     Filter,
  dosing:     FlaskConical,
  valve:      Settings2,
  sensor:     Activity,
  oled:       Monitor,
  flow_meter: Gauge,
  switch:     ToggleLeft,
  other:      Zap,
};

const STATUS_STYLES = {
  normal:   { dot: "bg-green-500",  text: "text-green-500",  bg: "bg-green-500/10 border-green-500/30",  label: "ปกติ",      en: "NORMAL"   },
  warning:  { dot: "bg-amber-500",  text: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/30",  label: "เฝ้าระวัง", en: "WARNING"  },
  critical: { dot: "bg-red-500",    text: "text-red-400",    bg: "bg-red-500/15 border-red-500/40",       label: "วิกฤต",     en: "CRITICAL" },
  offline:  { dot: "bg-gray-500",   text: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/30",    label: "ออฟไลน์",   en: "OFFLINE"  },
};

const EQ_STATUS_STYLE: Record<EquipmentStatus, { border: string; icon: string; badge: string; label: string }> = {
  running: { border: "border-green-500/50", icon: "text-green-500", badge: "bg-green-500/10 text-green-500 border-green-500/40", label: "RUNNING" },
  stopped: { border: "border-border",       icon: "text-muted-foreground", badge: "bg-muted/50 text-muted-foreground border-border", label: "STOPPED" },
  fault:   { border: "border-red-500/60",   icon: "text-red-500",   badge: "bg-red-500/10 text-red-500 border-red-500/40",   label: "FAULT"   },
};

// ── FlowPipe ──────────────────────────────────────────────────────────────────

function FlowPipe({ active, width = 36 }: { active: boolean; width?: number }) {
  const H = 8; const y = H / 2;
  // BigTank layout: tag label (~16px) + gap-1 (4px) + icon-size/2 (96/2 = 48px)
  // → cylinder centre from top of BigTank ≈ 68px; pipe is 8px tall → marginTop = 68 - 4 = 64px
  return (
    <div className="flex-shrink-0" style={{ width, height: H, marginTop: 64 }}>
      <svg width={width} height={H} style={{ overflow: "visible" }}>
        <line x1={0} y1={y} x2={width} y2={y} stroke="var(--color-border)" strokeWidth={3} strokeLinecap="round" />
        {active && (
          <motion.line
            x1={0} y1={y} x2={width} y2={y}
            stroke="var(--color-primary)" strokeWidth={2} strokeLinecap="round"
            strokeDasharray="6 8"
            style={{ filter: "drop-shadow(0 0 3px var(--color-primary))" }}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -28 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          />
        )}
        <polyline
          points={`${width - 6},${y - 3.5} ${width},${y} ${width - 6},${y + 3.5}`}
          fill="none"
          stroke={active ? "var(--color-primary)" : "var(--color-border)"}
          strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          opacity={active ? 0.9 : 0.4}
        />
      </svg>
    </div>
  );
}

// ── BigTank ───────────────────────────────────────────────────────────────────
// Uses the same SVG artwork as the Diagram editor so the visual language is
// consistent across the entire app. Animated water-level fill, scale ticks
// and gradients have been replaced with a clean SVG icon + a coloured level
// pill — same approach as the editor's TankNode, just larger.

const BIG_TANK_ICON_SIZE = 96; // px — width of the SVG; height auto-matches viewBox

function BigTank({ tag, nameTh, level, capacityM3, kind }: BuildingTankLive & { kind: TankKind }) {
  const high = level > 85; const low = level < 15; const alarm = high || low;
  const volume = Math.round((capacityM3 * level) / 100);
  const isAeration = kind === "aeration";
  const iconUrl = getTankIconUrl(kind);
  const kindInfo = TANK_KIND_LABEL[kind];

  // Level pill colour mirrors the tank kind, so each step in the chain
  // remains visually distinguishable at a glance.
  const pillColor = alarm ? "#ef4444" : "#0e7490";

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("text-[10px] font-mono font-bold tracking-wider", alarm ? "text-destructive" : "text-primary")}>
        {tag}
      </span>

      <div className="relative" style={{ width: BIG_TANK_ICON_SIZE, height: BIG_TANK_ICON_SIZE }}>
        <ScadaSvgIcon
          src={iconUrl}
          size={BIG_TANK_ICON_SIZE}
          style={{
            filter: alarm
              ? "drop-shadow(0 0 8px rgba(239,68,68,0.6))"
              : "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
          }}
        />

        {/* Animated bubbles overlay for aeration tanks — keeps the
            "alive" feel of the old animated 3D rendering. */}
        {isAeration && level > 10 && (
          <svg
            width={BIG_TANK_ICON_SIZE}
            height={BIG_TANK_ICON_SIZE}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.circle
                key={i}
                cx={36 + i * 7}
                r={1.4}
                fill="white"
                fillOpacity={0.85}
                initial={{ cy: 80, opacity: 0 }}
                animate={{ cy: 45, opacity: [0, 0.85, 0] }}
                transition={{ repeat: Infinity, duration: 1.4 + i * 0.2, delay: i * 0.18, ease: "linear" }}
              />
            ))}
          </svg>
        )}

        {/* Alarm pulse dot — top right */}
        {alarm && (
          <span
            className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse"
            style={{ boxShadow: "0 0 6px rgba(239,68,68,0.9)" }}
          />
        )}

        {/* Level pill — bottom right, matches diagram editor's tank node */}
        <div
          style={{
            position: "absolute",
            bottom: 2,
            right: -2,
            background: pillColor,
            color: "white",
            fontSize: 11,
            fontFamily: "monospace",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 8,
            border: `1.5px solid ${alarm ? "#b91c1c" : "#155e75"}`,
            lineHeight: 1.1,
            minWidth: 36,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        >
          {level.toFixed(0)}%
        </div>
      </div>

      <div className="text-center mt-0.5">
        <div className={cn("text-[11px] font-mono font-bold tabular-nums", alarm ? "text-destructive" : "text-foreground")}>
          {level.toFixed(1)}%
        </div>
        <div className="text-[9px] font-mono text-muted-foreground tabular-nums">{volume.toLocaleString()} m³</div>
        <div className="text-[10px] text-foreground/80 font-medium mt-0.5">{kindInfo.th}</div>
        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{kindInfo.en}</div>
        <div className="text-[9px] font-mono text-muted-foreground/60">{capacityM3.toLocaleString()} m³ cap.</div>
      </div>
    </div>
  );
}

// ── EquipmentCard ─────────────────────────────────────────────────────────────

function EquipmentCard({ eq }: { eq: BuildingEquipmentConfig }) {
  const Icon = EQ_KIND_ICON[eq.kind];
  const st = EQ_STATUS_STYLE[eq.status];
  const isRunning = eq.status === "running";
  const isFault   = eq.status === "fault";

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border bg-card p-3 transition-all",
      st.border,
      isFault && "shadow-[0_0_12px_rgba(239,68,68,0.15)]",
    )}>
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background shrink-0",
        isFault   ? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
        isRunning ? "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" :
                    "border-border opacity-60",
      )}>
        <Icon className={cn(
          "h-4 w-4",
          st.icon,
          isRunning && (eq.kind === "pump" || eq.kind === "blower") && "animate-spin",
        )} style={isRunning ? { animationDuration: "2.5s" } : undefined} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-primary">{eq.tag}</span>
          <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border", st.badge)}>
            {st.label}
            {isFault && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
          </span>
        </div>
        <div className="text-[11px] text-foreground truncate">{eq.nameTh}</div>
        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{eq.kind}</div>
      </div>
      {isRunning && (
        <div className="shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
      )}
    </div>
  );
}

// ── WQ KPI ────────────────────────────────────────────────────────────────────

function WQKpi({ label, value, unit, alert, icon: Icon }: {
  label: string; value: string; unit?: string; alert?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 rounded-lg border p-3 bg-card",
      alert ? "border-destructive/50 bg-destructive/5" : "border-border",
    )}>
      <Icon className={cn("h-4 w-4", alert ? "text-destructive" : "text-primary")} />
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-mono font-bold tabular-nums", alert ? "text-destructive" : "text-foreground")}>
        {value}
      </span>
      {unit && <span className="text-[10px] font-mono text-muted-foreground">{unit}</span>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const configs  = useBuildingConfigs();
  const liveAll  = useBuildingsLive();

  const config = configs.find((c) => c.id === id);
  const live   = id ? liveAll[id] : undefined;

  if (!config || !live) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground font-mono">ไม่พบข้อมูลตึกนี้</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-primary hover:underline font-mono"
          >
            <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BuildingDetailContent config={config} live={live} showBackToOverview />
    </AppShell>
  );
}

// ── BuildingDetailContent ─────────────────────────────────────────────────────
//
// The full per-building dashboard body (header + KPIs + water quality + process
// diagram + equipment + alarms). Extracted so both the routed BuildingDetail
// page (`/building/:id`) and the WWTP single-building dashboard (`/wwtp`, which
// swaps buildings via a dropdown) can render identical content without
// duplicating ~200 lines of markup.
//
// `showBackToOverview` renders the "← ภาพรวม" breadcrumb; the WWTP dashboard
// hides it since it has its own building selector instead.
// `headerAccessory` lets the caller inject a control (e.g. the dropdown) inline
// with the header.

interface BuildingDetailContentProps {
  config: BuildingConfig;
  live: BuildingLive;
  showBackToOverview?: boolean;
  headerAccessory?: React.ReactNode;
}

export function BuildingDetailContent({
  config,
  live,
  showBackToOverview = false,
  headerAccessory,
}: BuildingDetailContentProps) {
  const [, navigate] = useLocation();

  const status = STATUS_STYLES[live.status];
  const isCritical = live.status === "critical";

  const runningEq  = config.equipment.filter((e) => e.status === "running");
  const stoppedEq  = config.equipment.filter((e) => e.status === "stopped");
  const faultEq    = config.equipment.filter((e) => e.status === "fault");

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12">

      {/* ── BREADCRUMB / HEADER ── */}
      <div className="flex items-start gap-4 flex-wrap">
        {showBackToOverview && (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-mono mt-1"
          >
            <ArrowLeft className="h-4 w-4" /> ภาพรวม
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{config.nameTh}</h1>
            <span className="text-xs font-mono text-muted-foreground border border-border bg-muted/40 px-1.5 py-0.5 rounded">
              {config.code}
            </span>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono uppercase tracking-wider",
              status.bg, status.text,
            )}>
              <span className={cn("relative flex h-2 w-2")}>
                {isCritical && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", status.dot)} />}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", status.dot)} />
              </span>
              {status.label} · {status.en}
            </div>
          </div>
          <p className="text-sm font-mono text-muted-foreground mt-0.5">
            {config.nameEn} · ความสามารถ {config.capacityM3PerDay.toLocaleString()} m³/วัน · UPTIME {live.uptime}
          </p>
        </div>
        {headerAccessory}
      </div>

      {/* ── KPI STRIP ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Activity,     label: "อัตราน้ำเข้า",  sub: "INFLOW RATE",    val: live.inflowRate.toFixed(1),              unit: "m³/h", hi: false },
            { icon: Droplets,     label: "รวมวันนี้",     sub: "TOTAL TODAY",    val: live.totalFlowToday.toLocaleString(),     unit: "m³",   hi: false },
            { icon: CheckCircle2, label: "ผ่านเกณฑ์",    sub: "COMPLIANCE",     val: live.effluentCompliance.toFixed(2),       unit: "%",    hi: live.effluentCompliance >= 99 },
            { icon: Clock,        label: "เวลาทำงาน",    sub: "UPTIME",         val: live.uptime,                              unit: "",     hi: false },
          ].map((k) => (
            <div key={k.sub} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                <k.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{k.sub}</div>
                <div className={cn("text-xl font-mono font-bold tabular-nums", k.hi ? "text-green-500" : "text-foreground")}>
                  {k.val}<span className="text-xs font-normal text-muted-foreground ml-1">{k.unit}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── WATER QUALITY ── */}
        <div>
          <SectionTitle icon={Gauge} en="WATER QUALITY" th="คุณภาพน้ำ" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            <WQKpi icon={Droplets}    label="pH"         value={live.pH.toFixed(2)}              alert={live.pH < 5.5 || live.pH > 9} />
            <WQKpi icon={Waves}       label="DO"         value={live.do.toFixed(2)}    unit="mg/L"  alert={live.do < 2.0} />
            <WQKpi icon={Activity}    label="Turbidity"  value={live.turbidity.toFixed(1)} unit="NTU"  alert={live.turbidity > 5} />
            <WQKpi icon={FlaskConical} label="Cl₂"       value={live.residualCl2.toFixed(2)} unit="mg/L" alert={live.residualCl2 < 0.5 || live.residualCl2 > 1.0} />
          </div>
        </div>

        {/* ── PROCESS FLOW DIAGRAM ── */}
        <div>
          <SectionTitle
            icon={Droplets}
            en="PROCESS FLOW DIAGRAM"
            th="แผนผังกระบวนการบำบัด"
          />
          <div className={cn(
            "mt-2 rounded-xl border bg-card p-6",
            isCritical && "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.08)]",
          )}>
            {/* Larger preview height since the detail page gives the diagram
                much more horizontal room than the dashboard card. */}
            <DiagramPreview building={config} live={live} height={380} />
          </div>
        </div>

        {/* ── EQUIPMENT ── */}
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <SectionTitle icon={Cpu} en="EQUIPMENT STATUS" th="สถานะเครื่องจักร" />
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-green-500">▲ {runningEq.length} RUNNING</span>
              {faultEq.length > 0 && <span className="text-destructive animate-pulse">⚠ {faultEq.length} FAULT</span>}
              {stoppedEq.length > 0 && <span className="text-muted-foreground">■ {stoppedEq.length} STOPPED</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {/* Fault first, then running, then stopped */}
            {[...faultEq, ...runningEq, ...stoppedEq].map((eq) => (
              <EquipmentCard key={eq.id} eq={eq} />
            ))}
          </div>
        </div>

        {/* ── ALARMS ── */}
        <div>
          <SectionTitle icon={AlertTriangle} en="ACTIVE ALARMS" th="การแจ้งเตือนที่ยังค้างอยู่" />
          <div className="mt-2 rounded-lg border bg-card overflow-hidden">
            {live.activeAlarms.length === 0 ? (
              <div className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-mono text-green-500 text-sm">ไม่มีการแจ้งเตือนในขณะนี้</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">ระดับ</th>
                      <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">แท็ก</th>
                      <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">รายละเอียด</th>
                      <th className="text-right px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.activeAlarms.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                            a.severity === "High"    ? "bg-red-500/15 text-red-400 border border-red-500/40" :
                            a.severity === "Warning" ? "bg-amber-500/15 text-amber-400 border border-amber-500/40" :
                                                       "bg-blue-500/15 text-blue-400 border border-blue-500/40",
                          )}>
                            {a.severity === "High" && <AlertTriangle className="h-3 w-3" />}
                            {a.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-primary font-bold text-xs">{a.tag}</td>
                        <td className="px-4 py-3 text-foreground text-sm">{a.description}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs whitespace-nowrap">{a.ageMin} min ago</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

    </div>
  );
}

// ── Section Title helper ──────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, en, th }: {
  icon: React.ComponentType<{ className?: string }>;
  en: string; th: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-bold text-foreground uppercase tracking-wide">{en}</span>
      <span className="text-xs text-muted-foreground">· {th}</span>
    </div>
  );
}
