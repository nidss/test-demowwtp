import { useEffect } from "react";
import {
  getCalendarStore, useCalendar, expandEvents,
} from "@/lib/calendar-store";

/**
 * Polls every 30 s and fires a browser notification when an event's
 * `reminderMinutes` window opens (now ≥ start - reminderMinutes) and the
 * event hasn't started yet. Each (eventId, occurrenceDate) pair only fires
 * once so recurring events get a fresh reminder per occurrence.
 *
 * Like task notifications, this only works while the tab is open. Background
 * delivery would need a Service Worker.
 */
export function useCalendarNotifications() {
  const { events, notifiedAt } = useCalendar();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      // Look ahead up to 24 hours so we catch all reminders that should
      // fire in the near future, including same-day repeats.
      const now = new Date();
      const lookAheadEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const occurrences = expandEvents(events, now, lookAheadEnd);

      occurrences.forEach((occ) => {
        if (occ.reminderMinutes <= 0) return;
        const startMs = new Date(occ.startAt).getTime();
        if (Number.isNaN(startMs)) return;
        const reminderMs = startMs - occ.reminderMinutes * 60_000;
        if (now.getTime() < reminderMs || now.getTime() >= startMs) return;

        const key = `${occ.id}::${occ.occurrenceDate}`;
        if (notifiedAt[key]) return;

        try {
          const minutesLeft = Math.max(
            0,
            Math.round((startMs - now.getTime()) / 60_000),
          );
          new Notification(`📅 ${occ.title}`, {
            body: minutesLeft > 0
              ? `จะเริ่มในอีก ${minutesLeft} นาที`
              : "กำลังจะเริ่ม",
            tag: key,
          });
          getCalendarStore().markNotified(occ.id, occ.occurrenceDate);
        } catch (err) {
          console.error("[calendar-notifications] failed:", err);
        }
      });
    };

    check();
    const handle = window.setInterval(check, 30_000);
    return () => window.clearInterval(handle);
  }, [events, notifiedAt]);
}
