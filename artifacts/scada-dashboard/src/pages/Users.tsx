import { useState } from "react";
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useAuth,
  ROLE_INFOS,
  ROLE_PERMISSIONS,
  type Role,
  type User,
  type Permissions,
} from "@/lib/auth";

const ROLES: Role[] = ["super_admin", "manager", "operator", "auditor"];

// Rows shown in the permission matrix, in display order.
const PERM_ROWS: { key: keyof Permissions; label: string }[] = [
  { key: "canViewOverview", label: "ดูภาพรวม" },
  { key: "canViewTrends", label: "ดูแนวโน้ม" },
  { key: "canViewAlarms", label: "ดูแจ้งเตือน" },
  { key: "canViewEquipment", label: "ดูเครื่องจักร" },
  { key: "canViewTasks", label: "ดูงาน/รายการ" },
  { key: "canViewCalendar", label: "ดูปฏิทิน" },
  { key: "canViewSettings", label: "ดูตั้งค่า" },
  { key: "canViewUsers", label: "ดูผู้ใช้" },
  { key: "canViewNetwork", label: "ดูเครือข่าย" },
  { key: "canAckAlarms", label: "รับทราบแจ้งเตือน" },
  { key: "canEditEquipment", label: "แก้ไขเครื่องจักร" },
  { key: "canEditConfigs", label: "แก้ไขการตั้งค่า" },
  { key: "canManageUsers", label: "จัดการผู้ใช้" },
  { key: "canExportReports", label: "ส่งออกรายงาน" },
];

export default function UsersPage() {
  const { users, currentUser, addUser, updateUser, removeUser, resetUsers, switchUser } =
    useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setDialogOpen(true);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-primary" />
              จัดการผู้ใช้งาน
              <span className="text-sm font-normal text-muted-foreground">| Users</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ระบบเดโม — ไม่มีรหัสผ่าน ใช้สาธิตสิทธิ์ของแต่ละบทบาทเท่านั้น
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw className="w-4 h-4" /> คืนค่าเริ่มต้น
            </Button>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" /> เพิ่มผู้ใช้
            </Button>
          </div>
        </div>

        {/* User list */}
        <div className="grid gap-3">
          {users.map((u) => {
            const info = ROLE_INFOS[u.role];
            const isMe = currentUser?.id === u.id;
            return (
              <div
                key={u.id}
                className={cn(
                  "rounded-xl border bg-card p-4 flex items-center justify-between gap-4 flex-wrap",
                  isMe && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {u.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">{u.fullName}</span>
                      {isMe && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" /> บัญชีปัจจุบัน
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground truncate">
                      @{u.username} · {u.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded border",
                      info.badgeClass,
                    )}
                  >
                    {info.nameTh}
                  </span>
                  {!isMe && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => switchUser(u.id)}
                    >
                      สลับเป็นบัญชีนี้
                    </Button>
                  )}
                  <Button variant="secondary" size="icon" onClick={() => openEdit(u)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    disabled={users.length <= 1}
                    onClick={() => setDeleteId(u.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Permission matrix */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              ตารางสิทธิ์ตามบทบาท · Permission Matrix
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    สิทธิ์
                  </th>
                  {ROLES.map((r) => (
                    <th
                      key={r}
                      className="px-3 py-2.5 text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
                    >
                      {ROLE_INFOS[r].shortTh}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_ROWS.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-2 text-foreground text-xs">{row.label}</td>
                    {ROLES.map((r) => {
                      const has = ROLE_PERMISSIONS[r][row.key];
                      return (
                        <td key={r} className="px-3 py-2 text-center">
                          {has ? (
                            <Check className="w-4 h-4 text-green-500 inline" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/40 inline" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={(data) => {
          if (editing) updateUser(editing.id, data);
          else addUser(data);
          setDialogOpen(false);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              ผู้ใช้นี้จะถูกลบออกจากระบบ ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) removeUser(deleteId);
                setDeleteId(null);
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คืนค่าผู้ใช้เริ่มต้น</AlertDialogTitle>
            <AlertDialogDescription>
              รายชื่อผู้ใช้จะกลับเป็น 4 บัญชีเดโมเริ่มต้น (admin / manager / engineer /
              auditor) การแก้ไขทั้งหมดจะหายไป
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                resetUsers();
                setResetOpen(false);
              }}
            >
              คืนค่า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

// ─── User add/edit dialog ────────────────────────────────────────────────────

function UserDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: User | null;
  onSave: (data: Omit<User, "id" | "createdAt">) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operator");

  // Re-seed fields whenever the dialog opens for a different target.
  const seedKey = `${open}-${editing?.id ?? "new"}`;
  const [lastSeed, setLastSeed] = useState("");
  if (open && seedKey !== lastSeed) {
    setLastSeed(seedKey);
    setFullName(editing?.fullName ?? "");
    setUsername(editing?.username ?? "");
    setEmail(editing?.email ?? "");
    setRole(editing?.role ?? "operator");
  }

  const valid = fullName.trim() && username.trim() && email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>ชื่อ-นามสกุล</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>บทบาท / Role</Label>
              <Select value={role} onValueChange={(v: Role) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_INFOS[r].nameTh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>อีเมล</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {ROLE_INFOS[role].description}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            disabled={!valid}
            onClick={() =>
              onSave({
                fullName: fullName.trim(),
                username: username.trim(),
                email: email.trim(),
                role,
              })
            }
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
