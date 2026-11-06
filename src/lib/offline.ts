// Offline-first cache + write queue.
// Reads are cached in localStorage so the app opens instantly (and works offline).
// Writes made while offline are queued and replayed when the connection returns.

const CACHE_PREFIX = 'arux_cache_';
const QUEUE_KEY = 'arux_sync_queue';
const SCOPE_KEY = 'arux_cache_scope';

export type CacheKey =
  | 'incomes' | 'expenses' | 'tasks' | 'taskLists' | 'subtasks'
  | 'meetings' | 'reminders' | 'subscriptions' | 'budgets' | 'lentBorrowEntries' | 'bankAccounts'
  | 'groceryLists' | 'groceryListItems' | 'groceryStock' | 'groceryStockMovements' | 'groceryActivity' | 'groceryHouseholds';

/**
 * Caches are per-account. Whenever the signed-in user changes (or signs out)
 * every cached row from the previous account is dropped, so a stale balance can
 * never survive a reset, a re-install or a different login on the same device.
 */
let scopeId = (() => {
  try { return localStorage.getItem(SCOPE_KEY) || ''; } catch { return ''; }
})();

function scopedKey(key: CacheKey) {
  return `${CACHE_PREFIX}${scopeId}_${key}`;
}

/** Returns true when the scope actually changed (i.e. caches were wiped). */
export function setCacheScope(userId: string | null | undefined): boolean {
  const next = userId || '';
  if (next === scopeId) return false;
  // A different account (or sign-out): wipe everything cached locally.
  clearAllCaches();
  scopeId = next;
  try { localStorage.setItem(SCOPE_KEY, next); } catch { /* ignore */ }
  return true;
}

export function loadCache<T>(key: CacheKey): T[] | null {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function saveCache<T>(key: CacheKey, rows: T[]) {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(rows));
  } catch {
    /* quota — ignore */
  }
}

/** Removes cached rows for the current account only. */
export function clearCache() {
  try {
    const prefix = `${CACHE_PREFIX}${scopeId}_`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

/** Removes every cached row for every account stored on this device. */
export function clearAllCaches() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX) && k !== SCOPE_KEY)
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

/* ---------------- write queue ---------------- */

export type QueuedOp = {
  opId: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload?: Record<string, unknown>;
  rowId?: string;
  at: number;
};

const LOCAL_PREFIX = 'local-';

export function localId(): string {
  return `${LOCAL_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isLocalId(id: string | undefined): boolean {
  return !!id && id.startsWith(LOCAL_PREFIX);
}

export function getQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setQueue(ops: QueuedOp[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  } catch { /* ignore */ }
}

export function pendingSyncCount(): number {
  return getQueue().length;
}

export function queueOp(op: Omit<QueuedOp, 'opId' | 'at'>): QueuedOp {
  const full: QueuedOp = { ...op, opId: localId(), at: Date.now() };
  const queue = getQueue();

  // Deleting a row that was only ever created offline: drop its queued ops entirely.
  if (op.action === 'delete' && isLocalId(op.rowId)) {
    setQueue(queue.filter(q => q.rowId !== op.rowId));
    return full;
  }

  // Collapse repeated updates to the same offline row.
  if (op.action === 'update') {
    const existing = queue.find(q => q.action === 'insert' && q.rowId === op.rowId);
    if (existing) {
      existing.payload = { ...(existing.payload || {}), ...(op.payload || {}) };
      setQueue(queue);
      return existing;
    }
  }

  setQueue([...queue, full]);
  return full;
}

export function clearQueue() {
  setQueue([]);
}

type MinimalClient = {
  from: (table: string) => any;
};

/** Replays queued writes in order. Returns how many succeeded / failed. */
export async function flushQueue(client: MinimalClient): Promise<{ synced: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const remaining: QueuedOp[] = [];
  const idMap = new Map<string, string>(); // local id -> real id
  let synced = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      if (op.action === 'insert') {
        const payload = { ...(op.payload || {}) };
        delete (payload as any).id;
        const { data, error } = await client.from(op.table).insert(payload).select().single();
        if (error) throw error;
        if (op.rowId && data?.id) idMap.set(op.rowId, data.id);
        synced++;
      } else {
        const targetId = op.rowId && idMap.get(op.rowId) ? idMap.get(op.rowId)! : op.rowId;
        if (!targetId || isLocalId(targetId)) { synced++; continue; }
        if (op.action === 'update') {
          const { error } = await client.from(op.table).update(op.payload || {}).eq('id', targetId);
          if (error) throw error;
        } else {
          const { error } = await client.from(op.table).delete().eq('id', targetId);
          if (error) throw error;
        }
        synced++;
      }
    } catch (err) {
      console.error('Sync failed for op', op, err);
      failed++;
      remaining.push(op);
    }
  }

  setQueue(remaining);
  return { synced, failed };
}
