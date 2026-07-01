import React, { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Droplets,
  LineChart,
  AlertTriangle,
  Cpu,
  Sliders,
  ChevronRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Globe,
  ListChecks,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useScadaData, useAlarms } from "@/lib/scada-mock";
import { useAuth, ROLE_INFOS, type Permissions } from "@/lib/auth";

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
  labelTh: string;
  needs: keyof Permissions;
}

export function AppShell({ children }: AppShellProps) {
  const [location, navigate] = useLocation();
  const { kpi } = useScadaData();
  const { alarms, acknowledgeAlarm } = useAlarms();
  const { currentUser, perms, roleInfo, users, switchUser } = useAuth();
  const activeAlarms = alarms.filter((a) => a.status === "Active");

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem("scada.sidebarOpen") !== "false"; } catch { return true; }
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem("scada.sidebarOpen", String(next)); } catch { /* noop */ }
      return next;
    });
  };

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        try { localStorage.setItem("scada.theme", "dark"); } catch { /* noop */ }
      } else {
        document.documentElement.classList.remove("dark");
        try { localStorage.setItem("scada.theme", "light"); } catch { /* noop */ }
      }
      return next;
    });
  };

  const allNavItems: NavItem[] = [
    { href: "/", icon: Activity, label: "Overview", labelTh: "หน้าหลัก", needs: "canViewOverview" },
    { href: "/trends", icon: LineChart, label: "Trends", labelTh: "แนวโน้ม|ข้อมูล", needs: "canViewTrends" },
    { href: "/alarms", icon: AlertTriangle, label: "Alarms", labelTh: "ประวัติการ|แจ้งเตือน", needs: "canViewAlarms" },
    { href: "/equipment", icon: Cpu, label: "Equipment", labelTh: "สถานะ|เครื่องจักร", needs: "canViewEquipment" },
    { href: "/tasks", icon: ListChecks, label: "Tasks", labelTh: "งานและ|รายการ", needs: "canViewTasks" },
    { href: "/calendar", icon: CalendarIcon, label: "Calendar", labelTh: "ปฏิทิน|นัดหมาย", needs: "canViewCalendar" },
    { href: "/settings", icon: Sliders, label: "Settings", labelTh: "ตั้งค่า", needs: "canViewSettings" },
    { href: "/network", icon: Globe, label: "Network", labelTh: "เครือข่าย|ทั่วประเทศ", needs: "canViewNetwork" },
  ];
  const navItems = allNavItems.filter((item) => perms[item.needs]);

  // Thai Buddhist Era Date
  const today = new Date();
  const thDate = today.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [timeStr, setTimeStr] = React.useState("");

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Top Status Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3 md:px-4 shadow-sm z-10">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="flex items-center justify-center shrink-0">
            <img src={`${import.meta.env.BASE_URL}wwt-logo.png`} alt="WWTP Logo" className="h-9 w-9 rounded-full object-cover" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs md:text-sm font-bold tracking-tight text-foreground leading-tight truncate">
              <span className="hidden sm:inline">โรงพยาบาลศิริราช — </span>ระบบบำบัดน้ำเสีย (WWTP)
            </h1>
            <span className="text-[10px] text-muted-foreground font-mono hidden md:block">
              MAIN CONTROL SYSTEM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6 shrink-0">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs text-muted-foreground">{thDate}</span>
            <span className="text-lg font-mono font-bold tracking-wider text-primary">
              {timeStr || "00:00:00"}
            </span>
          </div>

          <div className="hidden md:block h-8 w-px bg-border"></div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="hidden md:inline text-xs font-mono font-bold text-green-500">ONLINE</span>
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "สลับเป็น Light Mode" : "สลับเป็น Dark Mode"}
              data-testid="button-toggle-theme"
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <motion.div
                key={isDark ? "moon" : "sun"}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </motion.div>
              <span className="hidden sm:inline">{isDark ? "LIGHT" : "DARK"}</span>
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider border transition-colors cursor-pointer",
                    activeAlarms.length > 0
                      ? "bg-destructive text-destructive-foreground border-red-500 animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)] hover:bg-destructive/90"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
                  )}
                  data-testid="button-alarm-badge"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {activeAlarms.length} {activeAlarms.length === 1 ? "ALARM" : "ALARMS"}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[min(380px,calc(100vw-16px))] p-0 bg-card border-border"
                data-testid="popover-active-alarms"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      การแจ้งเตือนทำงานอยู่
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Active Alarms · {activeAlarms.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/alarms")}
                    className="text-xs gap-1 text-primary hover:text-primary"
                    data-testid="button-view-all-alarms"
                  >
                    ดูทั้งหมด
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>

                {activeAlarms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div className="text-sm font-semibold text-foreground">
                      ระบบปกติ ไม่มีการแจ้งเตือน
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      All systems normal
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[360px]">
                    <ul className="divide-y divide-border">
                      {activeAlarms.map((alarm) => {
                        const sev = alarm.severity;
                        const sevColor =
                          sev === "Critical"
                            ? "bg-red-600 text-white border-red-700"
                            : sev === "High"
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : sev === "Medium"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : sev === "Low"
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/40";
                        const ts = new Date(alarm.timestamp);
                        const elapsedMin = Math.max(
                          1,
                          Math.floor((Date.now() - ts.getTime()) / 60000),
                        );
                        const elapsed =
                          elapsedMin < 60
                            ? `${elapsedMin} นาทีที่แล้ว`
                            : elapsedMin < 60 * 24
                            ? `${Math.floor(elapsedMin / 60)} ชม.ที่แล้ว`
                            : `${Math.floor(elapsedMin / 1440)} วันที่แล้ว`;
                        return (
                          <li
                            key={alarm.id}
                            className="px-4 py-3 hover:bg-muted/40 transition-colors"
                            data-testid={`alarm-item-${alarm.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="relative flex h-2 w-2 mt-1.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-mono font-bold text-primary tracking-wider">
                                    {alarm.tag}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded",
                                      sevColor,
                                    )}
                                  >
                                    {sev}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                                    {elapsed}
                                  </span>
                                </div>
                                <div className="text-xs text-foreground leading-snug mb-2">
                                  {alarm.description}
                                </div>
                                {perms.canAckAlarms ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] font-mono uppercase tracking-wider px-2"
                                    onClick={() => acknowledgeAlarm(alarm.id)}
                                    data-testid={`button-ack-alarm-${alarm.id}`}
                                  >
                                    รับทราบ / Acknowledge
                                  </Button>
                                ) : (
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                    Read-only — ไม่มีสิทธิ์รับทราบ
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </PopoverContent>
            </Popover>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation — hidden on mobile */}
        <motion.nav
          animate={{ width: sidebarOpen ? 224 : 56 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="hidden md:flex shrink-0 flex-col border-r border-border bg-card py-3 overflow-hidden"
          style={{ minWidth: 0 }}
        >
          {/* Toggle button row */}
          <div className={cn("flex mb-2 px-2", sidebarOpen ? "justify-end" : "justify-center")}>
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarOpen ? "ซ่อนเมนู" : "แสดงเมนู"}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              data-testid="button-toggle-sidebar"
            >
              {sidebarOpen
                ? <PanelLeftClose className="h-4 w-4" />
                : <PanelLeftOpen className="h-4 w-4" />}
            </button>
          </div>

          {/* Nav items */}
          <div className="flex flex-1 flex-col gap-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors cursor-pointer relative overflow-hidden",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent",
                    )}
                    title={!sidebarOpen ? item.labelTh : undefined}
                    data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                  >
                    <item.icon
                      className={cn("h-5 w-5 shrink-0", isActive && "drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]")}
                    />
                    <AnimatePresence initial={false}>
                      {sidebarOpen && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="flex flex-col overflow-hidden whitespace-nowrap"
                        >
                          <span className="text-sm font-semibold leading-none">{item.labelTh.replace("|", "")}</span>
                          <span className="text-[10px] font-mono tracking-wider opacity-70 uppercase mt-1">{item.label}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-md shadow-[0_0_8px_rgba(6,182,212,1)]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Sidebar footer — uptime + user menu */}
          <div className="mt-auto px-2 pb-2 flex flex-col gap-2">
            {/* Uptime (expanded only) */}
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded bg-muted/50 p-2.5 border border-border"
                >
                  <div className="text-[10px] text-muted-foreground mb-0.5">SYSTEM UPTIME</div>
                  <div className="text-sm font-mono text-foreground">{kpi.plantUptime}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User popover trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer w-full overflow-hidden text-left"
                  data-testid="button-user-menu"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {currentUser?.fullName.charAt(0) ?? "?"}
                  </div>
                  <AnimatePresence initial={false}>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col gap-0.5 overflow-hidden whitespace-nowrap flex-1 min-w-0"
                      >
                        <span className="text-xs font-bold text-foreground truncate block">
                          {currentUser?.fullName ?? "—"}
                        </span>
                        <span className={cn("text-[9px] font-mono uppercase tracking-wider px-1 rounded border self-start", roleInfo.badgeClass)}>
                          {roleInfo.shortTh}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="w-[320px] p-0 bg-card border-border" data-testid="popover-user-menu">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {currentUser?.fullName.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{currentUser?.fullName}</div>
                    <div className="text-[11px] font-mono text-muted-foreground truncate">
                      @{currentUser?.username} · {currentUser?.email}
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      บทบาท / Role
                    </span>
                    <span className={cn("ml-auto text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border", roleInfo.badgeClass)}>
                      {roleInfo.shortTh}
                    </span>
                  </div>
                  <div className="text-xs text-foreground font-medium">{roleInfo.nameTh}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{roleInfo.description}</div>
                </div>
                <div className="px-4 py-2 border-b border-border">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    สลับผู้ใช้ (เดโม) / Switch User
                  </div>
                </div>
                <ScrollArea className="max-h-[260px]">
                  <ul className="divide-y divide-border">
                    {users.map((u) => {
                      const info = ROLE_INFOS[u.role];
                      const isMe = currentUser?.id === u.id;
                      return (
                        <li
                          key={u.id}
                          className={cn(
                            "px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors flex items-center gap-3",
                            isMe && "bg-primary/5",
                          )}
                          onClick={() => switchUser(u.id)}
                          data-testid={`user-switch-${u.id}`}
                        >
                          <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-bold text-sm shrink-0">
                            {u.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{u.fullName}</div>
                            <div className="text-[10px] font-mono text-muted-foreground truncate">@{u.username}</div>
                          </div>
                          <span className={cn("text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0", info.badgeClass)}>
                            {info.shortTh}
                          </span>
                          {isMe && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-muted-foreground"
                    disabled
                    data-testid="button-signout"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-2" />
                    ออกจากระบบ / Sign Out (Demo)
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </motion.nav>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden bg-background relative isolate">
          {/* Subtle scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-50 opacity-[0.03] mix-blend-overlay"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 2px)" }}
          />
          {/* Subtle grid background */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ffffff11 1px, transparent 1px), linear-gradient(to bottom, #ffffff11 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="h-full w-full overflow-y-auto p-4 pb-20 md:pb-4 z-10 relative">{children}</div>
        </main>
      </div>

      {/* Bottom Navigation — mobile only */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}>
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]")} />
                <span className="text-[9px] font-mono tracking-wide text-center leading-tight">
                  {item.labelTh.includes("|") ? (
                    <>
                      {item.labelTh.split("|")[0]}
                      <br />
                      {item.labelTh.split("|")[1]}
                    </>
                  ) : item.labelTh}
                </span>
                {isActive && <div className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-t-full" />}
              </div>
            </Link>
          );
        })}
        {/* Theme toggle in bottom nav */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="text-[9px] font-mono uppercase tracking-wide leading-none">{isDark ? "light" : "dark"}</span>
        </button>
      </nav>
    </div>
  );
}
