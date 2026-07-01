import { useMemo } from "react";
import {
  Activity,
  Droplets,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/scada/AppShell";
import { BuildingCard } from "@/components/scada/BuildingCard";
import { useBuildingsAggregate } from "@/lib/buildings";

// ─── Overview / Home ─────────────────────────────────────────────────────────
//
// Top-level dashboard for the Siriraj WWTP. Shows a plant-wide KPI strip
// summarising every building, then a responsive grid of per-building cards.
// All data is live (refreshes via useBuildingsLive inside the aggregate hook).

export default function Home() {
  const {
    live,
    buildings,
    totalInflow,
    totalFlowToday,
    alarmCount,
    plantsOnline,
    criticalCount,
    warningCount,
  } = useBuildingsAggregate();

  const sortedBuildings = useMemo(
    () => [...buildings].sort((a, b) => a.order - b.order),
    [buildings],
  );

  // Average effluent compliance across all buildings that report it.
  const avgCompliance = useMemo(() => {
    const vals = Object.values(live).map((b) => b.effluentCompliance);
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [live]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              ภาพรวมระบบบำบัดน้ำเสีย
              <span className="text-sm font-normal text-muted-foreground">
                | Overview
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              โรงพยาบาลศิริราช · {sortedBuildings.length} ตึก · ข้อมูลเรียลไทม์
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-red-500/10 text-red-400 border-red-500/30 text-xs font-mono animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                {criticalCount} วิกฤต
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5" />
                {warningCount} เฝ้าระวัง
              </span>
            )}
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            icon={Building2}
            label="PLANTS ONLINE"
            labelTh="ตึกออนไลน์"
            value={`${plantsOnline}/${sortedBuildings.length}`}
          />
          <KpiCard
            icon={Activity}
            label="TOTAL INFLOW"
            labelTh="อัตราน้ำเข้ารวม"
            value={totalInflow.toLocaleString()}
            unit="m³/h"
          />
          <KpiCard
            icon={Droplets}
            label="FLOW TODAY"
            labelTh="น้ำรวมวันนี้"
            value={totalFlowToday.toLocaleString()}
            unit="m³"
          />
          <KpiCard
            icon={CheckCircle2}
            label="AVG COMPLIANCE"
            labelTh="ผ่านเกณฑ์เฉลี่ย"
            value={avgCompliance.toFixed(1)}
            unit="%"
            highlight={avgCompliance >= 99}
          />
          <KpiCard
            icon={AlertTriangle}
            label="ACTIVE ALARMS"
            labelTh="แจ้งเตือนที่ค้าง"
            value={String(alarmCount)}
            alert={alarmCount > 0}
          />
        </div>

        {/* ── Building cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedBuildings.map((b) => {
            const liveData = live[b.id];
            if (!liveData) return null;
            return <BuildingCard key={b.id} building={b} live={liveData} />;
          })}
        </div>

        {sortedBuildings.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Gauge className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              ยังไม่มีตึกในระบบ — เพิ่มได้ที่หน้าตั้งค่า
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelTh: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  alert?: boolean;
}

function KpiCard({
  icon: Icon,
  label,
  labelTh,
  value,
  unit,
  highlight,
  alert,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors",
        alert ? "border-destructive/40 bg-destructive/5" : "border-border",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center h-10 w-10 rounded-md border shrink-0",
          alert
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : "bg-primary/10 border-primary/20 text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-xl font-mono font-bold tabular-nums",
            alert
              ? "text-destructive"
              : highlight
                ? "text-green-400"
                : "text-foreground",
          )}
        >
          {value}
          {unit && (
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">{labelTh}</div>
      </div>
    </div>
  );
}
