import React, { useState } from "react";
import { AppShell } from "@/components/scada/AppShell";
import { useBuildingConfigs, useBuildingsLive, buildingsStore, BuildingConfig, BuildingEquipmentConfig } from "@/lib/buildings";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Activity, Power, PowerOff, AlertTriangle, Settings2, Clock, Wrench, Cpu, Zap, Wind, Droplets, Filter, Gauge, HelpCircle, Monitor, ToggleLeft } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const EQ_KIND_ICON: Record<string, React.ElementType> = {
  pump:       Droplets,
  blower:     Wind,
  aerator:    Zap,
  screen:     Filter,
  dosing:     Gauge,
  valve:      Settings2,
  sensor:     Activity,
  oled:       Monitor,
  flow_meter: Gauge,
  switch:     ToggleLeft,
  other:      HelpCircle,
};

const STATUS_BADGE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border border-red-500/40",
  warning:  "bg-amber-500/15 text-amber-400 border border-amber-500/40",
  normal:   "bg-green-500/15 text-green-400 border border-green-500/40",
  offline:  "bg-gray-500/15 text-gray-400 border border-gray-500/40",
};
const STATUS_TH: Record<string, string> = { critical: "วิกฤต", warning: "เฝ้าระวัง", normal: "ปกติ", offline: "ออฟไลน์" };

interface EquipmentWithBuilding extends BuildingEquipmentConfig {
  building: BuildingConfig;
  runtimeHours: number;
  motorCurrent?: number;
  vibration?: number;
  lastMaintenance: string;
  nextMaintenance: string;
}

function enrichEquipment(building: BuildingConfig): EquipmentWithBuilding[] {
  return building.equipment.map((eq, i) => ({
    ...eq,
    building,
    runtimeHours: [4200, 8500, 1200, 3800, 2100, 950, 6200, 450][i % 8],
    motorCurrent: eq.kind === "screen" ? undefined : [2.1, 0.0, 4.5, 3.2, 1.8, 5.6, 2.9, 0.8][i % 8],
    vibration: (eq.kind === "pump" || eq.kind === "blower") ? [1.2, 12.4, 2.1, 0.9, 3.1, 1.6, 0.7, 2.8][i % 8] : undefined,
    lastMaintenance: ["2025-03-15", "2025-01-20", "2025-04-02", "2025-02-28", "2025-03-10", "2024-12-15", "2025-04-20", "2025-03-01"][i % 8],
    nextMaintenance: ["2025-09-15", "2025-07-20", "2025-10-02", "2025-08-28", "2025-09-10", "2025-06-15", "2025-10-20", "2025-09-01"][i % 8],
  }));
}

const generateSparkline = () => Array.from({ length: 20 }, () => ({ val: 40 + Math.random() * 20 }));

