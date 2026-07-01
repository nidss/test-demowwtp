import { useEffect, useState } from "react";
import {
  buildingsStore,
  type BuildingConfig,
  type BuildingAlarm,
} from "@/lib/buildings";

// ─────────────────────────────────────────────────────────────────────────────
// scada-mock — system-wide derived state used by the AppShell chrome (top-bar
// uptime, active-alarm popover) and the Alarms history page.
//
// There is no backend; everything is computed from `buildingsStore`. Alarms are
// derived from each building's configured `alarms` plus any equipment whose
// status is "fault". An in-memory acknowledgement/clear log lets operators move
// alarms through their lifecycle (Active → Acknowledged → Cleared) for the
// duration of the session — this mirrors how the rest of the app keeps mock
// state without persisting it to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

export type AlarmSeverity =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Warning"
  | "Info";

export type AlarmStatus = "Active" | "Acknowledged" | "Cleared";

export interface ScadaAlarm {
  id: string;
  /** Equipment / sensor tag the alarm fired on. */
  tag: string;
  severity: AlarmSeverity;
  description: string;
  status: AlarmStatus;
  /** ISO timestamp of when the alarm first fired. */
  timestamp: string;
  /** Building this alarm belongs to (for filtering on the Alarms page). */
  buildingId: string;
  buildingCode: string;
  buildingNameTh: string;
}

export interface ScadaKpi {
  plantUptime: string;
  totalInflow: number;
  totalFlowToday: number;
  plantsOnline: number;
  plantsTotal: number;
  activeAlarmCount: number;
}

// ─── Severity normalisation ──────────────────────────────────────────────────
//
// buildings.ts uses High/Warning/Info; the AppShell popover styles also handle
// Critical/Medium/Low. We map the building severities up to the richer scale so
// a building's worst alarm still reads as "Critical" when the building itself
// is in a critical state.

function mapBuildingSeverity(
  sev: BuildingAlarm["severity"],
  buildingCritical: boolean,
): AlarmSeverity {
  if (sev === "High") return buildingCritical ? "Critical" : "High";
  if (sev === "Warning") return "Warning";
  return "Info";
}

// ─── Acknowledgement log ─────────────────────────────────────────────────────
//
// Stable alarm IDs (`{buildingId}::{alarmId}` and `{buildingId}::fault::{tag}`)
// let us remember which alarms an operator has acknowledged or cleared across
// re-renders without persisting anything.

type Lifecycle = "Acknowledged" | "Cleared";
const lifecycleLog: Record<string, Lifecycle> = {};

// Stable session epoch so derived timestamps don't jump around every render.
const SESSION_START = Date.now();

function buildAlarms(buildings: BuildingConfig[]): ScadaAlarm[] {
  const out: ScadaAlarm[] = [];

  buildings.forEach((b) => {
    const buildingCritical = b.status === "critical";

    // 1) Configured building alarms (already carry an ageMin).
    b.alarms.forEach((a) => {
      const id = `${b.id}::${a.id}`;
      out.push({
        id,
        tag: a.tag,
        severity: mapBuildingSeverity(a.severity, buildingCritical),
        description: a.description,
        status: lifecycleLog[id] ?? "Active",
        timestamp: new Date(SESSION_START - a.ageMin * 60_000).toISOString(),
        buildingId: b.id,
        buildingCode: b.code,
        buildingNameTh: b.nameTh,
      });
    });

    // 2) Synthesise an alarm for every faulted piece of equipment that doesn't
    //    already have a matching configured alarm (dedupe by tag).
    const knownTags = new Set(b.alarms.map((a) => a.tag));
    b.equipment
      .filter((e) => e.status === "fault" && !knownTags.has(e.tag))
      .forEach((e) => {
        const id = `${b.id}::fault::${e.tag}`;
        out.push({
          id,
          tag: e.tag,
          severity: buildingCritical ? "Critical" : "High",
          description: `${e.nameTh} ขัดข้อง / Equipment fault`,
          status: lifecycleLog[id] ?? "Active",
          timestamp: new Date(SESSION_START - 8 * 60_000).toISOString(),
          buildingId: b.id,
          buildingCode: b.code,
          buildingNameTh: b.nameTh,
        });
      });
  });

  // Newest first.
  return out.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

// ─── Uptime aggregate ────────────────────────────────────────────────────────
//
// Report the *minimum* uptime across all buildings as the plant-wide figure —
// the system is only as "up" as its least-available plant. Uptime strings look
// like "45d 12h"; we parse them to compare.

function parseUptimeHours(uptime: string): number {
  const d = /(\d+)\s*d/.exec(uptime)?.[1];
  const h = /(\d+)\s*h/.exec(uptime)?.[1];
  return (Number(d) || 0) * 24 + (Number(h) || 0);
}

function computeKpi(buildings: BuildingConfig[], alarms: ScadaAlarm[]): ScadaKpi {
  let minUptime = "—";
  let minHours = Infinity;
  let totalInflow = 0;
  let plantsOnline = 0;

  buildings.forEach((b) => {
    const hrs = parseUptimeHours(b.uptime);
    if (hrs < minHours) {
      minHours = hrs;
      minUptime = b.uptime;
    }
    totalInflow += b.baseInflow;
    if (b.status !== "offline") plantsOnline++;
  });

  return {
    plantUptime: buildings.length ? minUptime : "—",
    totalInflow: Number(totalInflow.toFixed(1)),
    totalFlowToday: buildings.reduce((s, b) => s + b.initialFlowToday, 0),
    plantsOnline,
    plantsTotal: buildings.length,
    activeAlarmCount: alarms.filter((a) => a.status === "Active").length,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Subscribes to the buildings store and returns a refreshed alarm list whenever
 * the underlying config changes. `acknowledgeAlarm` / `clearAlarm` update the
 * in-memory lifecycle log and trigger a re-render.
 */
export function useAlarms() {
  const [, force] = useState(0);

  useEffect(() => {
    const unsub = buildingsStore.subscribe(() => force((v) => v + 1));
    return () => unsub();
  }, []);

  const alarms = buildAlarms(buildingsStore.buildings);

  const acknowledgeAlarm = (id: string) => {
    if (lifecycleLog[id] !== "Cleared") lifecycleLog[id] = "Acknowledged";
    force((v) => v + 1);
  };

  const clearAlarm = (id: string) => {
    lifecycleLog[id] = "Cleared";
    force((v) => v + 1);
  };

  const reopenAlarm = (id: string) => {
    delete lifecycleLog[id];
    force((v) => v + 1);
  };

  return { alarms, acknowledgeAlarm, clearAlarm, reopenAlarm };
}

/**
 * Plant-wide KPI summary for the AppShell sidebar footer and any page that
 * wants a one-line system status. Recomputes when the buildings store changes.
 */
export function useScadaData() {
  const [, force] = useState(0);

  useEffect(() => {
    const unsub = buildingsStore.subscribe(() => force((v) => v + 1));
    return () => unsub();
  }, []);

  const alarms = buildAlarms(buildingsStore.buildings);
  const kpi = computeKpi(buildingsStore.buildings, alarms);

  return { kpi, alarms };
}
