import { useSyncExternalStore } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EventRepeat = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type EventColor =
  | "blue" | "green" | "amber" | "red" | "purple" | "pink" | "cyan" | "slate";

export const EVENT_COLORS: EventColor[] = [
  "blue", "green", "amber", "red", "purple", "pink", "cyan", "slate",
];

/** Tailwind classes for each event colour. Centralised so badges, dots and
 *  full event chips stay consistent across views. */
export const EVENT_COLOR_CLASSES: Record<EventColor, {
  bg: string; text: string; border: string; dot: string;
}> = {
  blue:   { bg: "bg-blue-500/15",   text: "text-blue-700 dark:text-blue-300",   border: "border-blue-500/40",   dot: "bg-blue-500"   },
  green:  { bg: "bg-green-500/15",  text: "text-green-700 dark:text-green-300", border: "border-green-500/40",  dot: "bg-green-500"  },
  amber:  { bg: "bg-amber-500/15",  text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/40",  dot: "bg-amber-500"  },
  red:    { bg: "bg-red-500/15",    text: "text-red-700 dark:text-red-300",    border: "border-red-500/40",    dot: "bg-red-500"    },
  purple: { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/40", dot: "bg-purple-500" },
  pink:   { bg: "bg-pink-500/15",   text: "text-pink-700 dark:text-pink-300",   border: "border-pink-500/40",   dot: "bg-pink-500"   },
  cyan:   { bg: "bg-cyan-500/15",   text: "text-cyan-700 dark:text-cyan-300",   border: "border-cyan-500/40",   dot: "bg-cyan-500"   },
  slate:  { bg: "bg-slate-500/15",  text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/40",  dot: "bg-slate-500"  },
};

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  /** ISO datetime — for all-day events the date is at 00:00 local time */
  startAt: string;
  endAt: string;
  allDay: boolean;
  repeat: EventRepeat;
  color: EventColor;
  /** Minutes before startAt to fire a browser notification (0 = no reminder) */
  reminderMinutes: number;
  createdAt: string;
}

interface CalendarState {
  events: CalendarEvent[];
  /** Map of eventId+occurrenceDate (YYYY-MM-DD) → last fired timestamp */
  notifiedAt: Record<string, string>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "scada.calendar.v1";

const DEFAULT_STATE: CalendarState = {
  events: [],
  notifiedAt: {},
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadState(): CalendarState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<CalendarState>;
    return {
      events: parsed.events ?? [],
      notifiedAt: parsed.notifiedAt ?? {},
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: CalendarState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[calendar-store] failed to save:", err);
  }
}

// ─── Recurrence expansion ────────────────────────────────────────────────────

/**
 * Returns all occurrences of `event` that fall within [windowStart, windowEnd].
 * For repeating events we synthesise virtual occurrences on the fly rather
 * than persisting hundreds of rows. Each occurrence carries the same `id`
 * as the source plus `occurrenceDate` so notifications can dedupe per day.
 */
export interface EventOccurrence extends CalendarEvent {
  occurrenceDate: string; // YYYY-MM-DD of this occurrence's start
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addPeriod(d: Date, rule: EventRepeat): Date {
  const n = new Date(d);
  switch (rule) {
    case "daily":   n.setDate(n.getDate() + 1); break;
    case "weekly":  n.setDate(n.getDate() + 7); break;
    case "monthly": n.setMonth(n.getMonth() + 1); break;
    case "yearly":  n.setFullYear(n.getFullYear() + 1); break;
  }
  return n;
}

export function expandEvents(
  events: CalendarEvent[],
  windowStart: Date,
  windowEnd: Date,
): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  // Cap to keep runaway recurrences bounded (e.g. daily over many years).
  const MAX_ITERATIONS = 5000;

  for (const ev of events) {
    const start = new Date(ev.startAt);
    const end   = new Date(ev.endAt);
    const duration = end.getTime() - start.getTime();
    if (Number.isNaN(start.getTime())) continue;

    if (ev.repeat === "none") {
      if (end >= windowStart && start <= windowEnd) {
        out.push({ ...ev, occurrenceDate: ymd(start) });
      }
      continue;
    }

    let cursor = new Date(start);
    let iter = 0;
    // Fast-forward to the first occurrence that could overlap the window.
    while (cursor < windowStart && iter < MAX_ITERATIONS) {
      cursor = addPeriod(cursor, ev.repeat);
      iter++;
    }
    while (cursor <= windowEnd && iter < MAX_ITERATIONS) {
      const occStart = new Date(cursor);
      const occEnd   = new Date(cursor.getTime() + duration);
      if (occEnd >= windowStart) {
        out.push({
          ...ev,
          startAt: occStart.toISOString(),
          endAt:   occEnd.toISOString(),
          occurrenceDate: ymd(occStart),
        });
      }
      cursor = addPeriod(cursor, ev.repeat);
      iter++;
    }
  }
  return out;
}

// ─── Store ───────────────────────────────────────────────────────────────────

class CalendarStore {
  private state: CalendarState = loadState();
  private listeners = new Set<() => void>();

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): CalendarState => this.state;

  private emit() {
    saveState(this.state);
    this.listeners.forEach((l) => l());
  }

  addEvent(init: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent {
    const event: CalendarEvent = {
      ...init,
      id: uid("evt"),
      createdAt: new Date().toISOString(),
    };
    this.state = { ...this.state, events: [...this.state.events, event] };
    this.emit();
    return event;
  }

  updateEvent(id: string, patch: Partial<CalendarEvent>) {
    this.state = {
      ...this.state,
      events: this.state.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    };
    this.emit();
  }

  deleteEvent(id: string) {
    this.state = {
      ...this.state,
      events: this.state.events.filter((e) => e.id !== id),
      // also clean up notifiedAt entries so the keys don't grow unbounded
      notifiedAt: Object.fromEntries(
        Object.entries(this.state.notifiedAt).filter(([k]) => !k.startsWith(`${id}::`)),
      ),
    };
    this.emit();
  }

  /** Records that we already fired a reminder for a specific occurrence. */
  markNotified(eventId: string, occurrenceDate: string) {
    const key = `${eventId}::${occurrenceDate}`;
    this.state = {
      ...this.state,
      notifiedAt: { ...this.state.notifiedAt, [key]: new Date().toISOString() },
    };
    this.emit();
  }
}

const calendarStore = new CalendarStore();

export function getCalendarStore(): CalendarStore {
  return calendarStore;
}

export function useCalendar(): CalendarState {
  return useSyncExternalStore(
    calendarStore.subscribe,
    calendarStore.getSnapshot,
    calendarStore.getSnapshot,
  );
}
