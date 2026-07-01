import { useEffect } from "react";
import { useBuildingConfigs, useBuildingsLive } from "@/lib/buildings";
import { getTasksStore } from "@/lib/tasks-store";

/**
 * Mirrors every `activeAlarm` across all buildings into the system "Alarm List"
 * task list. New alarms become tasks; cleared alarms leave their tasks in
 * place (the operator marks them complete to record they were handled).
 *
 * Uses a stable composite ID (buildingId-alarmId) so re-renders never
 * duplicate. Reads buildings/live on every render and reconciles via the
 * store's idempotent `syncAlarmTasks`.
 */
export function useAlarmTaskSync() {
  const buildings = useBuildingConfigs();
  const live = useBuildingsLive();

  useEffect(() => {
    const alarms: { id: string; buildingName: string; equipmentTag: string; message: string }[] = [];
    buildings.forEach((b) => {
      const buildingLive = live[b.id];
      if (!buildingLive) return;
      buildingLive.activeAlarms.forEach((a) => {
        alarms.push({
          // Composite key — survives store rehydrate without dup-creation.
          id: `${b.id}::${a.id}`,
          buildingName: b.nameTh,
          equipmentTag: a.tag,
          message: a.description,
        });
      });
    });
    getTasksStore().syncAlarmTasks(alarms);
  }, [buildings, live]);
}
