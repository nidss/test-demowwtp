import { useEffect, useState } from "react";

export type Role = "super_admin" | "manager" | "operator" | "auditor";

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface RoleInfo {
  id: Role;
  nameTh: string;
  nameEn: string;
  shortTh: string;
  description: string;
  badgeClass: string;
}

export const ROLE_INFOS: Record<Role, RoleInfo> = {
  super_admin: {
    id: "super_admin",
    nameTh: "ผู้ดูแลระบบสูงสุด",
    nameEn: "Super Admin",
    shortTh: "Super Admin",
    description: "จัดการบัญชีผู้ใช้, สิทธิ์, การเชื่อมต่อ API/Data Source ทั้งหมด",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/40",
  },
  manager: {
    id: "manager",
    nameTh: "ผู้บริหาร / ผู้จัดการโรงงาน",
    nameEn: "Plant Manager",
    shortTh: "Plant Manager",
    description: "ดู Dashboard ภาพรวม, รายงานแนวโน้มเชิงกลยุทธ์",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  },
  operator: {
    id: "operator",
    nameTh: "วิศวกร / เจ้าหน้าที่เทคนิค",
    nameEn: "Engineer / Operator",
    shortTh: "Engineer",
    description: "มอนิเตอร์เซนเซอร์, ตั้งค่า Threshold, บันทึกการซ่อมบำรุง",
    badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/40",
  },
  auditor: {
    id: "auditor",
    nameTh: "ผู้ตรวจสอบ",
    nameEn: "Auditor",
    shortTh: "Auditor",
    description: "อ่านอย่างเดียว — ประวัติข้อมูลและส่งออกรายงานตามข้อกำหนด",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  },
};

export interface Permissions {
  canViewOverview: boolean;
  canViewTrends: boolean;
  canViewAlarms: boolean;
  canViewEquipment: boolean;
  canViewSettings: boolean;
  canViewUsers: boolean;
  canViewNetwork: boolean;
  canViewTasks: boolean;
  canViewCalendar: boolean;

  canAckAlarms: boolean;
  canEditEquipment: boolean;
  canEditConfigs: boolean;
  canManageUsers: boolean;
  canExportReports: boolean;
}

const NONE: Permissions = {
  canViewOverview: false,
  canViewTrends: false,
  canViewAlarms: false,
  canViewEquipment: false,
  canViewSettings: false,
  canViewUsers: false,
  canViewNetwork: false,
  canViewTasks: false,
  canViewCalendar: false,
  canAckAlarms: false,
  canEditEquipment: false,
  canEditConfigs: false,
  canManageUsers: false,
  canExportReports: false,
};

export const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  super_admin: {
    canViewOverview: true,
    canViewTrends: true,
    canViewAlarms: true,
    canViewEquipment: true,
    canViewSettings: true,
    canViewUsers: true,
    canViewNetwork: true,
    canViewTasks: true,
    canViewCalendar: true,
    canAckAlarms: true,
    canEditEquipment: true,
    canEditConfigs: true,
    canManageUsers: true,
    canExportReports: true,
  },
  manager: {
    ...NONE,
    canViewOverview: true,
    canViewTrends: true,
    canViewAlarms: true,
    canViewEquipment: true,
    canViewTasks: true,
    canViewCalendar: true,
    canExportReports: true,
  },
  operator: {
    ...NONE,
    canViewOverview: true,
    canViewTrends: true,
    canViewAlarms: true,
    canViewEquipment: true,
    canViewSettings: true,
    canViewTasks: true,
    canViewCalendar: true,
    canAckAlarms: true,
    canEditEquipment: true,
    canEditConfigs: true,
  },
  auditor: {
    ...NONE,
    canViewOverview: true,
    canViewTrends: true,
    canViewAlarms: true,
    canViewEquipment: true,
    canViewTasks: true,
    canViewCalendar: true,
    canExportReports: true,
  },
};

const DEFAULT_USERS: User[] = [
  {
    id: "u-admin",
    username: "admin",
    fullName: "สมชาย ผู้ดูแลระบบ",
    email: "admin@siriraj.ac.th",
    role: "super_admin",
    createdAt: "2024-01-01",
  },
  {
    id: "u-manager",
    username: "manager",
    fullName: "ดร. สุดา ผู้จัดการโรงงาน",
    email: "manager@siriraj.ac.th",
    role: "manager",
    createdAt: "2024-01-15",
  },
  {
    id: "u-operator",
    username: "engineer",
    fullName: "วิศรุต วิศวกรสิ่งแวดล้อม",
    email: "engineer@siriraj.ac.th",
    role: "operator",
    createdAt: "2024-02-01",
  },
  {
    id: "u-auditor",
    username: "auditor",
    fullName: "อรุณี ผู้ตรวจสอบภาครัฐ",
    email: "auditor@pcd.go.th",
    role: "auditor",
    createdAt: "2024-03-10",
  },
];

const USERS_KEY = "scada.users.v1";
const CURRENT_USER_KEY = "scada.currentUser.v1";

class AuthStore {
  users: User[] = [];
  currentUserId: string = "";
  listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  load() {
    if (typeof window === "undefined") return;
    const savedUsers = localStorage.getItem(USERS_KEY);
    this.users = savedUsers ? JSON.parse(savedUsers) : [...DEFAULT_USERS];

    const savedCurrent = localStorage.getItem(CURRENT_USER_KEY);
    if (savedCurrent && this.users.some((u) => u.id === savedCurrent)) {
      this.currentUserId = savedCurrent;
    } else {
      this.currentUserId = this.users[0]?.id ?? "";
    }
  }

  save() {
    localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    localStorage.setItem(CURRENT_USER_KEY, this.currentUserId);
    this.notify();
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  switchUser(id: string) {
    if (this.users.some((u) => u.id === id)) {
      this.currentUserId = id;
      this.save();
    }
  }

  addUser(data: Omit<User, "id" | "createdAt">) {
    const id = `u-${crypto.randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString().split("T")[0];
    this.users.push({ ...data, id, createdAt });
    this.save();
  }

  updateUser(id: string, patch: Partial<Omit<User, "id" | "createdAt">>) {
    this.users = this.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    this.save();
  }

  removeUser(id: string) {
    if (this.users.length <= 1) return;
    this.users = this.users.filter((u) => u.id !== id);
    if (this.currentUserId === id) {
      this.currentUserId = this.users[0]?.id ?? "";
    }
    this.save();
  }

  resetToDefaults() {
    this.users = [...DEFAULT_USERS];
    this.currentUserId = this.users[0].id;
    this.save();
  }

  getCurrentUser(): User | undefined {
    return this.users.find((u) => u.id === this.currentUserId);
  }
}

export const authStore = new AuthStore();

export function useAuth() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const unsub = authStore.subscribe(() => setVersion((v) => v + 1));
    return () => {
      unsub();
    };
  }, []);

  const currentUser = authStore.getCurrentUser();
  const role: Role = currentUser?.role ?? "auditor";
  const perms: Permissions = ROLE_PERMISSIONS[role];
  const roleInfo: RoleInfo = ROLE_INFOS[role];

  return {
    currentUser,
    role,
    roleInfo,
    perms,
    users: authStore.users,
    switchUser: (id: string) => authStore.switchUser(id),
    addUser: (data: Omit<User, "id" | "createdAt">) => authStore.addUser(data),
    updateUser: (id: string, patch: Partial<Omit<User, "id" | "createdAt">>) =>
      authStore.updateUser(id, patch),
    removeUser: (id: string) => authStore.removeUser(id),
    resetUsers: () => authStore.resetToDefaults(),
  };
}
