import { useSyncExternalStore } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RepeatRule = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  /** ISO datetime string. When present and reached, fires a browser notification. */
  dueAt?: string;
  repeat?: RepeatRule;
  starred: boolean;
  /** When false, task is hidden from the list (soft-disabled). */
  enabled: boolean;
  completed: boolean;
  completedAt?: string;
  /** Data URL of an attached file (kept small via the picker UI). */
  attachmentDataUrl?: string;
  attachmentName?: string;
  /** Set when this task was auto-created from an equipment alarm. */
  sourceAlarmId?: string;
  order: number;
  createdAt: string;
}

export interface TaskList {
  id: string;
  name: string;
  /** System lists (e.g. ALARM) cannot be deleted or renamed. */
  isSystem: boolean;
  order: number;
  createdAt: string;
}

interface TasksState {
  lists: TaskList[];
  tasks: Task[];
  subtasks: Subtask[];
  /** Map of taskId → last-fired notification timestamp. Prevents duplicate fires. */
  notifiedAt: Record<string, string>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const ALARM_LIST_ID = "list-alarm";

const STORAGE_KEY = "scada.tasks.v1";

const DEFAULT_STATE: TasksState = {
  lists: [
    {
      id: ALARM_LIST_ID,
      name: "Alarm List",
      isSystem: true,
      order: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "list-default",
      name: "งานทั่วไป",
      isSystem: false,
      order: 1,
      createdAt: new Date().toISOString(),
    },
  ],
  tasks: [],
  subtasks: [],
  notifiedAt: {},
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadState(): TasksState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<TasksState>;
    // Always ensure Alarm List exists (it's the only undeletable list).
    const lists = parsed.lists ?? DEFAULT_STATE.lists;
    if (!lists.find((l) => l.id === ALARM_LIST_ID)) {
      lists.unshift(DEFAULT_STATE.lists[0]);
    }
    return {
      lists,
      tasks: parsed.tasks ?? [],
      subtasks: parsed.subtasks ?? [],
      notifiedAt: parsed.notifiedAt ?? {},
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: TasksState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[tasks-store] failed to save:", err);
  }
}

/**
 * Advances a Date by one repeat step. Used when a recurring task is completed:
 * we create a new pending task with the next occurrence's dueAt.
 */
function nextOccurrence(date: Date, rule: RepeatRule): Date | null {
  const d = new Date(date);
  switch (rule) {
    case "daily":   d.setDate(d.getDate() + 1); return d;
    case "weekly":  d.setDate(d.getDate() + 7); return d;
    case "monthly": d.setMonth(d.getMonth() + 1); return d;
    case "yearly":  d.setFullYear(d.getFullYear() + 1); return d;
    default:        return null;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

class TasksStore {
  private state: TasksState = loadState();
  private listeners = new Set<() => void>();

  // Subscribe API (used by useSyncExternalStore)
  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): TasksState => this.state;

  private emit() {
    saveState(this.state);
    this.listeners.forEach((l) => l());
  }

  // ── Lists ──
  addList(name: string): TaskList {
    const list: TaskList = {
      id: uid("list"),
      name: name.trim() || "รายการใหม่",
      isSystem: false,
      order: this.state.lists.length,
      createdAt: new Date().toISOString(),
    };
    this.state = { ...this.state, lists: [...this.state.lists, list] };
    this.emit();
    return list;
  }

  renameList(id: string, name: string) {
    this.state = {
      ...this.state,
      lists: this.state.lists.map((l) =>
        l.id === id && !l.isSystem ? { ...l, name: name.trim() } : l,
      ),
    };
    this.emit();
  }

  deleteList(id: string) {
    const target = this.state.lists.find((l) => l.id === id);
    if (!target || target.isSystem) return;
    this.state = {
      ...this.state,
      lists: this.state.lists.filter((l) => l.id !== id),
      tasks: this.state.tasks.filter((t) => t.listId !== id),
      subtasks: this.state.subtasks.filter((st) => {
        const parent = this.state.tasks.find((t) => t.id === st.taskId);
        return parent && parent.listId !== id;
      }),
    };
    this.emit();
  }

  // ── Tasks ──
  addTask(listId: string, init: Partial<Task> & { title: string }): Task {
    const tasksInList = this.state.tasks.filter((t) => t.listId === listId);
    const task: Task = {
      id: uid("task"),
      listId,
      title: init.title.trim() || "งานใหม่",
      notes: init.notes,
      dueAt: init.dueAt,
      repeat: init.repeat ?? "none",
      starred: init.starred ?? false,
      enabled: init.enabled ?? true,
      completed: false,
      sourceAlarmId: init.sourceAlarmId,
      attachmentDataUrl: init.attachmentDataUrl,
      attachmentName: init.attachmentName,
      order: tasksInList.length,
      createdAt: new Date().toISOString(),
    };
    this.state = { ...this.state, tasks: [...this.state.tasks, task] };
    this.emit();
    return task;
  }

  updateTask(id: string, patch: Partial<Task>) {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    };
    this.emit();
  }

  deleteTask(id: string) {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.filter((t) => t.id !== id),
      subtasks: this.state.subtasks.filter((st) => st.taskId !== id),
    };
    this.emit();
  }

