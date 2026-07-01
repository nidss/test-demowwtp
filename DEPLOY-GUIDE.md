# 🚀 คู่มือ Deploy — Wastewater Monitor Dashboard (เวอร์ชันรวมล่าสุด)

> **Repo เป้าหมาย: `test-demowwtp`** — repo ทดสอบแยกจาก repo จริง
> (`Wastewater-Monitor-Dashboard`) เพื่อลองว่า source ที่ประกอบใหม่ build/deploy
> ได้จริงก่อน โดยไม่กระทบเว็บที่ deploy ใช้งานจริงอยู่

## นี่คืออะไร

Source code **เวอร์ชันล่าสุด** ที่ประกอบขึ้นจาก:
- โครงสร้าง build จาก Replit (shadcn ui, index.html, config, monorepo)
- ไฟล์ feature ล่าสุด (Tasks, Calendar, แผนที่ไทยจริง, DiagramPreview ฯลฯ)
- งานใหม่วันนี้: **หน้า /wwtp แสดงทีละตึก + dropdown เลือกตึก**

ผ่าน type-check แล้ว (0 errors)

---

## ⚠️ สำคัญ: repo ปัจจุบันบน GitHub เป็นแบบไหน

repo จริง `nidss/Wastewater-Monitor-Dashboard` ตอนนี้เก็บ **build output แบนๆ**
ที่ root (index.html + assets/ + icons/) ซึ่ง GitHub Pages serve ตรงๆ แบบ static

แต่ source ชุดนี้เป็น **pnpm monorepo** ที่ต้อง build ก่อน — คนละรูปแบบกัน
จึงทดสอบกับ **repo ใหม่ `test-demowwtp`** ก่อน เพื่อไม่กระทบของจริง

---

## ทางเลือก A — Auto build ด้วย GitHub Actions (แนะนำ)

Push source ทั้งหมดนี้ขึ้น repo `test-demowwtp` branch `main`
แล้วให้ GitHub Actions build ให้อัตโนมัติ

### ขั้นตอน
1. สร้าง repo ใหม่ชื่อ `test-demowwtp` บน GitHub (ถ้ายังไม่มี) — เว้นว่างไว้ ไม่ต้องมีไฟล์ initial
2. Push ไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น `main`
   ```bash
   git init
   git remote add origin https://github.com/<username>/test-demowwtp.git
   git add .
   git commit -m "Initial: full source + WWTP single-building view"
   git branch -M main
   git push -u origin main
   ```
3. ไปที่ **Settings → Pages → Source: GitHub Actions**
4. workflow `.github/workflows/deploy.yml` จะรันอัตโนมัติ (~2-3 นาที)
   - Build ด้วย `BASE_PATH=/test-demowwtp/` (workflow ดึงชื่อ repo มาเองอัตโนมัติ
     ผ่าน `github.event.repository.name` — ใช้ได้กับชื่อ repo ไหนก็ได้ ไม่ต้องแก้)
   - สร้าง 404.html + .nojekyll ให้อัตโนมัติ
   - Deploy ขึ้น Pages
5. เปิด `https://<username>.github.io/test-demowwtp/`

---

## ทางเลือก B — Build เองในเครื่อง แล้ว upload manual (แบบเดิม)

ถ้าอยากทำแบบเดิม (build local แล้วเอา zip ไปวาง branch `gh-pages`):

```bash
# 1. ติดตั้ง dependencies (ต้องมี pnpm)
pnpm install

# 2. build (สังเกต BASE_PATH ต้องมี ไม่งั้น vite.config จะ error)
BASE_PATH=/test-demowwtp/ NODE_ENV=production \
  pnpm --filter @workspace/scada-dashboard run build

# 3. เตรียมไฟล์ deploy
cd artifacts/scada-dashboard/dist/public
cp index.html 404.html
touch .nojekyll

# 4. zip เนื้อหาใน dist/public/ ทั้งหมด แล้ว upload ทับ branch gh-pages
#    (⚠️ ลบไฟล์เก่าก่อน เพราะ JS bundle hash เปลี่ยนทุก build)
```

จากนั้น hard refresh (Ctrl+Shift+R) เสมอหลัง upload

---

## 📋 สิ่งที่เปลี่ยนจากเวอร์ชัน Replit

