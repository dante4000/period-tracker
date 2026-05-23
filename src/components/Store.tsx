"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DayEntry,
  Settings,
  Snapshot,
  defaultSettings,
  emptySnapshot,
} from "@/lib/schema";
import {
  applyEntry,
  applySettings,
  deleteEntry,
  loadLocal,
  saveLocal,
  syncSnapshot,
  pullSnapshot,
  getStoredVault,
  setStoredVault as persistVault,
  clearLocal,
  migrateLocal,
} from "@/lib/storage";
import { deriveVaultId, deriveVaultCanary, getDeviceId } from "@/lib/vault";
import { mergeSnapshots } from "@/lib/merge";

export type SyncState = "idle" | "syncing" | "synced" | "offline" | "error";

type Ctx = {
  ready: boolean;
  snapshot: Snapshot;
  settings: Settings;
  vaultId: string | null;
  passphrase: string | null;
  syncState: SyncState;
  lastSyncedAt: string | null;
  syncError: string | null;
  setEntry: (e: DayEntry) => void;
  removeEntry: (id: string) => void;
  setSettings: (next: Settings) => void;
  initVault: (passphrase: string) => Promise<void>;
  resetVault: () => void;
  forceSync: () => Promise<void>;
};

const StoreCtx = createContext<Ctx | null>(null);

const DEBOUNCE_MS = 1500;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    emptySnapshot("pending", "pending")
  );
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);
  const pendingRef = useRef(false);

  // Bootstrap: load local snapshot, ensure vault info exists
  useEffect(() => {
    const { vaultId: storedVault, passphrase: storedPass } = getStoredVault();
    const local = loadLocal();
    if (storedVault && local && local.vaultId === storedVault) {
      setSnapshot(local);
      setVaultId(storedVault);
      setPassphrase(storedPass);
    } else if (storedVault) {
      // Have vault, but no local snapshot for it - create empty
      const empty = emptySnapshot(storedVault, getDeviceId());
      setSnapshot(empty);
      setVaultId(storedVault);
      setPassphrase(storedPass);
    }
    setReady(true);
  }, []);

  // Initial pull-then-push when vault becomes available
  useEffect(() => {
    if (!ready || !vaultId) return;
    let cancelled = false;

    (async () => {
      setSyncState("syncing");
      setSyncError(null);
      try {
        const pulled = await pullSnapshot(vaultId, getDeviceId());
        if (cancelled) return;
        if (pulled.ok) {
          // Merge remote with current local (LWW)
          setSnapshot((cur) => {
            const merged = mergeSnapshots(cur, pulled.snapshot, getDeviceId());
            saveLocal(merged);
            return merged;
          });
        }
        // Push merged to confirm
        const cur = loadLocal();
        if (cur) {
          const pushed = await syncSnapshot(cur);
          if (cancelled) return;
          if (pushed.ok) {
            setSnapshot(pushed.snapshot);
            saveLocal(pushed.snapshot);
            setSyncState("synced");
            setLastSyncedAt(new Date().toISOString());
          } else if (pushed.offline) {
            setSyncState("offline");
          } else {
            setSyncState("error");
            setSyncError(pushed.error);
          }
        } else {
          setSyncState("synced");
          setLastSyncedAt(new Date().toISOString());
        }
      } catch (e) {
        if (!cancelled) {
          setSyncState("error");
          setSyncError(String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, ready]);

  const runSync = useCallback(async () => {
    if (!vaultId) return;
    if (inflightRef.current) {
      pendingRef.current = true;
      return;
    }
    inflightRef.current = true;
    setSyncState("syncing");
    setSyncError(null);
    try {
      const cur = loadLocal();
      if (!cur) {
        inflightRef.current = false;
        return;
      }
      const res = await syncSnapshot(cur);
      if (res.ok) {
        // Merge server response with our latest local (which may have changed during the request)
        setSnapshot((latest) => {
          const merged = mergeSnapshots(latest, res.snapshot, getDeviceId());
          saveLocal(merged);
          return merged;
        });
        setSyncState("synced");
        setLastSyncedAt(new Date().toISOString());
      } else if (res.offline) {
        setSyncState("offline");
      } else {
        setSyncState("error");
        setSyncError(res.error);
      }
    } catch (e) {
      setSyncState("error");
      setSyncError(String(e));
    } finally {
      inflightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        runSync();
      }
    }
  }, [vaultId]);

  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      runSync();
    }, DEBOUNCE_MS);
  }, [runSync]);

  // Periodic pull every 60s for cross-device freshness
  useEffect(() => {
    if (!vaultId) return;
    const interval = setInterval(() => {
      runSync();
    }, 60_000);
    return () => clearInterval(interval);
  }, [vaultId, runSync]);

  // Sync on visibility change / focus
  useEffect(() => {
    if (!vaultId) return;
    const onFocus = () => runSync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") runSync();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [vaultId, runSync]);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => runSync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [runSync]);

  const setEntry = useCallback(
    (e: DayEntry) => {
      setSnapshot((cur) => {
        const next = applyEntry(cur, e);
        saveLocal(next);
        return next;
      });
      scheduleSync();
    },
    [scheduleSync]
  );

  const removeEntry = useCallback(
    (id: string) => {
      setSnapshot((cur) => {
        const next = deleteEntry(cur, id);
        saveLocal(next);
        return next;
      });
      scheduleSync();
    },
    [scheduleSync]
  );

  const setSettings = useCallback(
    (next: Settings) => {
      setSnapshot((cur) => {
        const updated = applySettings(cur, next);
        saveLocal(updated);
        return updated;
      });
      scheduleSync();
    },
    [scheduleSync]
  );

  const initVault = useCallback(
    async (phrase: string) => {
      const vid = await deriveVaultId(phrase);
      const canary = await deriveVaultCanary(phrase);
      const did = getDeviceId();
      persistVault(vid, phrase);
      setVaultId(vid);
      setPassphrase(phrase);
      setSnapshot((cur) => {
        const base = cur.vaultId === "pending" ? emptySnapshot(vid, did) : cur;
        const migrated = migrateLocal(
          { ...base, vaultId: vid, vaultCanary: canary, deviceId: did },
          cur.vaultId === "pending" || cur.vaultId === vid ? null : cur
        );
        saveLocal(migrated);
        return migrated;
      });
    },
    []
  );

  const resetVault = useCallback(() => {
    clearLocal();
    setVaultId(null);
    setPassphrase(null);
    setSnapshot(emptySnapshot("pending", getDeviceId()));
  }, []);

  const settings = snapshot.settings ?? defaultSettings;

  const ctx: Ctx = useMemo(
    () => ({
      ready,
      snapshot,
      settings,
      vaultId,
      passphrase,
      syncState,
      lastSyncedAt,
      syncError,
      setEntry,
      removeEntry,
      setSettings,
      initVault,
      resetVault,
      forceSync: runSync,
    }),
    [ready, snapshot, settings, vaultId, passphrase, syncState, lastSyncedAt, syncError, setEntry, removeEntry, setSettings, initVault, resetVault, runSync]
  );

  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
