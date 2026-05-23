import { DayEntry, Settings, Snapshot, SCHEMA_VERSION } from "./schema";

const ts = (s?: string) => (s ? Date.parse(s) || 0 : 0);

function mergeEntry(a: DayEntry | undefined, b: DayEntry | undefined): DayEntry {
  if (!a) return b!;
  if (!b) return a;
  return ts(a.updatedAt) >= ts(b.updatedAt) ? a : b;
}

function mergeSettings(a: Settings, b: Settings): Settings {
  return ts(a.updatedAt) >= ts(b.updatedAt) ? a : b;
}

/**
 * Merge two snapshots using last-write-wins per-entry (CRDT-lite).
 * Tombstones (deletedAt set) propagate but stale undeletes do not resurrect.
 * The result is purely a function of the inputs - safe to call repeatedly.
 */
export function mergeSnapshots(
  a: Snapshot,
  b: Snapshot,
  deviceId: string
): Snapshot {
  const out: Snapshot = {
    version: SCHEMA_VERSION,
    vaultId: a.vaultId || b.vaultId,
    writtenAt: new Date().toISOString(),
    deviceId,
    entries: {},
    settings: mergeSettings(a.settings, b.settings),
    vaultCanary: a.vaultCanary || b.vaultCanary,
  };
  const ids = new Set([
    ...Object.keys(a.entries || {}),
    ...Object.keys(b.entries || {}),
  ]);
  for (const id of ids) {
    out.entries[id] = mergeEntry(a.entries[id], b.entries[id]);
  }
  return out;
}

/**
 * Strip tombstones older than 90 days. Keeps recent ones so deletes still propagate.
 */
export function gcTombstones(s: Snapshot): Snapshot {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const entries: Record<string, DayEntry> = {};
  for (const [id, e] of Object.entries(s.entries)) {
    if (e.deletedAt && ts(e.deletedAt) < cutoff) continue;
    entries[id] = e;
  }
  return { ...s, entries };
}

/**
 * Compute a fingerprint of the snapshot's data content for change detection.
 */
export function dataFingerprint(s: Snapshot): string {
  const keys = Object.keys(s.entries).sort();
  let hash = 0;
  const str =
    keys
      .map((k) => {
        const e = s.entries[k];
        return `${e.id}|${e.updatedAt}|${e.deletedAt || ""}`;
      })
      .join(";") +
    `||S:${s.settings.updatedAt}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/**
 * Count "real" (non-tombstoned) entries in a snapshot.
 * Used by the empty-guard: never let an empty payload overwrite a populated remote.
 */
export function liveEntryCount(s: Snapshot): number {
  let n = 0;
  for (const e of Object.values(s.entries)) if (!e.deletedAt) n++;
  return n;
}