  toggleCompleted(id: string) {
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) return;
    const now = new Date().toISOString();
    const newTasks = this.state.tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? now : undefined,
          }
        : t,
    );

    // If we just completed a repeating task that has a dueAt, queue the next one.
    if (!task.completed && task.repeat && task.repeat !== "none" && task.dueAt) {
      const nextDue = nextOccurrence(new Date(task.dueAt), task.repeat);
      if (nextDue) {
        const next: Task = {
          ...task,
          id: uid("task"),
          completed: false,
          completedAt: undefined,
          dueAt: nextDue.toISOString(),
          createdAt: new Date().toISOString(),
        };
        newTasks.push(next);
      }
    }

    this.state = { ...this.state, tasks: newTasks };
    this.emit();
  }

  toggleStarred(id: string) {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((t) =>
        t.id === id ? { ...t, starred: !t.starred } : t,
      ),
    };
    this.emit();
  }

  toggleEnabled(id: string) {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((t) =>
        t.id === id ? { ...t, enabled: !t.enabled } : t,
      ),
    };
    this.emit();
  }

  /** Reorder tasks within a list, and/or move a task to a different list. */
  moveTask(taskId: string, targetListId: string, targetIndex: number) {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const others = this.state.tasks
      .filter((t) => t.listId === targetListId && t.id !== taskId)
      .sort((a, b) => a.order - b.order);
    const updated: Task = { ...task, listId: targetListId };
    others.splice(targetIndex, 0, updated);
    const reordered = others.map((t, i) => ({ ...t, order: i }));
    // Combine: tasks from other lists + reordered target list
    const remaining = this.state.tasks.filter(
      (t) => t.listId !== targetListId && t.id !== taskId,
    );
    this.state = { ...this.state, tasks: [...remaining, ...reordered] };
    this.emit();
  }

  // ── Subtasks ──
  addSubtask(taskId: string, title: string): Subtask {
    const siblings = this.state.subtasks.filter((s) => s.taskId === taskId);
    const subtask: Subtask = {
      id: uid("sub"),
      taskId,
      title: title.trim() || "งานย่อยใหม่",
      completed: false,
      order: siblings.length,
    };
    this.state = { ...this.state, subtasks: [...this.state.subtasks, subtask] };
    this.emit();
    return subtask;
  }

  updateSubtask(id: string, patch: Partial<Subtask>) {
    this.state = {
      ...this.state,
      subtasks: this.state.subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    };
    this.emit();
  }

  deleteSubtask(id: string) {
    this.state = {
      ...this.state,
      subtasks: this.state.subtasks.filter((s) => s.id !== id),
    };
    this.emit();
  }

  toggleSubtask(id: string) {
    this.state = {
      ...this.state,
      subtasks: this.state.subtasks.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s,
      ),
    };
    this.emit();
  }

  // ── Alarm sync ──
  /**
   * Reconciles the Alarm List with the currently-faulty equipment.
   *
   * For each (buildingId, equipmentTag, alarmMessage) tuple we use a stable
   * `sourceAlarmId` so:
   *  - A new alarm that hasn't appeared before → create a task.
   *  - An alarm that's still active and has a matching task → leave it alone.
   *  - An alarm that's no longer active → leave the task in place (operator
   *    decides when to mark it done; that's how we get the "completed
   *    history" feature for free).
   *
   * Idempotent: safe to call from a tick.
   */
  syncAlarmTasks(
    alarms: { id: string; buildingName: string; equipmentTag: string; message: string }[],
  ) {
    const existing = new Set(
      this.state.tasks
        .filter((t) => t.listId === ALARM_LIST_ID && t.sourceAlarmId)
        .map((t) => t.sourceAlarmId!),
    );
    const newTasks: Task[] = [];
    alarms.forEach((a) => {
      if (existing.has(a.id)) return;
      newTasks.push({
        id: uid("task"),
        listId: ALARM_LIST_ID,
        title: `[${a.buildingName}] ${a.equipmentTag}: ${a.message}`,
        starred: true, // alarms are important — auto-pinned
        enabled: true,
        completed: false,
        sourceAlarmId: a.id,
        order: this.state.tasks.filter((t) => t.listId === ALARM_LIST_ID).length + newTasks.length,
        createdAt: new Date().toISOString(),
        repeat: "none",
      });
    });
    if (newTasks.length === 0) return;
    this.state = { ...this.state, tasks: [...this.state.tasks, ...newTasks] };
    this.emit();
  }

  // ── Notifications ──
  /**
   * Records that we've already shown a browser notification for `taskId` at
   * its current dueAt time, so the next tick doesn't re-fire it.
   */
  markNotified(taskId: string, dueAt: string) {
    this.state = {
      ...this.state,
      notifiedAt: { ...this.state.notifiedAt, [taskId]: dueAt },
    };
    this.emit();
  }
}

// Singleton — module-scoped to survive across remounts in dev.
const tasksStore = new TasksStore();

export function getTasksStore(): TasksStore {
  return tasksStore;
}

export function useTasks(): TasksState {
  return useSyncExternalStore(
    tasksStore.subscribe,
    tasksStore.getSnapshot,
    tasksStore.getSnapshot,
  );
}
