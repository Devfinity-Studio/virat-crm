import { openDB, type IDBPDatabase } from "idb";

export interface BufferedLocation {
  id?: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  recordedAt: string; // ISO 8601 string
  isOfflineSynced: boolean;
}

const DB_NAME = "virat_crm_offline_tracking";
const DB_VERSION = 1;
const STORE_NAME = "locations_buffer";

const STORAGE_KEYS = {
  OFFLINE_STARTED_AT: "virat_tracking_offline_started_at",
  IS_LOCKED_OUT: "virat_tracking_is_locked_out",
  LOCKOUT_REASON: "virat_tracking_lockout_reason",
  PENDING_LOCKOUT_NOTIFY: "virat_tracking_pending_lockout_notify",
};

export const MAX_OFFLINE_GRACE_MS = 22 * 60 * 1000; // 22 minutes strict threshold

// In-memory storage fallback for SSR/Node/Tests
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      return localStorage.getItem(key);
    } catch {
      // fallback
    }
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      // fallback
    }
  }
  memoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch {
      // fallback
    }
  }
  memoryStore.delete(key);
}

export function clearAllStorage(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.clear();
    } catch {
      // fallback
    }
  }
  memoryStore.clear();
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is only available in browser environment"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueLocation(
  loc: Omit<BufferedLocation, "id">,
): Promise<void> {
  try {
    const db = await getDB();
    await db.add(STORE_NAME, {
      ...loc,
      isOfflineSynced: true,
    });
  } catch (err) {
    try {
      const existing = JSON.parse(
        getStorageItem("virat_offline_loc_fallback") ?? "[]",
      ) as BufferedLocation[];
      existing.push({ ...loc, isOfflineSynced: true });
      setStorageItem("virat_offline_loc_fallback", JSON.stringify(existing));
    } catch (fallbackErr) {
      console.error("Fallback storage failed:", fallbackErr);
    }
  }
}

export async function getBufferedLocations(): Promise<BufferedLocation[]> {
  try {
    const db = await getDB();
    const records = await db.getAll(STORE_NAME);
    let fallback: BufferedLocation[] = [];
    try {
      fallback = JSON.parse(
        getStorageItem("virat_offline_loc_fallback") ?? "[]",
      ) as BufferedLocation[];
    } catch {
      // ignore
    }
    return [...records, ...fallback].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
  } catch {
    let fallback: BufferedLocation[] = [];
    try {
      fallback = JSON.parse(
        getStorageItem("virat_offline_loc_fallback") ?? "[]",
      ) as BufferedLocation[];
    } catch {
      // ignore
    }
    return fallback.sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
  }
}

export async function clearBufferedLocations(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch {
    // ignore
  }
  removeStorageItem("virat_offline_loc_fallback");
}

export async function getBufferedCount(): Promise<number> {
  try {
    const db = await getDB();
    const count = await db.count(STORE_NAME);
    let fallbackCount = 0;
    try {
      const fb = JSON.parse(getStorageItem("virat_offline_loc_fallback") ?? "[]");
      fallbackCount = Array.isArray(fb) ? fb.length : 0;
    } catch {
      // ignore
    }
    return count + fallbackCount;
  } catch {
    let fallbackCount = 0;
    try {
      const fb = JSON.parse(getStorageItem("virat_offline_loc_fallback") ?? "[]");
      fallbackCount = Array.isArray(fb) ? fb.length : 0;
    } catch {
      // ignore
    }
    return fallbackCount;
  }
}

export function getOfflineStartedAt(): number | null {
  const val = getStorageItem(STORAGE_KEYS.OFFLINE_STARTED_AT);
  if (!val) return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

export function setOfflineStartedAt(ts: number | null): void {
  if (ts === null) {
    removeStorageItem(STORAGE_KEYS.OFFLINE_STARTED_AT);
  } else {
    // Only set if not already set (immutable start timestamp)
    if (!getStorageItem(STORAGE_KEYS.OFFLINE_STARTED_AT)) {
      setStorageItem(STORAGE_KEYS.OFFLINE_STARTED_AT, ts.toString());
    }
  }
}

export function clearOfflineStartedAt(): void {
  removeStorageItem(STORAGE_KEYS.OFFLINE_STARTED_AT);
}

export function isBufferExpired(): boolean {
  const startedAt = getOfflineStartedAt();
  if (!startedAt) return false;
  return Date.now() - startedAt >= MAX_OFFLINE_GRACE_MS;
}

export function getRemainingGraceMs(): number {
  const startedAt = getOfflineStartedAt();
  if (!startedAt) return MAX_OFFLINE_GRACE_MS;
  const elapsed = Date.now() - startedAt;
  return Math.max(0, MAX_OFFLINE_GRACE_MS - elapsed);
}

export function isLockedOut(): boolean {
  return getStorageItem(STORAGE_KEYS.IS_LOCKED_OUT) === "true";
}

export function setLockedOut(locked: boolean, reason?: string): void {
  if (locked) {
    setStorageItem(STORAGE_KEYS.IS_LOCKED_OUT, "true");
    if (reason) {
      setStorageItem(STORAGE_KEYS.LOCKOUT_REASON, reason);
    }
    setStorageItem(STORAGE_KEYS.PENDING_LOCKOUT_NOTIFY, "true");
  } else {
    removeStorageItem(STORAGE_KEYS.IS_LOCKED_OUT);
    removeStorageItem(STORAGE_KEYS.LOCKOUT_REASON);
    removeStorageItem(STORAGE_KEYS.PENDING_LOCKOUT_NOTIFY);
  }
}

export function getLockoutReason(): string {
  return (
    getStorageItem(STORAGE_KEYS.LOCKOUT_REASON) ??
    "Offline duration exceeded 22 minutes grace period."
  );
}

export async function flushOfflineQueue(): Promise<{
  success: boolean;
  syncedCount: number;
  lockedOut: boolean;
}> {
  const locations = await getBufferedLocations();

  // If buffer expired (> 22 mins offline), enforce hard lockout
  if (isBufferExpired() || isLockedOut()) {
    setLockedOut(true, "Offline grace period (22 mins) expired.");

    // Sync whatever points we collected before lockout
    if (locations.length > 0) {
      try {
        await fetch("/api/location/batch-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations }),
        });
        await clearBufferedLocations();
      } catch (err) {
        console.error("Failed to sync points during lockout flush:", err);
      }
    }

    // Trigger emergency notification
    const startedAt = getOfflineStartedAt();
    const durationMinutes = startedAt
      ? (Date.now() - startedAt) / 60000
      : 22.1;

    try {
      await fetch("/api/location/emergency-revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: `Offline grace period expired (${durationMinutes.toFixed(1)} mins offline).`,
        }),
      });
    } catch {
      // ignore
    }

    return {
      success: true,
      syncedCount: locations.length,
      lockedOut: true,
    };
  }

  // Reconnection within grace period (<= 22 mins): upload batch in chronological order
  if (locations.length === 0) {
    clearOfflineStartedAt();
    return { success: true, syncedCount: 0, lockedOut: false };
  }

  try {
    const res = await fetch("/api/location/batch-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations }),
    });

    if (res.ok) {
      await clearBufferedLocations();
      clearOfflineStartedAt();
      return { success: true, syncedCount: locations.length, lockedOut: false };
    } else {
      console.warn("Batch sync returned non-OK status:", res.status);
      return { success: false, syncedCount: 0, lockedOut: false };
    }
  } catch (err) {
    console.error("Batch sync network error:", err);
    return { success: false, syncedCount: 0, lockedOut: false };
  }
}
