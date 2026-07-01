import React from "react";
import { useLocation } from "wouter";
import {
  Building2,
  Activity,
  Droplets,
  AlertTriangle,
  ArrowRight,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuildingConfig, BuildingLive, BuildingStatus } from "@/lib/buildings";
import { DiagramPreview } from "@/components/scada/DiagramPreview";

const STATUS_STYLES: Record<
  BuildingStatus,
  { dot: string; text: string; bg: string; label: string; labelEn: string; ring?: string }
> = {
  normal: {
    dot: "bg-green-500",
    text: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30",
    label: "ปกติ",
    labelEn: "NORMAL",
  },
  warning: {
    dot: "bg-amber-500",
    text: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    label: "เฝ้าระวัง",
    labelEn: "WARNING",
  },
  critical: {
    dot: "bg-red-500",
    text: "text-red-400",
    bg: "bg-red-500/15 border-red-500/40",
    label: "วิกฤต",
    labelEn: "CRITICAL",
    ring: "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
  },
  offline: {
    dot: "bg-gray-500",
    text: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/30",
    label: "ออฟไลน์",
    labelEn: "OFFLINE",
  },
};

interface BuildingCardProps {
  building: BuildingConfig;
  live: BuildingLive;
}

export function BuildingCard({ building, live }: BuildingCardProps) {
  const [, navigate] = useLocation();
  const status = STATUS_STYLES[live.status];
  const isCritical = live.status === "critical";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-md transition-all",
        isCritical ? status.ring : "border-border hover:border-primary/30",
      )}
      data-testid={`card-building-${building.id}`}
    >
      {/* HEADER */}
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/15 border border-primary/30 shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">{building.nameTh}</h3>
            <span className="text-[10px] font-mono text-muted-foreground border border-border bg-muted/40 px-1 rounded shrink-0">
              {building.code}
            </span>
          </div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
            {building.nameEn}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
            ความสามารถ {building.capacityM3PerDay.toLocaleString()} m³/วัน · UPTIME {live.uptime}
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-wider shrink-0",
            status.bg,
            status.text,
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {isCritical && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                  status.dot,
                )}
              />
            )}
            <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", status.dot)} />
          </span>
          <span>{status.label}</span>
          <span className="opacity-50">·</span>
          <span>{status.labelEn}</span>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-3 gap-2">
        <KPIMini
          icon={Activity}
          label="INFLOW"
          labelTh="อัตราน้ำเข้า"
          value={live.inflowRate.toFixed(1)}
          unit="m³/h"
        />
        <KPIMini
          icon={Droplets}
          label="TODAY"
          labelTh="รวมวันนี้"
          value={live.totalFlowToday.toLocaleString()}
          unit="m³"
        />
        <KPIMini
          icon={CheckCircle2}
          label="COMPLIANCE"
          labelTh="ผ่านเกณฑ์"
          value={live.effluentCompliance.toFixed(1)}
          unit="%"
          highlight={live.effluentCompliance >= 99}
        />
      </div>

      {/* WATER QUALITY */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
          คุณภาพน้ำ · WATER QUALITY
        </div>
        <div className="grid grid-cols-4 gap-2">
          <WQMini label="pH" value={live.pH.toFixed(2)} alert={live.pH < 5.5 || live.pH > 9} />
          <WQMini
            label="DO"
            value={live.do.toFixed(2)}
            unit="mg/L"
            alert={live.do < 2.0}
          />
          <WQMini
            label="Turb"
            value={live.turbidity.toFixed(1)}
            unit="NTU"
            alert={live.turbidity > 5}
          />
          <WQMini
            label="Cl₂"
            value={live.residualCl2.toFixed(2)}
            unit="mg/L"
            alert={live.residualCl2 < 0.5 || live.residualCl2 > 1.0}
          />
        </div>
      </div>

      {/* TANKS — Process Flow Diagram (auto-generated default when the
          operator hasn't manually configured one in Settings → Diagram). */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          แผนผังกระบวนการ · PROCESS DIAGRAM
        </div>
        <DiagramPreview building={building} live={live} />
      </div>

      {/* FOOTER */}
      <div className="flex items-center gap-3 pt-2 border-t border-border text-[11px] flex-wrap">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-muted-foreground uppercase tracking-wider text-[10px]">
            EQUIP
          </span>
          <span className="font-mono font-bold text-foreground tabular-nums">
            {live.equipmentRunning}/{live.equipmentTotal}
          </span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {live.activeAlarms.length > 0 ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span className="font-mono font-bold text-destructive shrink-0">
                {live.activeAlarms.length} ALARM
                {live.activeAlarms.length > 1 ? "S" : ""}
              </span>
              <span className="text-muted-foreground truncate">
                · {live.activeAlarms[0].description}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="font-mono text-green-400">ไม่มีการแจ้งเตือน</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate(`/building/${building.id}`)}
          className="ml-auto flex items-center gap-1 text-primary hover:text-primary/80 font-mono uppercase tracking-wider text-[10px] cursor-pointer"
          data-testid={`button-view-${building.id}`}
        >
          ดูรายละเอียด <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

interface KPIMiniProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelTh: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}

function KPIMini({ icon: Icon, label, labelTh, value, unit, highlight }: KPIMiniProps) {
  return (
    <div className="flex flex-col bg-muted/30 border border-border rounded p-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-base font-mono font-bold tabular-nums",
            highlight ? "text-green-400" : "text-foreground",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[9px] font-mono text-muted-foreground">{unit}</span>
        )}
      </div>
      <span className="text-[9px] text-muted-foreground truncate">{labelTh}</span>
    </div>
  );
}

interface WQMiniProps {
  label: string;
  value: string;
  unit?: string;
  alert?: boolean;
}

function WQMini({ label, value, unit, alert }: WQMiniProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-muted/30 border rounded p-1.5",
        alert ? "border-destructive/50 bg-destructive/10" : "border-border",
      )}
    >
      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-mono font-bold tabular-nums leading-tight",
          alert ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </span>
      {unit && (
        <span className="text-[9px] font-mono text-muted-foreground leading-none">{unit}</span>
      )}
    </div>
  );
}
