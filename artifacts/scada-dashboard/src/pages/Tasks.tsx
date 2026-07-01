import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Star, Trash2, Pencil, Check, X, ChevronRight, ChevronDown,
  CheckSquare, Square, AlertTriangle, Paperclip, Repeat, Clock,
  ListChecks, Filter as FilterIcon,
} from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useTasks, getTasksStore, ALARM_LIST_ID,
  type Task, type Subtask, type RepeatRule,
} from "@/lib/tasks-store";
import { useAlarmTaskSync } from "@/hooks/use-alarm-task-sync";
import { useTaskNotifications } from "@/hooks/use-task-notifications";

// ─── Filter ──────────────────────────────────────────────────────────────────

type FilterMode = "all" | "active" | "completed" | "starred";

const FILTER_LABEL: Record<FilterMode, string> = {
  all: "ทั้งหมด",
  active: "ที่ต้องทำ",
  completed: "เสร็จแล้ว",
  starred: "ติดดาว",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDueDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `วันนี้ · ${d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function isOverdue(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: "ไม่ซ้ำ",
  daily: "ทุกวัน",
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
  yearly: "ทุกปี",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  useAlarmTaskSync();
  useTaskNotifications();

  const { lists, tasks, subtasks } = useTasks();
  const store = getTasksStore();

  const [selectedListId, setSelectedListId] = useState<string>(
    () => lists[0]?.id ?? ALARM_LIST_ID,
  );
  const [filter, setFilter] = useState<FilterMode>("active");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);

  // Ensure selectedListId always points at a real list (e.g. if it was deleted).
  useEffect(() => {
    if (!lists.find((l) => l.id === selectedListId)) {
      setSelectedListId(lists[0]?.id ?? ALARM_LIST_ID);
    }
  }, [lists, selectedListId]);

  const selectedList = lists.find((l) => l.id === selectedListId);
  const tasksForList = useMemo(() => {
    return tasks
      .filter((t) => t.listId === selectedListId)
      .filter((t) => {
        if (filter === "active") return !t.completed && t.enabled;
        if (filter === "completed") return t.completed;
        if (filter === "starred") return t.starred;
        return true;
      })
      .sort((a, b) => {
        // Starred first, then by order
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        return a.order - b.order;
      });
  }, [tasks, selectedListId, filter]);

  // Counts shown in sidebar
  const listCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    lists.forEach((l) => {
      counts[l.id] = tasks.filter(
        (t) => t.listId === l.id && !t.completed && t.enabled,
      ).length;
    });
    return counts;
  }, [tasks, lists]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto pb-12">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-primary" />
              งานและรายการ · Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              จัดการรายการงาน · ระบบจะสร้าง task อัตโนมัติจากอุปกรณ์ที่มี alarm
            </p>
          </div>
          <NotifPermissionBadge />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          {/* ── Sidebar: Lists ─────────────────────────────────────────────── */}
          <aside className="rounded-xl border bg-card p-3 flex flex-col gap-2 h-fit md:sticky md:top-20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Lists
              </span>
              <AddListButton onAdd={(n) => {
                const l = store.addList(n);
                setSelectedListId(l.id);
              }} />
            </div>

            <div className="flex flex-col gap-1">
              {[...lists].sort((a, b) => a.order - b.order).map((list) => (
                <ListSidebarItem
                  key={list.id}
                  list={list}
                  selected={list.id === selectedListId}
                  count={listCounts[list.id]}
                  onSelect={() => setSelectedListId(list.id)}
                  onRename={(name) => store.renameList(list.id, name)}
                  onDelete={() => setConfirmDeleteList(list.id)}
                />
              ))}
            </div>
          </aside>

          {/* ── Main: Tasks ────────────────────────────────────────────────── */}
          <section className="rounded-xl border bg-card p-4 min-h-[400px] flex flex-col gap-3">
            {/* List header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {selectedList?.id === ALARM_LIST_ID && (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <h2 className="text-lg font-bold">{selectedList?.name ?? "—"}</h2>
                {selectedList?.isSystem && (
                  <Badge variant="secondary" className="text-[10px]">
                    System · ลบไม่ได้
                  </Badge>
                )}
              </div>
              <FilterTabs value={filter} onChange={setFilter} />
            </div>

            {/* Quick add */}
            {selectedList && selectedList.id !== ALARM_LIST_ID && (
              <QuickAddTask
                onAdd={(title) => store.addTask(selectedList.id, { title })}
              />
            )}

            {/* Tasks */}
            <div className="flex flex-col gap-1.5">
              {tasksForList.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-10">
                  {filter === "all" && "ยังไม่มีงานในรายการนี้"}
                  {filter === "active" && "ไม่มีงานค้างอยู่ 🎉"}
                  {filter === "completed" && "ยังไม่มีงานที่เสร็จแล้ว"}
                  {filter === "starred" && "ยังไม่มีงานที่ติดดาว"}
                </div>
              )}
              {tasksForList.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  subtasks={subtasks.filter((s) => s.taskId === task.id)}
                  onOpen={() => setEditingTask(task)}
                  onToggleComplete={() => store.toggleCompleted(task.id)}
                  onToggleStar={() => store.toggleStarred(task.id)}
                  onToggleEnabled={() => store.toggleEnabled(task.id)}
                  onDelete={() => store.deleteTask(task.id)}
                  onDrop={(draggedId, listId) => {
                    store.moveTask(draggedId, listId, idx);
                  }}
                  targetListId={selectedListId}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Task detail modal ── */}
      {editingTask && (
        <TaskDetailDialog
          task={editingTask}
          subtasks={subtasks.filter((s) => s.taskId === editingTask.id)}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* ── Delete list confirm ── */}
      <AlertDialog open={!!confirmDeleteList} onOpenChange={(open) => !open && setConfirmDeleteList(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรายการ?</AlertDialogTitle>
            <AlertDialogDescription>
              งานทั้งหมดในรายการนี้จะถูกลบไปด้วย ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteList) store.deleteList(confirmDeleteList);
                setConfirmDeleteList(null);
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

// ─── Sidebar list item ───────────────────────────────────────────────────────

function ListSidebarItem({
  list, selected, count, onSelect, onRename, onDelete,
}: {
  list: { id: string; name: string; isSystem: boolean };
  selected: boolean;
  count: number;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(list.name);

  if (renaming) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") { onRename(draft); setRenaming(false); }
            if (e.key === "Escape") { setDraft(list.name); setRenaming(false); }
          }}
        />
        <button onClick={() => { onRename(draft); setRenaming(false); }} className="p-1 hover:text-primary"><Check className="w-4 h-4" /></button>
        <button onClick={() => { setDraft(list.name); setRenaming(false); }} className="p-1 hover:text-destructive"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
        selected ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted/60",
      )}
      onClick={onSelect}
    >
      {list.id === ALARM_LIST_ID && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
      <span className="flex-1 truncate">{list.name}</span>
      {count > 0 && (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 tabular-nums">
          {count}
        </Badge>
      )}
      {!list.isSystem && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            className="p-1 hover:text-primary"
            title="เปลี่ยนชื่อ"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:text-destructive"
            title="ลบ"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar "Add List" button ───────────────────────────────────────────────

function AddListButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setOpen(true)}
        title="สร้างรายการใหม่"
      >
        <Plus className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>สร้างรายการใหม่</DialogTitle>
            <DialogDescription>ตั้งชื่อรายการเพื่อจัดกลุ่มงาน</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="เช่น งานบำรุงรักษา"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onAdd(name); setName(""); setOpen(false);
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => { if (name.trim()) { onAdd(name); setName(""); setOpen(false); } }}>
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

function FilterTabs({ value, onChange }: { value: FilterMode; onChange: (v: FilterMode) => void }) {
  const options: FilterMode[] = ["active", "all", "starred", "completed"];
  return (
    <div className="flex items-center gap-1 text-xs">
      <FilterIcon className="w-3.5 h-3.5 text-muted-foreground" />
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 rounded-md transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground font-medium"
              : "hover:bg-muted/60 text-muted-foreground",
          )}
        >
          {FILTER_LABEL[opt]}
        </button>
      ))}
    </div>
  );
}

// ─── Quick-add task input ────────────────────────────────────────────────────

function QuickAddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="flex items-center gap-2 border border-dashed rounded-md px-3 py-2">
      <Plus className="w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="เพิ่มงานใหม่... (กด Enter เพื่อบันทึก)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onAdd(title.trim());
            setTitle("");
          }
        }}
        className="border-0 shadow-none focus-visible:ring-0 px-0"
      />
    </div>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

function TaskRow({
  task, subtasks, onOpen, onToggleComplete, onToggleStar, onToggleEnabled, onDelete,
  onDrop, targetListId,
}: {
  task: Task;
  subtasks: Subtask[];
  onOpen: () => void;
  onToggleComplete: () => void;
  onToggleStar: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onDrop: (draggedTaskId: string, fromListId: string) => void;
  targetListId: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const completedSubs = subtasks.filter((s) => s.completed).length;
  const overdue = !task.completed && isOverdue(task.dueAt);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.setData("text/from-list", task.listId);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const id = e.dataTransfer.getData("text/task-id");
        const fromList = e.dataTransfer.getData("text/from-list");
        if (id && id !== task.id) onDrop(id, fromList);
      }}
      className={cn(
        "group flex items-start gap-2 px-3 py-2 rounded-md border bg-background transition-all",
        task.completed && "opacity-60",
        !task.enabled && "opacity-40",
        isDragOver && "border-primary border-dashed",
        overdue && !task.completed && "border-destructive/40 bg-destructive/5",
      )}
    >
      <button
        onClick={onToggleComplete}
        className="mt-0.5 shrink-0"
        title={task.completed ? "ยกเลิกเสร็จ" : "ทำเสร็จ"}
      >
        {task.completed
          ? <CheckSquare className="w-5 h-5 text-primary" />
          : <Square className="w-5 h-5 text-muted-foreground hover:text-primary" />}
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-sm",
            task.completed && "line-through text-muted-foreground",
          )}>
            {task.title}
          </span>
          {task.sourceAlarmId && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1">ALARM</Badge>
          )}
          {task.repeat && task.repeat !== "none" && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5">
              <Repeat className="w-2.5 h-2.5" /> {REPEAT_LABELS[task.repeat]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
          {task.dueAt && (
            <span className={cn("flex items-center gap-1", overdue && !task.completed && "text-destructive font-medium")}>
              <Clock className="w-3 h-3" />
              {fmtDueDate(task.dueAt)}
              {overdue && !task.completed && " · เกินกำหนด"}
            </span>
          )}
          {subtasks.length > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks className="w-3 h-3" />
              {completedSubs}/{subtasks.length}
            </span>
          )}
          {task.attachmentDataUrl && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachmentName ?? "ไฟล์แนบ"}
            </span>
          )}
          {task.notes && (
            <span className="truncate max-w-[260px] italic">"{task.notes}"</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleEnabled}
          title={task.enabled ? "ปิดการแสดงผล" : "เปิดการแสดงผล"}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <Switch checked={task.enabled} className="scale-75" onClick={(e) => e.stopPropagation()} />
        </button>
        <button
          onClick={onToggleStar}
          className="p-1"
          title={task.starred ? "เอาดาวออก" : "ติดดาว"}
        >
          <Star className={cn(
            "w-4 h-4 transition-colors",
            task.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400",
          )} />
        </button>
        {!task.sourceAlarmId && (
          <button
            onClick={onDelete}
            className="p-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition"
            title="ลบ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Task detail dialog ─────────────────────────────────────────────────────

function TaskDetailDialog({
  task, subtasks, onClose,
}: { task: Task; subtasks: Subtask[]; onClose: () => void }) {
  const store = getTasksStore();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueAt, setDueAt] = useState(task.dueAt ?? "");
  const [repeat, setRepeat] = useState<RepeatRule>(task.repeat ?? "none");
  const [newSub, setNewSub] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Sync state when switching to a different task without remounting.
  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes ?? "");
    setDueAt(task.dueAt ?? "");
    setRepeat(task.repeat ?? "none");
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    store.updateTask(task.id, {
      title: title.trim() || task.title,
      notes: notes.trim() || undefined,
      dueAt: dueAt || undefined,
      repeat,
    });
    onClose();
  };

  const onPickFile = async (file: File) => {
    // Keep attachments small — base64 in localStorage; 2 MB hard cap is plenty
    // for photos of an alarm panel without trashing the quota.
    if (file.size > 2 * 1024 * 1024) {
      alert("ไฟล์ต้องไม่เกิน 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      store.updateTask(task.id, {
        attachmentDataUrl: String(reader.result),
        attachmentName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดงาน</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">ชื่องาน</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!!task.sourceAlarmId}
            />
            {task.sourceAlarmId && (
              <p className="text-[10px] text-muted-foreground">
                งานนี้สร้างจาก Alarm — แก้ไขชื่อไม่ได้
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">รายละเอียด</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">วัน/เวลาที่ครบกำหนด</label>
              <Input
                type="datetime-local"
                value={dueAt ? dueAt.slice(0, 16) : ""}
                onChange={(e) => setDueAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">ซ้ำ</label>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatRule)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["none", "daily", "weekly", "monthly", "yearly"] as RepeatRule[]).map((r) => (
                    <SelectItem key={r} value={r}>{REPEAT_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Attachment */}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> ไฟล์แนบ (สูงสุด 2 MB)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                เลือกไฟล์
              </Button>
              {task.attachmentDataUrl && (
                <>
                  <a
                    href={task.attachmentDataUrl}
                    download={task.attachmentName}
                    className="text-xs text-primary hover:underline truncate max-w-[180px]"
                  >
                    {task.attachmentName ?? "ไฟล์แนบ"}
                  </a>
                  <button
                    onClick={() => store.updateTask(task.id, {
                      attachmentDataUrl: undefined, attachmentName: undefined,
                    })}
                    className="text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ListChecks className="w-3 h-3" /> งานย่อย
            </label>
            <div className="flex flex-col gap-1.5">
              {subtasks.sort((a, b) => a.order - b.order).map((s) => (
                <div key={s.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={() => store.toggleSubtask(s.id)}
                  />
                  <Input
                    value={s.title}
                    onChange={(e) => store.updateSubtask(s.id, { title: e.target.value })}
                    className={cn("h-7 text-sm", s.completed && "line-through text-muted-foreground")}
                  />
                  <button
                    onClick={() => store.deleteSubtask(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="เพิ่มงานย่อย..."
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSub.trim()) {
                    store.addSubtask(task.id, newSub.trim());
                    setNewSub("");
                  }
                }}
                className="h-7 text-sm border-dashed"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={save}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notification permission badge ──────────────────────────────────────────

function NotifPermissionBadge() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
  );

  const request = () => {
    if (perm === "unsupported") return;
    Notification.requestPermission().then((p) => setPerm(p));
  };

  if (perm === "granted" || perm === "unsupported") return null;

  return (
    <Button variant="outline" size="sm" onClick={request} className="text-xs">
      🔔 เปิดการแจ้งเตือน
    </Button>
  );
}
