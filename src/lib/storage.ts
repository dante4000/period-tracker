"use client";

import { Snapshot, DayEntry, Settings, defaultSettings, SCHEMA_VERSION, emptySnapshot } from "./schema";
import { mergeSnapshots, gcTombstones } from "./merge";
import { getDeviceId } from "./vault";

const LOCAL_KEY = "pt:snapshot:v1";
const VAULT_KEY = "pt:vaultId";
const PASSPHRASE_KEY = "pt:passphrase";

export function loadLocal(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const json = JSON.parse(raw) as Snapshot;
    if (json && json.version === SCHEMA_VERSION && json.entries) return json;
  } catch {}
  return null;
}

export function saveLocal(s: Snapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  } catch {}
}

export function setStoredVault(vaultId: string, passphrase: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VAULT_KEY, vaultId);
  // Storing the passphrase locally lets the user recover/show it.
  // It never leaves the device.
  localStorage.setItem(PASSPHRASE_KEY, passphrase);
}

export function getStoredVault(): { vaultId: string | null; passphrase: string | null } {
  if (typeof window === "undefined") return { vaultId: null, passphrase: null };
  return {
    vaultId: localStorage.getItem(VAULT_KEY),
    passphrase: localStorage.getItem(PASSPHRASE_KEY),
  };
}

export function clearLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_KEY);
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(PASSPHRASE_KEY);
}

export type SyncResult =
  | { ok: true; snapshot: Snapshot; written: boolean }
  | { ok: false; error: string; offline?: boolean };

/**
 * Sync local snapshot to/from server.
 * Strategy: send local snapshot to /api/sync; server merges with latest blob;
 * server returns the merged snapshot. We replace local with the merged result.
 *
 * Network failure -> we keep local as-is (offline-first). Caller can retry later.
 */
export async function syncSnapshot(local: Snapshot): Promise<SyncResult> {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vaultId: local.vaultId,
        deviceId: local.deviceId,
        snapshot: local,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${text.slice(0, 120)}` };
    }
    const data = (await res.json()) as { snapshot: Snapshot; written: boolean };
    return { ok: true, snapshot: data.snapshot, written: data.written };
  } catch (e) {
    return { ok: false, error: String(e), offline: true };
  }
}

export async function pullSnapshot(vaultId: string, deviceId: string): Promise<SyncResult> {
  try {
    const res = await fetch(`/api/sync?vaultId=${encodeURIComponent(vaultId)}&deviceId=${encodeURIComponent(deviceId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `${res.status}` };
    const data = (await res.json()) as { snapshot: Snapshot };
    return { ok: true, snapshot: data.snapshot, written: false };
  } catch (e) {
    return { ok: false, error: String(e), offline: true };
  }
}

export function applyEntry(s: Snapshot, entry: DayEntry): Snapshot {
  const next: Snapshot = {
    ...s,
    deviceId: getDeviceId(),
    writtenAt: new Date().toISOString(),
    entries: { ...s.entries, [entry.id]: entry },
  };
  return next;
}

export function applySettings(s: Snapshot, settings: Settings): Snapshot {
  return {
    ...s,
    settings: { ...settings, updatedAt: new Date().toISOString() },
    deviceId: getDeviceId(),
    writtenAt: new Date().toISOString(),
  };
}

export function deleteEntry(s: Snapshot, id: string): Snapshot {
  const existing = s.entries[id];
  if (!existing) return s;
  const next: Snapshot = {
    ...s,
    deviceId: getDeviceId(),
    writtenAt: new Date().toISOString(),
    entries: {
      ...s.entries,
      [id]: { ...existing, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    },
  };
  return next;
}

export function getOrCreateLocalSnapshot(vaultId: string, deviceId: string): Snapshot {
  const local = loadLocal();
  if (local && local.vaultId === vaultId) return local;
  return emptySnapshot(vaultId, deviceId);
}

export function migrateLocal(into: Snapshot, prior: Snapshot | null): Snapshot {
  if (!prior) return into;
  // If the user changed vaults but had local data under a previous vault,
  // merge their old data forward (so switching vaults never loses data).
  return gcTombstones(mergeSnapshots(into, prior, into.deviceId));
}
