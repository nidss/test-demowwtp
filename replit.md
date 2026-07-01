# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### `artifacts/scada-dashboard` — Hospital WWTP

Frontend-only (React + Vite) SCADA-style monitoring dashboard for Siriraj Hospital Wastewater Treatment Plant. Thai-primary UI with dark control-room aesthetic. Uses mocked real-time data via `setInterval` and persists configuration to `localStorage`.

**Pages**: Overview (multi-plant 4-building grid), Trends, Alarms, Equipment, Settings, Users.

**Multi-Building Architecture**: The hospital has separate WWTPs per major building. 4 default buildings ship pre-seeded:

- `b-si` ตึกสยามินทร์ (Siamindra) — 1,800 m³/day
- `b-84y` ตึก ๘๔ ปี (84 Years Building) — 1,200 m³/day
- `b-cm` ตึกศูนย์การแพทย์ (Medical Center) — 2,400 m³/day
- `b-ss` ตึกศรีสวรินทิรา (Srisavarindira) — 900 m³/day

`src/lib/buildings.ts` defines a `BuildingsStore` (similar pattern to `ScadaStore`) that holds an array of `BuildingConfig`. Each `BuildingConfig` owns its own `tanks: BuildingTankConfig[]`, `equipment: BuildingEquipmentConfig[]`, `alarms: BuildingAlarm[]`, plus baseline KPIs (`baseInflow`, `basePH`, `baseDO`, `baseTurbidity`, `baseCl2`, `baseCompliance`, `initialFlowToday`, `uptime`). The store persists to `localStorage` key `scada.buildings.v2` and exposes CRUD: `addBuilding/updateBuilding/removeBuilding/moveBuilding`, `addTank/updateTank/removeTank/moveTank` (per building id), `addEquipment/updateEquipment/removeEquipment` (per building id), and `resetToDefaults`.

Hooks: `useBuildingConfigs()` returns the live config array; `useBuildingsLive()` ticks every 1.5 s producing per-building live values (inflow with noise, accumulating `totalFlowToday`, water-quality with noise, tank levels with noise, equipment running count); `useBuildingsAggregate()` returns `{ live, buildings, totalInflow, totalFlowToday, alarmCount, plantsOnline, criticalCount, warningCount }` for plant-wide totals.

The Home page renders an aggregate KPI strip (5 tiles) plus a responsive grid of `BuildingCard` components (one per configured building) — each card shows a status badge (NORMAL/WARNING/CRITICAL), 3 KPIs, 4 water-quality minis, vertical mini-tank shapes with high/low color flagging (alarm dot when level > 85% or < 15%), equipment running counter, and active-alarm summary. The Settings page is fully building-scoped — see below. Detail pages (Trends/Alarms/Equipment) still operate on the legacy single-plant `ScadaStore` (`scada.tanks.v1` / `scada.equipment.v1`) and are not yet building-aware.

**Settings Page** (`src/pages/Settings.tsx`) has 3 tabs:

1. **ตึก / Buildings** — list of all buildings with reorder up/down, edit (full dialog with Basic info + Baseline KPIs sections), delete (cascade-removes child tanks/equipment), and "+ Add Building" button. Cannot delete the last remaining building.
2. **ถังบำบัด / Tanks** — building selector dropdown + per-building tank CRUD (tag, Thai name, kind, capacity m³, base level %). Reorder up/down. Deleting a tank unlinks any equipment that references it.
3. **เครื่องจักร / Equipment** — building selector dropdown + per-building equipment CRUD (tag, Thai name, kind, status, attached tank from current building's tanks only). Inline status switcher on each row.

A "Reset" button at the top right restores all 4 default buildings (and clears localStorage).

**Role-Based Access Control** (frontend-only, demo):

- 4 roles: `super_admin`, `manager` (Plant Manager), `operator` (Engineer/Operator), `auditor`.
- Permission keys (in `src/lib/auth.ts`): `canViewOverview/Trends/Alarms/Equipment/Settings/Users`, `canAckAlarms`, `canEditEquipment`, `canEditConfigs`, `canManageUsers`, `canExportReports`.
- 4 default users seeded on first load (Thai full names + `siriraj.ac.th` / `pcd.go.th` emails).
- `AuthStore` persists to `localStorage` keys `scada.users.v1` and `scada.currentUser.v1`.
- `useAuth()` hook returns `{ currentUser, role, roleInfo, perms, switchUser }`.
- `RoleGate` component (in `src/components/scada/RoleGate.tsx`) guards routes by permission key — shows AccessDenied 403 for unauthorized roles.
- Sidebar nav auto-filters by `canView*` perms; sidebar footer + topbar show role badge.
- Topbar user menu lets you switch between seeded users (demo).
- Settings buttons disabled for non-`canEditConfigs` roles; Alarms `ACKNOWLEDGE` hidden + replaced with read-only badge for non-`canAckAlarms`.
- Alarms `EXPORT CSV` shown only for roles with `canExportReports`.
- Users page (`/users`) is super-admin-only; cannot delete self or last user.

**Light / Dark Mode**: The app defaults to dark mode (SCADA control-room aesthetic). A Sun/Moon toggle button in the topbar (between ONLINE and ALARM) switches theme instantly. Theme choice persists to `localStorage` key `scada.theme`. Light mode uses a cool blue-gray palette with the same cyan accent color. `main.tsx` reads the stored preference on startup and applies/removes the `.dark` class on `<html>` accordingly.

**localStorage keys**: `scada.tanks.v1`, `scada.equipment.v1`, `scada.users.v1`, `scada.currentUser.v1`, `scada.buildings.v2`, `scada.sidebarOpen`, `scada.theme`.
