import { useEffect } from "react";
import { getTasksStore, useTasks } from "@/lib/tasks-store";

/**
 * Polls every 30s for tasks whose dueAt has been reached and fires a
 * browser notification. Only fires once per (taskId, dueAt) pair — recurring
 * tasks produce new dueAt values when completed, so they're notified again.
 *
 * Notifications fire only while the tab is open. For background delivery
 * we'd need a Service Worker; that's out of scope for this phase.
 */
export function useTaskNotifications() {
  const { tasks, notifiedAt } = useTasks();

  // Ask for permission up-front so the first due-time fire is silent-but-shown
  // rather than dropped because Notification.permission is "default".
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Browsers want a user gesture for the prompt in some cases; this is a
      // best-effort request. Falling back to silent is fine.
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      tasks.forEach((t) => {
        if (!t.enabled || t.completed || !t.dueAt) return;
        const dueMs = new Date(t.dueAt).getTime();
        if (Number.isNaN(dueMs) || dueMs > now) return;
        // Already notified for this exact dueAt?
        if (notifiedAt[t.id] === t.dueAt) return;
        try {
          new Notification(t.title, {
            body: t.notes ?? "ครบกำหนดแล้ว",
            tag: t.id, // collapse repeats of the same task in OS notification center
            requireInteraction: t.starred, // sticky for pinned/important tasks
          });
          getTasksStore().markNotified(t.id, t.dueAt);
        } catch (err) {
          console.error("[notifications] failed:", err);
        }
      });
    };

    // Run once immediately so notifications fire on tab focus without a
    // 30-second delay, then poll on a moderate interval.
    check();
    const handle = window.setInterval(check, 30_000);
    return () => window.clearInterval(handle);
  }, [tasks, notifiedAt]);
}
