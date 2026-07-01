import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter as FilterIcon,
  ShieldCheck,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useBuildingConfigs } from "@/lib/buildings";
import {
  useAlarms,
  type ScadaAlarm,
  type AlarmSeverity,
  type AlarmStatus,
} from "@/lib/scada-mock";

// ─── Filter option maps ──────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: AlarmStatus | "all"; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "Active", label: "Active · ทำงานอยู่" },
  { value: "Acknowledged", label: "Acknowledged · รับทราบ" },
  { value: "Cleared", label: "Cleared · ปิดแล้ว" },
];

const SEVERITY_OPTIONS: { value: AlarmSeverity | "all"; label: string }[] = [
  { value: "all", label: "ทุกระดับ" },
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Warning", label: "Warning" },
  { value: "Info", label: "Info" },
];

type TimeKey = "today" | "7d" | "30d" | "all";
const TIME_OPTIONS: { value: TimeKey; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
  { value: "all", label: "ทั้งหมด" },
];

const SEVERITY_STYLE: Record<AlarmSeverity, string> = {
  Critical: "bg-red-600 text-white border-red-700",
  High: "bg-red-500/15 text-red-400 border-red-500/40",
  Medium: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  Low: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
  Warning: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  Info: "bg-blue-500/15 text-blue-400 border-blue-500/40",
};

const STATUS_STYLE: Record<AlarmStatus, string> = {
  Active: "bg-red-500/15 text-red-400 border-red-500/40",
  Acknowledged: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  Cleared: "bg-green-500/15 text-green-400 border-green-500/40",
};

const STATUS_LABEL: Record<AlarmStatus, string> = {
  Active: "ทำงานอยู่",
  Acknowledged: "รับทราบ",
  Cleared: "ปิดแล้ว",
};

function elapsed(iso: string): string {
  const min = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min} นาทีที่แล้ว`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} ชม.ที่แล้ว`;
  return `${Math.floor(min / 1440)} วันที่แล้ว`;
}

function withinRange(iso: string, range: TimeKey): boolean {
  if (range === "all") return true;
  const ageMs = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (range === "today") return ageMs <= day;
  if (range === "7d") return ageMs <= 7 * day;
  return ageMs <= 30 * day;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Alarms() {
  const { alarms, acknowledgeAlarm, clearAlarm, reopenAlarm } = useAlarms();
  const { perms } = useAuth();
  const buildings = useBuildingConfigs();

  const [statusF, setStatusF] = useState<AlarmStatus | "all">("all");
  const [sevF, setSevF] = useState<AlarmSeverity | "all">("all");
  const [buildingF, setBuildingF] = useState<string>("all");
  const [timeF, setTimeF] = useState<TimeKey>("all");

  const filtered = useMemo(() => {
    return alarms.filter((a) => {
      if (statusF !== "all" && a.status !== statusF) return false;
      if (sevF !== "all" && a.severity !== sevF) return false;
      if (buildingF !== "all" && a.buildingId !== buildingF) return false;
      if (!withinRange(a.timestamp, timeF)) return false;
      return true;
    });
  }, [alarms, statusF, sevF, buildingF, timeF]);

  const counts = useMemo(() => {
    return {
      active: alarms.filter((a) => a.status === "Active").length,
      ack: alarms.filter((a) => a.status === "Acknowledged").length,
      cleared: alarms.filter((a) => a.status === "Cleared").length,
    };
  }, [alarms]);

  return (
    <AppShell>
      <div className="flex flex-col gap-5 w-full max-w-[1500px] mx-auto pb-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-primary" />
              ประวัติการแจ้งเตือน
              <span className="text-sm font-normal text-muted-foreground">| Alarms</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              แจ้งเตือนจะถูกซิงค์เป็น task ใน “Alarm List” อัตโนมัติ
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-red-500/10 text-red-400 border-red-500/30">
              <AlertTriangle className="w-3 h-3" /> {counts.active} Active
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/30">
              <ShieldCheck className="w-3 h-3" /> {counts.ack} Ack
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-green-500/10 text-green-400 border-green-500/30">
              <CheckCircle2 className="w-3 h-3" /> {counts.cleared} Cleared
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap rounded-xl border bg-card p-3">
          <FilterIcon className="w-4 h-4 text-muted-foreground" />
          <FilterSelect
            value={statusF}
            onChange={(v) => setStatusF(v as AlarmStatus | "all")}
            options={STATUS_OPTIONS}
            width="w-[160px]"
          />
          <FilterSelect
            value={sevF}
            onChange={(v) => setSevF(v as AlarmSeverity | "all")}
            options={SEVERITY_OPTIONS}
            width="w-[140px]"
          />
          <Select value={buildingF} onValueChange={setBuildingF}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกตึก</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nameTh} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FilterSelect
            value={timeF}
            onChange={(v) => setTimeF(v as TimeKey)}
            options={TIME_OPTIONS}
            width="w-[120px]"
          />
          <div className="ml-auto text-[11px] font-mono text-muted-foreground">
            แสดง {filtered.length} จาก {alarms.length} รายการ
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-sm text-muted-foreground">
                ไม่มีการแจ้งเตือนตรงกับตัวกรอง
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left">
                    <Th>ระดับ</Th>
                    <Th>แท็ก</Th>
                    <Th>ตึก</Th>
                    <Th>รายละเอียด</Th>
                    <Th>สถานะ</Th>
                    <Th>เวลา</Th>
                    <Th className="text-right">จัดการ</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <AlarmRow
                      key={a.id}
                      alarm={a}
                      canAck={perms.canAckAlarms}
                      onAck={() => acknowledgeAlarm(a.id)}
                      onClear={() => clearAlarm(a.id)}
                      onReopen={() => reopenAlarm(a.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", width)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

function AlarmRow({
  alarm,
  canAck,
  onAck,
  onClear,
  onReopen,
}: {
  alarm: ScadaAlarm;
  canAck: boolean;
  onAck: () => void;
  onClear: () => void;
  onReopen: () => void;
}) {
  const isActive = alarm.status === "Active";
  const isCleared = alarm.status === "Cleared";

  return (
    <tr
      className={cn(
        "border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors",
        isCleared && "opacity-60",
      )}
    >
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
            SEVERITY_STYLE[alarm.severity],
          )}
        >
          {(alarm.severity === "Critical" || alarm.severity === "High") && (
            <AlertTriangle className="h-3 w-3" />
          )}
          {alarm.severity}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-primary font-bold text-xs whitespace-nowrap">
        {alarm.tag}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="font-mono text-[10px]">
          {alarm.buildingCode}
        </Badge>
      </td>
      <td className="px-4 py-3 text-foreground">{alarm.description}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex px-2 py-0.5 rounded text-[10px] font-mono border",
            STATUS_STYLE[alarm.status],
          )}
        >
          {STATUS_LABEL[alarm.status]}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-muted-foreground text-xs whitespace-nowrap">
        {elapsed(alarm.timestamp)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {!canAck ? (
            <span className="text-[10px] font-mono text-muted-foreground">
              อ่านอย่างเดียว
            </span>
          ) : isCleared ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] font-mono gap-1"
              onClick={onReopen}
            >
              <RotateCcw className="h-3 w-3" /> เปิดใหม่
            </Button>
          ) : (
            <>
              {isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-mono"
                  onClick={onAck}
                >
                  รับทราบ
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-mono gap-1 text-green-500 hover:text-green-400"
                onClick={onClear}
              >
                <XCircle className="h-3 w-3" /> ปิด
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