function EquipmentCard({
  eq,
  onClick,
  onToggle,
  canControl,
}: {
  eq: EquipmentWithBuilding;
  onClick: () => void;
  onToggle: (turnOn: boolean) => void;
  canControl: boolean;
}) {
  const isRunning = eq.status === "running";
  const isFault = eq.status === "fault";
  const sparkData = React.useMemo(generateSparkline, []);
  const Icon = EQ_KIND_ICON[eq.kind] ?? HelpCircle;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:bg-muted/50 border-2",
        isFault   ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" :
        isRunning ? "border-transparent hover:border-primary/50" :
                    "border-transparent opacity-80",
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background shrink-0",
            isFault   ? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
            isRunning ? "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" :
                        "border-border opacity-60",
          )}>
            <Icon className={cn("h-4 w-4", isFault ? "text-red-400" : isRunning ? "text-green-400" : "text-muted-foreground")} />
          </div>
          <div>
            <CardTitle className="text-sm font-bold leading-tight">{eq.nameTh}</CardTitle>
            <div className="text-[10px] font-mono text-muted-foreground uppercase">{eq.kind}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Badge variant="outline" className={cn("font-mono text-xs", isRunning ? "bg-green-500/10 text-green-500 border-green-500/50" : isFault ? "bg-red-500/10 text-red-500 border-red-500/50 animate-pulse" : "bg-muted text-muted-foreground")}>
            {isRunning && <Power className="w-3 h-3 mr-1" />}
            {isFault && <AlertTriangle className="w-3 h-3 mr-1" />}
            {eq.status === "stopped" && <PowerOff className="w-3 h-3 mr-1" />}
            {eq.status.toUpperCase()}
          </Badge>
          <Switch
            checked={isRunning}
            onCheckedChange={onToggle}
            disabled={!canControl}
            title={canControl ? (isRunning ? "หยุดเครื่อง" : "เดินเครื่อง") : "ไม่มีสิทธิ์ควบคุมเครื่องจักร"}
            aria-label={`เปิด/ปิด ${eq.nameTh}`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-end mb-3">
          <div className="text-2xl font-mono font-bold tracking-tighter text-primary">{eq.tag}</div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground font-mono">RUNTIME</div>
            <div className="text-sm font-mono">{eq.runtimeHours.toLocaleString()}h</div>
          </div>
        </div>
        {(eq.motorCurrent !== undefined || eq.vibration !== undefined) && (
          <div className="grid grid-cols-2 gap-2 mb-3 bg-muted/30 p-2 rounded-md">
            {eq.motorCurrent !== undefined && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Current</div>
                <div className="font-mono text-sm">{eq.motorCurrent.toFixed(1)} A</div>
              </div>
            )}
            {eq.vibration !== undefined && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Vibration</div>
                <div className="font-mono text-sm">{eq.vibration.toFixed(1)} mm/s</div>
              </div>
            )}
          </div>
        )}
        {isRunning && (
          <div className="h-8 w-full opacity-50">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <YAxis domain={["dataMin - 10", "dataMax + 10"]} hide />
                <Area type="monotone" dataKey="val" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BuildingSection({
  building,
  equipment,
  onSelect,
  onToggle,
  canControl,
}: {
  building: BuildingConfig;
  equipment: EquipmentWithBuilding[];
  onSelect: (eq: EquipmentWithBuilding) => void;
  onToggle: (eq: EquipmentWithBuilding, turnOn: boolean) => void;
  canControl: boolean;
}) {
  const running = equipment.filter((e) => e.status === "running").length;
  const fault   = equipment.filter((e) => e.status === "fault").length;
  const stopped = equipment.filter((e) => e.status === "stopped").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">{building.code}</span>
          <span className="font-bold text-base">{building.nameTh}</span>
          <span className="text-sm text-muted-foreground">{building.nameEn}</span>
        </div>
        <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded", STATUS_BADGE[building.status])}>
          {STATUS_TH[building.status]}
        </span>
        <div className="flex items-center gap-2 ml-auto text-[11px] font-mono">
          {running > 0 && <span className="text-green-500">▲ {running} RUNNING</span>}
          {fault > 0   && <span className="text-red-400 animate-pulse">⚠ {fault} FAULT</span>}
          {stopped > 0 && <span className="text-muted-foreground">■ {stopped} STOPPED</span>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[...equipment.filter(e => e.status === "fault"), ...equipment.filter(e => e.status === "running"), ...equipment.filter(e => e.status === "stopped")].map((eq) => (
          <EquipmentCard
            key={eq.id}
            eq={eq}
            onClick={() => onSelect(eq)}
            onToggle={(turnOn) => onToggle(eq, turnOn)}
            canControl={canControl}
          />
        ))}
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  const buildings = useBuildingConfigs();
  const { perms } = useAuth();
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [selectedEq, setSelectedEq] = useState<EquipmentWithBuilding | null>(null);

  const handleToggle = (eq: EquipmentWithBuilding, turnOn: boolean) => {
    buildingsStore.updateEquipment(eq.building.id, eq.id, {
      status: turnOn ? "running" : "stopped",
    });
  };

  const allEnriched = buildings.map((b) => enrichEquipment(b));

  const displayBuildings = selectedBuildingId === "all"
    ? buildings
    : buildings.filter((b) => b.id === selectedBuildingId);

  const totalRunning = allEnriched.flat().filter(e => e.status === "running").length;
  const totalFault   = allEnriched.flat().filter(e => e.status === "fault").length;
  const totalStopped = allEnriched.flat().filter(e => e.status === "stopped").length;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 w-full max-w-[1600px] mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Equipment Status <span className="text-sm font-normal text-muted-foreground">| สถานะเครื่องจักร</span>
            </h2>
            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono">
              <span className="text-green-500">▲ {totalRunning} RUNNING</span>
              {totalFault > 0 && <span className="text-red-400 animate-pulse">⚠ {totalFault} FAULT</span>}
              {totalStopped > 0 && <span className="text-muted-foreground">■ {totalStopped} STOPPED</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <Cpu className="h-4 w-4" />
            <span>{allEnriched.flat().length} เครื่องจักรทั้งหมด</span>
          </div>
        </div>

        {/* Building Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => setSelectedBuildingId("all")}
            className={cn(
              "shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono font-semibold transition-all",
              selectedBuildingId === "all"
                ? "bg-primary/15 border-primary text-primary shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                : "bg-card border-border text-muted-foreground hover:bg-muted/50",
            )}
          >
            ทั้งหมด
            <span className="text-[10px] opacity-70">ALL</span>
          </button>
          {buildings.map((b) => {
            const enriched = enrichEquipment(b);
            const faultCount = enriched.filter(e => e.status === "fault").length;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBuildingId(b.id)}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all",
                  selectedBuildingId === b.id
                    ? "bg-primary/15 border-primary text-primary shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                    : "bg-card border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span className="font-mono text-[10px] opacity-70">{b.code}</span>
                {b.nameTh}
                <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", STATUS_BADGE[b.status])}>
                  {STATUS_TH[b.status]}
                </span>
                {faultCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    {faultCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Equipment sections */}
        <div className="flex flex-col gap-8">
          {displayBuildings.map((b, idx) => {
            const enriched = enrichEquipment(b);
            return (
              <React.Fragment key={b.id}>
                {idx > 0 && selectedBuildingId === "all" && <div className="border-t border-border/40" />}
                <BuildingSection
                  building={b}
                  equipment={enriched}
                  onSelect={setSelectedEq}
                  onToggle={handleToggle}
                  canControl={perms.canEditEquipment}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedEq} onOpenChange={(open) => !open && setSelectedEq(null)}>
          {selectedEq && (
            <DialogContent className={cn(
              "sm:max-w-[600px] bg-card",
              selectedEq.status === "fault"
                ? "border-2 border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.25)]"
                : "border-border",
            )}>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{selectedEq.building.code}</span>
                      <span className="text-xs text-muted-foreground">{selectedEq.building.nameTh}</span>
                    </div>
                    <DialogTitle className="text-2xl font-bold">{selectedEq.nameTh}</DialogTitle>
                    <DialogDescription className="font-mono uppercase text-primary">
                      {selectedEq.tag} — {selectedEq.kind.toUpperCase()}
                    </DialogDescription>
                  </div>
                  <div className={cn("p-3 rounded-full", selectedEq.status === "running" ? "bg-green-500/20 text-green-500" : selectedEq.status === "fault" ? "bg-red-500/20 text-red-500" : "bg-muted text-muted-foreground")}>
                    {selectedEq.status === "running" ? <Activity className="w-8 h-8" /> : selectedEq.status === "fault" ? <AlertTriangle className="w-8 h-8" /> : <PowerOff className="w-8 h-8" />}
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-muted/30 p-4 rounded-lg flex flex-col gap-1 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-semibold">
                    <Clock className="w-4 h-4" /> Total Runtime
                  </div>
                  <div className="text-2xl font-mono">{selectedEq.runtimeHours.toLocaleString()} <span className="text-sm text-muted-foreground">hours</span></div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg flex flex-col gap-1 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-semibold">
                    <Settings2 className="w-4 h-4" /> Status
                  </div>
                  <div className="text-2xl font-mono capitalize">{selectedEq.status}</div>
                </div>
                <div className="col-span-2 bg-muted/30 p-4 rounded-lg flex flex-col gap-1 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-semibold mb-2">
                    <Wrench className="w-4 h-4" /> Maintenance Schedule
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm">Last Maintained</span>
                    <span className="font-mono text-sm">{selectedEq.lastMaintenance}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-primary">Next Scheduled</span>
                    <span className="font-mono text-sm text-primary">{selectedEq.nextMaintenance}</span>
                  </div>
                </div>
                {selectedEq.status === "running" && (
                  <div className="col-span-2 mt-2 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                    <h4 className="text-xs uppercase text-primary font-bold mb-4 font-mono">Live Telemetry Stream</h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={Array.from({ length: 30 }, () => ({ val: (selectedEq.motorCurrent || 10) + Math.random() * 2 }))}>
                          <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                          <Area type="step" dataKey="val" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppShell>
  );
}
