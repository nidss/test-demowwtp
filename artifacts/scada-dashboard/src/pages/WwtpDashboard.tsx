import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBuildingConfigs, useBuildingsLive } from "@/lib/buildings";
import { BuildingDetailContent } from "@/pages/BuildingDetail";

// ─── WWTP single-building dashboard (/wwtp) ──────────────────────────────────
//
// Unlike the Overview page (which shows every Siriraj building as a card grid),
// this view focuses on ONE building at a time and lets the operator switch
// between them with a dropdown at the top. The per-building body is the same
// full detail layout used by `/building/:id`, reused via `BuildingDetailContent`.
//
// The selected building id is remembered in localStorage so returning to the
// page keeps the operator's last context.

const SELECTED_KEY = "scada.wwtp.selectedBuilding";

export default function WwtpDashboard() {
  const configs = useBuildingConfigs();
  const liveAll = useBuildingsLive();

  const sorted = useMemo(
    () => [...configs].sort((a, b) => a.order - b.order),
    [configs],
  );

  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      return localStorage.getItem(SELECTED_KEY) ?? "";
    } catch {
      return "";
    }
  });

  // Ensure a valid selection: fall back to the first building if the stored id
  // no longer exists (e.g. building deleted in Settings).
  useEffect(() => {
    if (sorted.length === 0) return;
    const stillExists = sorted.some((b) => b.id === selectedId);
    if (!stillExists) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted, selectedId]);

  const onSelect = (id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(SELECTED_KEY, id);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  };

  const config = sorted.find((b) => b.id === selectedId) ?? sorted[0];
  const live = config ? liveAll[config.id] : undefined;

  // Dropdown rendered inline with the building header via headerAccessory.
  const selector = (
    <div className="flex flex-col gap-1 shrink-0">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        เลือกตึก · SELECT BUILDING
      </span>
      <Select value={config?.id ?? ""} onValueChange={onSelect}>
        <SelectTrigger className="w-[260px]">
          <SelectValue placeholder="เลือกตึก" />
        </SelectTrigger>
        <SelectContent>
          {sorted.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              <span className="font-medium">{b.nameTh}</span>
              <span className="text-muted-foreground font-mono text-xs ml-1.5">
                ({b.code})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (!config || !live) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground font-mono">ยังไม่มีตึกในระบบ</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BuildingDetailContent
        key={config.id}
        config={config}
        live={live}
        headerAccessory={selector}
      />
    </AppShell>
  );
}
