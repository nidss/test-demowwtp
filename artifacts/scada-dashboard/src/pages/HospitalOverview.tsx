import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Building2,
  Wifi,
  WifiOff,
  Droplets,
  Activity,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Bed,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/scada/AppShell";
import {
  HOSPITALS,
  REGION_INFO,
  STATUS_CONFIG,
  type NetworkHospital,
} from "@/lib/network-data";

// ─── Hospital detail (national network) ──────────────────────────────────────
//
// Reached from the Network page when an operator clicks a hospital card. The
// only Siriraj entry that's "connected" drills into the live WWTP dashboard;
// every other hospital shows summary network telemetry (mock) since they're not
// wired into the live SCADA feed.

export default function HospitalOverview() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const hospital = useMemo<NetworkHospital | undefined>(
    () => HOSPITALS.find((h) => h.id === id),
    [id],
  );

  if (!hospital) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground font-mono">ไม่พบข้อมูลโรงพยาบาลนี้</p>
          <button
            type="button"
            onClick={() => navigate("/network")}
            className="flex items-center gap-2 text-sm text-primary hover:underline font-mono"
          >
            <ArrowLeft className="h-4 w-4" /> กลับหน้าเครือข่าย
          </button>
        </div>
      </AppShell>
    );
  }

  const sc = STATUS_CONFIG[hospital.status];
  const region = REGION_INFO[hospital.region];
  const isOffline = hospital.status === "offline";

  return (
    <AppShell>
      <div className="flex flex-col gap-6 w-full max-w-[1300px] mx-auto pb-12">
        {/* Breadcrumb */}
        <button
          type="button"
          onClick={() => navigate("/network")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-mono w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> เครือข่ายทั่วประเทศ
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 shrink-0">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{hospital.nameTh}</h1>
              <span className="text-xs font-mono text-muted-foreground border border-border bg-muted/40 px-1.5 py-0.5 rounded">
                {hospital.shortCode}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono uppercase tracking-wider",
                  sc.badge,
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", sc.dot)} />
                {sc.label}
              </span>
              {hospital.connected ? (
                <span className="flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-[10px] font-mono">
                  <Wifi className="h-3 w-3" /> LIVE SCADA
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/40 text-muted-foreground text-[10px] font-mono">
                  <WifiOff className="h-3 w-3" /> ไม่ได้เชื่อมต่อ
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-muted-foreground mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {hospital.province} ·{" "}
              <span style={{ color: region.accentLight }}>{region.nameTh}</span> ·{" "}
              {hospital.nameEn}
            </p>
          </div>

          {hospital.connected && (
            <button
              type="button"
              onClick={() => navigate("/wwtp")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors"
            >
              เปิด Dashboard ระบบบำบัด →
            </button>
          )}
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox
            icon={Gauge}
            label="CAPACITY"
            labelTh="ความสามารถบำบัด"
            value={hospital.capacity.toLocaleString()}
            unit="m³/วัน"
          />
          <KpiBox
            icon={Activity}
            label="INFLOW"
            labelTh="อัตราน้ำเข้า"
            value={isOffline ? "—" : String(hospital.inflow)}
            unit={isOffline ? "" : "m³/h"}
          />
          <KpiBox
            icon={CheckCircle2}
            label="COMPLIANCE"
            labelTh="ผ่านเกณฑ์"
            value={isOffline ? "—" : String(hospital.compliance)}
            unit={isOffline ? "" : "%"}
            highlight={!isOffline && hospital.compliance >= 95}
            alert={!isOffline && hospital.compliance < 85}
          />
          <KpiBox
            icon={Bed}
            label="BEDS"
            labelTh="จำนวนเตียง"
            value={hospital.beds.toLocaleString()}
            unit="เตียง"
          />
        </div>

        {/* Status / alarms summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                สถานะการทำงาน
              </span>
            </div>
            {isOffline ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <WifiOff className="h-5 w-5" />
                <span className="text-sm">
                  โรงพยาบาลนี้ออฟไลน์ — ไม่มีข้อมูลเรียลไทม์
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <StatusRow label="โหลดการบำบัด" value={`${Math.round((hospital.inflow / (hospital.capacity / 24)) * 100)}%`} />
                <StatusRow label="ภูมิภาค" value={region.nameTh} />
                <StatusRow
                  label="การเชื่อมต่อ SCADA"
                  value={hospital.connected ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                การแจ้งเตือน
              </span>
            </div>
            {hospital.alarms > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/40">
                  <span className="text-xl font-mono font-bold text-amber-400">
                    {hospital.alarms}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  มีการแจ้งเตือน {hospital.alarms} รายการที่ต้องตรวจสอบ
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm">ไม่มีการแจ้งเตือน</span>
              </div>
            )}
          </div>
        </div>

        {!hospital.connected && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            โรงพยาบาลนี้ยังไม่ได้เชื่อมต่อกับระบบ SCADA กลาง — แสดงเฉพาะข้อมูลสรุปเครือข่าย
            ส่วนข้อมูลเรียลไทม์ระดับถัง/อุปกรณ์มีเฉพาะโรงพยาบาลศิริราชที่เชื่อมต่อแล้ว
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiBox({
  icon: Icon,
  label,
  labelTh,
  value,
  unit,
  highlight,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelTh: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-4",
        alert ? "border-destructive/40 bg-destructive/5" : "border-border",
      )}
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 border border-primary/20 shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-xl font-mono font-bold tabular-nums",
            alert ? "text-destructive" : highlight ? "text-green-400" : "text-foreground",
          )}
        >
          {value}
          {unit && (
            <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">{labelTh}</div>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  );
}
