import { useEffect, useRef } from 'react';
import { Reminder, VehicleService, Vehicle } from '@/types';
import { toast } from 'sonner';

/**
 * In-browser scheduled notifications for reminders and vehicle services.
 * - Asks user for Notification permission once.
 * - While the app/tab is open, schedules setTimeouts to fire native notifications + toast.
 * - Persists "shown" IDs in localStorage so a reminder fires only once per due-time.
 *
 * NOTE: True background push (when the app is closed) requires a service worker
 * and a push provider. This hook gives reliable in-app + foreground native
 * notifications, which works well when the PWA is installed and opened.
 */

const SHOWN_KEY = 'arux_notif_shown';

function getShown(): Record<string, true> {
  try { return JSON.parse(localStorage.getItem(SHOWN_KEY) || '{}'); } catch { return {}; }
}
function markShown(key: string) {
  const shown = getShown();
  shown[key] = true;
  // Cap size to last 200 entries
  const keys = Object.keys(shown);
  if (keys.length > 200) {
    const trimmed: Record<string, true> = {};
    keys.slice(-200).forEach(k => (trimmed[k] = true));
    localStorage.setItem(SHOWN_KEY, JSON.stringify(trimmed));
  } else {
    localStorage.setItem(SHOWN_KEY, JSON.stringify(shown));
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

function showNotification(title: string, body: string, tag: string) {
  // Always show toast (works regardless of permission)
  toast(title, { description: body });
  if (notificationsSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag, icon: '/favicon.png', badge: '/favicon.png' });
    } catch {
      // Some browsers (iOS Safari without PWA install) throw — toast already shown
    }
  }
  // Vibrate on mobile if available
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200]); } catch {}
  }
}

export function useReminderNotifications(
  reminders: Reminder[],
  vehicleServices: VehicleService[],
  vehicles: Vehicle[],
) {
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    // Clear previous timers
    timersRef.current.forEach(id => window.clearTimeout(id));
    timersRef.current = [];

    const shown = getShown();
    const now = Date.now();
    const horizon = 24 * 60 * 60 * 1000; // schedule notifications for next 24h

    // 1. Reminders
    reminders.forEach(r => {
      if (r.completed) return;
      const time = r.time && /^\d{2}:\d{2}/.test(r.time) ? r.time.slice(0, 5) : '09:00';
      const dueAt = new Date(`${r.date}T${time}:00`).getTime();
      if (isNaN(dueAt)) return;
      const key = `r_${r.id}_${r.date}_${time}`;
      if (shown[key]) return;
      const delay = dueAt - now;
      if (delay < -60_000) return; // missed by more than 1 min
      if (delay > horizon) return;
      const fire = () => {
        const info = REMINDER_LABELS[r.type] || '🔔 Reminder';
        showNotification(`${info} ${r.title}`, r.notes || `Due now${r.time ? ` at ${r.time}` : ''}`, key);
        markShown(key);
      };
      const id = window.setTimeout(fire, Math.max(0, delay));
      timersRef.current.push(id);
    });

    // 2. Vehicle services — fire at 09:00 on the due date AND 1 day before
    vehicleServices.forEach(s => {
      if (s.completed || !s.dueDate) return;
      const veh = vehicles.find(v => v.id === s.vehicleId);
      const vehName = veh?.name || 'Vehicle';
      const fireAt = new Date(`${s.dueDate}T09:00:00`).getTime();
      // 1 day before
      const dayBefore = fireAt - 24 * 60 * 60 * 1000;
      [
        { at: dayBefore, key: `vs_${s.id}_pre`, prefix: '⏰ Tomorrow' },
        { at: fireAt, key: `vs_${s.id}_due`, prefix: '🔧 Due Today' },
      ].forEach(({ at, key, prefix }) => {
        if (shown[key]) return;
        const delay = at - now;
        if (delay < -60_000 || delay > horizon) return;
        const id = window.setTimeout(() => {
          showNotification(`${prefix}: ${s.title}`, `${vehName} • ${s.title}${s.notes ? ` — ${s.notes}` : ''}`, key);
          markShown(key);
        }, Math.max(0, delay));
        timersRef.current.push(id);
      });
    });

    return () => {
      timersRef.current.forEach(id => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [reminders, vehicleServices, vehicles]);
}

const REMINDER_LABELS: Record<string, string> = {
  meeting: '📅',
  rent: '🏠',
  emi: '💳',
  general: '🔔',
};
