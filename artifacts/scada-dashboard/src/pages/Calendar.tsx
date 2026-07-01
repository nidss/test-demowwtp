import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin,
  Repeat, Bell, Trash2, X, ListChecks,
} from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useCalendar, getCalendarStore, expandEvents,
  EVENT_COLORS, EVENT_COLOR_CLASSES,
  type CalendarEvent, type EventOccurrence,
  type EventColor, type EventRepeat,
} from "@/lib/calendar-store";
import { useTasks, type Task } from "@/lib/tasks-store";
import { useCalendarNotifications } from "@/hooks/use-calendar-notifications";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_DOW_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const REPEAT_LABEL: Record<EventRepeat, string> = {
  none: "ไม่ซ้ำ", daily: "ทุกวัน", weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน", yearly: "ทุกปี",
};

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function endOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTimeLocal(d: Date): string {
  // For <input type="datetime-local">
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${mi}`;
}

/**
 * Returns the 6-row grid (42 cells) for the month-view, starting Sunday of
 * the first week that contains day 1 and ending on the last cell needed to
 * fully render any event that spills past the month.
 */
function monthGridDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // 0 = Sunday
  const start = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Tasks with a dueAt become read-only chips on the calendar. */
function tasksWithDue(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.dueAt && !t.completed && t.enabled);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  useCalendarNotifications();

  const { events } = useCalendar();
  const { tasks } = useTasks();

  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [creatingFromDate, setCreatingFromDate] = useState<Date | null>(null);

  const navigatePrev = () => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    else if (view === "week") setCursor(addDays(cursor, -7));
    else setCursor(addDays(cursor, -1));
  };
  const navigateNext = () => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    else if (view === "week") setCursor(addDays(cursor, 7));
    else setCursor(addDays(cursor, 1));
  };
  const goToday = () => setCursor(new Date());

  // Header label changes with view mode
  const headerLabel = useMemo(() => {
    if (view === "month") {
      return `${THAI_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`;
    }
    if (view === "week") {
      const sun = addDays(cursor, -cursor.getDay());
      const sat = addDays(sun, 6);
      if (sun.getMonth() === sat.getMonth()) {
        return `${sun.getDate()}–${sat.getDate()} ${THAI_MONTHS[sun.getMonth()]} ${sun.getFullYear() + 543}`;
      }
      return `${sun.getDate()} ${THAI_MONTHS[sun.getMonth()]} – ${sat.getDate()} ${THAI_MONTHS[sat.getMonth()]} ${sat.getFullYear() + 543}`;
    }
    return `${cursor.getDate()} ${THAI_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`;
  }, [cursor, view]);

  const dueTasks = useMemo(() => tasksWithDue(tasks), [tasks]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto pb-12">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" />
              ปฏิทิน · Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              จัดการนัดหมายและกิจกรรม · งานที่มีกำหนดส่งจะแสดงในปฏิทินด้วย
            </p>
          </div>
          <Button onClick={() => setCreatingFromDate(new Date())} className="gap-2">
            <Plus className="w-4 h-4" /> สร้างกิจกรรม
          </Button>
        </header>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goToday}>วันนี้</Button>
            <Button size="icon" variant="ghost" onClick={navigatePrev}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={navigateNext}><ChevronRight className="w-4 h-4" /></Button>
            <h2 className="text-lg font-bold ml-2">{headerLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">เดือน · Month</SelectItem>
                <SelectItem value="week">สัปดาห์ · Week</SelectItem>
                <SelectItem value="day">วัน · Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar grid */}
        {view === "month" && (
          <MonthView
            cursor={cursor}
            events={events}
            tasks={dueTasks}
            onClickDay={(d) => setCreatingFromDate(d)}
            onClickEvent={(ev) => setEditingEvent(ev)}
          />
        )}
        {view === "week" && (
          <WeekView
            cursor={cursor}
            events={events}
            tasks={dueTasks}
            onClickDay={(d) => setCreatingFromDate(d)}
            onClickEvent={(ev) => setEditingEvent(ev)}
          />
        )}
        {view === "day" && (
          <DayView
            cursor={cursor}
            events={events}
            tasks={dueTasks}
            onClickDay={(d) => setCreatingFromDate(d)}
            onClickEvent={(ev) => setEditingEvent(ev)}
          />
        )}
      </div>

      {(editingEvent || creatingFromDate) && (
        <EventDialog
          event={editingEvent}
          initialDate={creatingFromDate}
          onClose={() => { setEditingEvent(null); setCreatingFromDate(null); }}
        />
      )}
    </AppShell>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  cursor, events, tasks, onClickDay, onClickEvent,
}: {
  cursor: Date;
  events: CalendarEvent[];
  tasks: Task[];
  onClickDay: (d: Date) => void;
  onClickEvent: (ev: CalendarEvent) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = monthGridDates(year, month);

  // Expand recurring events across the whole month grid window.
  const windowStart = startOfDay(days[0]);
  const windowEnd = endOfDay(days[days.length - 1]);
  const occurrences = useMemo(
    () => expandEvents(events, windowStart, windowEnd),
    [events, windowStart.getTime(), windowEnd.getTime()], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const today = new Date();

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* DOW header */}
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {THAI_DOW_SHORT.map((dow, i) => (
          <div key={i} className="text-center text-xs font-mono uppercase tracking-wider text-muted-foreground py-2">
            {dow}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const dayEvents = occurrences.filter((occ) => sameDay(new Date(occ.startAt), d));
          const dayTasks = tasks.filter((t) => t.dueAt && sameDay(new Date(t.dueAt), d));
          return (
            <DayCell
              key={d.toISOString()}
              date={d}
              inMonth={d.getMonth() === month}
              isToday={sameDay(d, today)}
              events={dayEvents}
              tasks={dayTasks}
              onClickDay={() => onClickDay(d)}
              onClickEvent={onClickEvent}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  date, inMonth, isToday, events, tasks, onClickDay, onClickEvent,
}: {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: EventOccurrence[];
  tasks: Task[];
  onClickDay: () => void;
  onClickEvent: (ev: CalendarEvent) => void;
}) {
  const [, navigate] = useLocation();
  const MAX_SHOWN = 3;
  const totalItems = events.length + tasks.length;
  const shownEvents = events.slice(0, MAX_SHOWN);
  const remainingCount = totalItems - shownEvents.length
    - Math.min(tasks.length, Math.max(0, MAX_SHOWN - events.length));
  const shownTasks = tasks.slice(0, Math.max(0, MAX_SHOWN - events.length));

  return (
    <div
      className={cn(
        "relative border-b border-r min-h-[110px] p-1.5 cursor-pointer transition-colors group",
        !inMonth && "bg-muted/30 text-muted-foreground",
        isToday && "bg-primary/5",
      )}
      onClick={onClickDay}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-xs font-mono tabular-nums w-6 h-6 flex items-center justify-center rounded-full",
          isToday && "bg-primary text-primary-foreground font-bold",
        )}>
          {date.getDate()}
        </span>
        <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex flex-col gap-0.5">
        {shownEvents.map((occ) => {
          const c = EVENT_COLOR_CLASSES[occ.color];
          return (
            <button
              key={`${occ.id}-${occ.occurrenceDate}`}
              onClick={(e) => { e.stopPropagation(); onClickEvent(occ); }}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded text-left truncate leading-tight border",
                c.bg, c.text, c.border,
              )}
            >
              {!occ.allDay && <span className="font-mono">{fmtTime(new Date(occ.startAt))} </span>}
              {occ.title}
            </button>
          );
        })}
        {shownTasks.map((t) => (
          <button
            key={t.id}
            onClick={(e) => { e.stopPropagation(); navigate("/tasks"); }}
            className="text-[10px] px-1.5 py-0.5 rounded text-left truncate leading-tight border border-dashed border-muted-foreground/30 text-muted-foreground flex items-center gap-1"
            title={`งาน: ${t.title}`}
          >
            <ListChecks className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{t.title}</span>
          </button>
        ))}
        {remainingCount > 0 && (
          <DayPopover date={date} events={events} tasks={tasks} onClickEvent={onClickEvent}>
            <span className="text-[10px] text-muted-foreground hover:text-foreground pl-1.5 cursor-pointer">
              + อีก {remainingCount} รายการ
            </span>
          </DayPopover>
        )}
      </div>
    </div>
  );
}

// Popover that shows all items for a single day when "+ X more" is clicked.
function DayPopover({
  date, events, tasks, onClickEvent, children,
}: {
  date: Date;
  events: EventOccurrence[];
  tasks: Task[];
  onClickEvent: (ev: CalendarEvent) => void;
  children: React.ReactNode;
}) {
  const [, navigate] = useLocation();
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="text-left">{children}</button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-bold mb-2">
          {date.getDate()} {THAI_MONTHS[date.getMonth()]}
        </div>
        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
          {events.map((occ) => {
            const c = EVENT_COLOR_CLASSES[occ.color];
            return (
              <button
                key={`${occ.id}-${occ.occurrenceDate}`}
                onClick={() => onClickEvent(occ)}
                className={cn(
                  "text-xs px-2 py-1.5 rounded text-left border flex items-start gap-1.5",
                  c.bg, c.text, c.border,
                )}
              >
                <span className={cn("w-2 h-2 rounded-full mt-1 shrink-0", c.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{occ.title}</div>
                  {!occ.allDay && (
                    <div className="text-[10px] opacity-75 font-mono">
                      {fmtTime(new Date(occ.startAt))} – {fmtTime(new Date(occ.endAt))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate("/tasks")}
              className="text-xs px-2 py-1.5 rounded text-left border border-dashed text-muted-foreground flex items-start gap-1.5"
            >
              <ListChecks className="w-3 h-3 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{t.title}</div>
                <div className="text-[10px] opacity-75 font-mono">
                  {fmtTime(new Date(t.dueAt!))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Week & Day Views — simplified list-style ───────────────────────────────
//
// Rather than a full time-grid (which would be 1000+ lines), week & day use
// a hour-bucketed list: shows times along the left and event chips inline.
// This stays readable, prints well, and fits the rest of the dashboard's
// information-dense style.

function WeekView({
  cursor, events, tasks, onClickDay, onClickEvent,
}: {
  cursor: Date;
  events: CalendarEvent[];
  tasks: Task[];
  onClickDay: (d: Date) => void;
  onClickEvent: (ev: CalendarEvent) => void;
}) {
  const sun = addDays(cursor, -cursor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(sun, i));
  const occurrences = useMemo(
    () => expandEvents(events, startOfDay(days[0]), endOfDay(days[6])),
    [events, days[0].getTime()], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const dayEvents = occurrences.filter((occ) => sameDay(new Date(occ.startAt), d));
        const dayTasks = tasks.filter((t) => sameDay(new Date(t.dueAt!), d));
        const isToday = sameDay(d, today);
        return (
          <div
            key={d.toISOString()}
            className={cn(
              "rounded-xl border bg-card p-2.5 min-h-[300px] cursor-pointer hover:border-primary/40 transition-colors",
              isToday && "border-primary/60 bg-primary/5",
            )}
            onClick={() => onClickDay(d)}
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b">
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">{THAI_DOW_SHORT[d.getDay()]}</div>
                <div className={cn(
                  "text-xl font-bold tabular-nums leading-none",
                  isToday && "text-primary",
                )}>{d.getDate()}</div>
              </div>
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              {dayEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).map((occ) => (
                <EventChip key={`${occ.id}-${occ.occurrenceDate}`} occ={occ} onClick={() => onClickEvent(occ)} />
              ))}
              {dayTasks.map((t) => (
                <TaskChip key={t.id} task={t} />
              ))}
              {dayEvents.length === 0 && dayTasks.length === 0 && (
                <div className="text-[10px] text-muted-foreground italic text-center py-4">ว่าง</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  cursor, events, tasks, onClickDay, onClickEvent,
}: {
  cursor: Date;
  events: CalendarEvent[];
  tasks: Task[];
  onClickDay: (d: Date) => void;
  onClickEvent: (ev: CalendarEvent) => void;
}) {
  const occurrences = useMemo(
    () => expandEvents(events, startOfDay(cursor), endOfDay(cursor)),
    [events, cursor.getTime()], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dayTasks = tasks.filter((t) => sameDay(new Date(t.dueAt!), cursor));

  // Hourly buckets 0..23
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="grid grid-cols-[64px_1fr]">
        {hours.map((h) => {
          const slotEvents = occurrences.filter((occ) => {
            const start = new Date(occ.startAt);
            return !occ.allDay && start.getHours() === h;
          });
          const slotTasks = h === 0
            ? dayTasks.filter((t) => new Date(t.dueAt!).getHours() === h)
            : dayTasks.filter((t) => new Date(t.dueAt!).getHours() === h);

          return (
            <div key={h} className="contents">
              <div className="border-b border-r text-right text-[10px] font-mono text-muted-foreground px-2 py-1">
                {String(h).padStart(2, "0")}:00
              </div>
              <div
                className="border-b min-h-[44px] p-1.5 cursor-pointer hover:bg-muted/30"
                onClick={() => {
                  const d = new Date(cursor);
                  d.setHours(h, 0, 0, 0);
                  onClickDay(d);
                }}
              >
                <div className="flex flex-col gap-1">
                  {slotEvents.map((occ) => (
                    <EventChip key={`${occ.id}-${occ.occurrenceDate}`} occ={occ} onClick={() => onClickEvent(occ)} />
                  ))}
                  {slotTasks.map((t) => <TaskChip key={t.id} task={t} />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events at top via the toolbar; we list them in a separate row at the bottom for clarity */}
      {occurrences.filter((o) => o.allDay).length > 0 && (
        <div className="border-t bg-muted/30 p-2 flex flex-wrap gap-1">
          <span className="text-[10px] font-mono uppercase text-muted-foreground px-1">All-day:</span>
          {occurrences.filter((o) => o.allDay).map((occ) => (
            <EventChip key={`${occ.id}-${occ.occurrenceDate}`} occ={occ} onClick={() => onClickEvent(occ)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Event/Task chips ────────────────────────────────────────────────────────

function EventChip({ occ, onClick }: { occ: EventOccurrence; onClick: () => void }) {
  const c = EVENT_COLOR_CLASSES[occ.color];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded text-left truncate leading-tight border",
        c.bg, c.text, c.border,
      )}
    >
      {!occ.allDay && <span className="font-mono">{fmtTime(new Date(occ.startAt))} </span>}
      {occ.title}
    </button>
  );
}

function TaskChip({ task }: { task: Task }) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate("/tasks"); }}
      className="text-[10px] px-1.5 py-0.5 rounded text-left truncate leading-tight border border-dashed border-muted-foreground/30 text-muted-foreground flex items-center gap-1"
    >
      <ListChecks className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{task.title}</span>
    </button>
  );
}

// ─── Event create/edit dialog ───────────────────────────────────────────────

function EventDialog({
  event, initialDate, onClose,
}: { event: CalendarEvent | null; initialDate: Date | null; onClose: () => void }) {
  const store = getCalendarStore();
  const editing = !!event;

  // When creating from a day-click, seed with that day at the next hour;
  // when from a Day-view hour-click, the date already has hours set.
  const seedStart = useMemo(() => {
    if (event) return new Date(event.startAt);
    if (initialDate) {
      const d = new Date(initialDate);
      if (d.getHours() === 0 && d.getMinutes() === 0) {
        const now = new Date();
        d.setHours(now.getHours() + 1, 0, 0, 0);
      }
      return d;
    }
    return new Date();
  }, [event, initialDate]);
  const seedEnd = useMemo(() => {
    if (event) return new Date(event.endAt);
    return new Date(seedStart.getTime() + 60 * 60_000);
  }, [event, seedStart]);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [startAt, setStartAt] = useState(fmtDateTimeLocal(seedStart));
  const [endAt, setEndAt] = useState(fmtDateTimeLocal(seedEnd));
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [repeat, setRepeat] = useState<EventRepeat>(event?.repeat ?? "none");
  const [color, setColor] = useState<EventColor>(event?.color ?? "blue");
  const [reminderMinutes, setReminderMinutes] = useState<number>(event?.reminderMinutes ?? 15);

  const save = () => {
    const startDate = new Date(startAt);
    let endDate = new Date(endAt);
    if (endDate <= startDate) {
      // Auto-fix to avoid weird states
      endDate = new Date(startDate.getTime() + 60 * 60_000);
    }
    const payload = {
      title: title.trim() || "(ไม่มีชื่อ)",
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      allDay,
      repeat,
      color,
      reminderMinutes,
    };
    if (editing) store.updateEvent(event!.id, payload);
    else store.addEvent(payload);
    onClose();
  };

  const remove = () => {
    if (event && confirm(`ลบกิจกรรม "${event.title}" ?`)) {
      store.deleteEvent(event.id);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "แก้ไขกิจกรรม" : "สร้างกิจกรรมใหม่"}</DialogTitle>
          <DialogDescription>กรอกรายละเอียดด้านล่าง</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">ชื่อกิจกรรม</label>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ประชุมประจำสัปดาห์" />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="allday" checked={allDay} onCheckedChange={(v) => setAllDay(!!v)} />
            <label htmlFor="allday" className="text-xs cursor-pointer">ตลอดทั้งวัน</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> เริ่ม
              </label>
              <Input
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? startAt.slice(0, 10) : startAt}
                onChange={(e) => setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">สิ้นสุด</label>
              <Input
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? endAt.slice(0, 10) : endAt}
                onChange={(e) => setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> สถานที่ (ทางเลือก)
            </label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="เช่น ห้องประชุม A" />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">รายละเอียด</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Repeat className="w-3 h-3" /> ซ้ำ
              </label>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as EventRepeat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["none", "daily", "weekly", "monthly", "yearly"] as EventRepeat[]).map((r) => (
                    <SelectItem key={r} value={r}>{REPEAT_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Bell className="w-3 h-3" /> เตือนล่วงหน้า (นาที)
              </label>
              <Input
                type="number"
                min={0} max={1440} step={5}
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">สี</label>
            <div className="flex gap-1.5 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    EVENT_COLOR_CLASSES[c].dot,
                    color === c && "ring-2 ring-offset-2 ring-primary scale-110",
                  )}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          {editing && (
            <Button variant="destructive" onClick={remove} className="mr-auto gap-1.5">
              <Trash2 className="w-4 h-4" /> ลบ
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={save}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