### เพิ่มใหม่
- `src/pages/Tasks.tsx` + `src/lib/tasks-store.ts` + hooks — ระบบงาน (Google Tasks clone)
- `src/pages/Calendar.tsx` + `src/lib/calendar-store.ts` — ปฏิทิน (Google Calendar clone)
- `src/pages/WwtpDashboard.tsx` — **หน้า /wwtp แบบตึกเดียว + dropdown** (งานวันนี้)
- `src/components/scada/DiagramPreview.tsx` + `ScadaIcons.tsx` — SVG diagram + icons
- `src/hooks/use-*` — dark mode, notifications, alarm sync, thailand geojson
- `src/lib/thailand-provinces.ts` — mapping 77 จังหวัด → 6 ภาค
- **แผนที่ไทยจริง** ใน `Network.tsx` (d3-geo + TopoJSON แทน schematic เดิม)
- `package.json`: เพิ่ม `d3-geo`, `topojson-client` + types

### แก้ไข / อัปเดต
- `src/App.tsx` — เพิ่ม routes /tasks, /calendar, /wwtp→WwtpDashboard
- `src/pages/BuildingDetail.tsx` — แยก `BuildingDetailContent` ให้ /wwtp ใช้ร่วม
- `src/components/scada/BuildingCard.tsx` — รับ `BuildingConfig` (แก้ type mismatch)
- pages อื่นๆ อัปเดตเป็นเวอร์ชันล่าสุด

### ลบทิ้ง (dead code จาก Replit เก่า)
- `ProcessDiagram.tsx`, `Gauges.tsx`, `scada-config.ts` — ถูกแทนด้วย
  DiagramPreview/ScadaDiagramEditor แล้ว ไม่มีใครเรียก

---

## ⚠️ ข้อควรระวัง

1. **ยังไม่ได้ build จริง** ในสภาพแวดล้อมเต็ม (เครื่องที่ประกอบไฟล์นี้ต่อเน็ตไม่ได้)
   ผ่านแค่ type-check — แนะนำ build local (ทางเลือก B ขั้น 1-2) ดูก่อน push จริง
   ถ้าเจอ error ตอน build ส่งมาได้เลย
2. **pnpm-workspace.yaml มี `minimumReleaseAge: 1440`** (กัน supply-chain attack)
   ปกติไม่มีปัญหา แต่ถ้า d3-geo/topojson เพิ่งออกเวอร์ชันใหม่ อาจต้องรอ 1 วัน
   หรือใช้เวอร์ชันที่ระบุใน package.json (ออกมานานแล้ว ไม่ติด)
3. ไฟล์ `pnpm-lock.yaml` เดิม **ยังไม่มี** d3-geo/topojson — ตอน `pnpm install`
   ครั้งแรก lockfile จะถูกอัปเดต ถ้า CI ใช้ `--frozen-lockfile` แล้ว fail
   ให้รัน `pnpm install` ในเครื่องก่อน commit lockfile ใหม่ไปด้วย
   (workflow ที่แนบมาตั้งเป็น `--no-frozen-lockfile` ไว้แล้ว ไม่ต้องแก้)

---

## 🤖 คำสั่งสำหรับ Claude Code

เปิด Claude Code ในโฟลเดอร์นี้ แล้ววางข้อความนี้:

```
นี่คือ source เวอร์ชันล่าสุดของ Wastewater Monitor Dashboard (pnpm monorepo)
เป้าหมาย: push ขึ้น repo ทดสอบใหม่ชื่อ "test-demowwtp" (แยกจาก repo จริง
Wastewater-Monitor-Dashboard เพื่อไม่กระทบของที่ deploy อยู่)

งานที่ต้องทำ:
1. รัน `pnpm install` แล้ว
   `BASE_PATH=/test-demowwtp/ NODE_ENV=production pnpm --filter @workspace/scada-dashboard run build`
   เพื่อยืนยันว่า build ผ่าน
2. ถ้า build error ให้แก้ให้ผ่าน
3. commit pnpm-lock.yaml ที่อัปเดตแล้ว (เพิ่ง add d3-geo, topojson-client)
4. init git repo, เชื่อมกับ https://github.com/<username>/test-demowwtp
   (ถามฉันหา username/สร้าง repo ก่อนถ้ายังไม่มี) แล้ว push ขึ้น branch main
5. เปิด GitHub Actions ผ่าน Settings → Pages → Source: GitHub Actions
   workflow ที่ .github/workflows/deploy.yml จะ build+deploy ให้อัตโนมัติ
   (ดึงชื่อ repo มาเป็น BASE_PATH เอง ไม่ต้องแก้ workflow)

รายละเอียดเพิ่มเติมอยู่ใน DEPLOY-GUIDE.md
```

