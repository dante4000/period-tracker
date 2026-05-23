import { NextRequest, NextResponse } from "next/server";
import { list, put, del } from "@vercel/blob";
import {
  Snapshot,
  SCHEMA_VERSION,
  emptySnapshot,
} from "@/lib/schema";
import {
  mergeSnapshots,
  gcTombstones,
  liveEntryCount,
  dataFingerprint,
} from "@/lib/merge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAULT_ID_RE = /^[a-f0-9]{32,64}$/;
const MAX_SNAPSHOTS_KEPT = 30;
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024; // 4MB

function vaultPrefix(vaultId: string) {
  return `vaults/${vaultId}/snapshots/`;
}

function pathnameFor(vaultId: string, deviceId: string) {
  // Append-only naming: ISO timestamp + deviceId + jitter ensures uniqueness
  // and total ordering on later list() reads. We use addRandomSuffix: false
  // because the path is already unique and we never want allowOverwrite path.
  const safeDevice = (deviceId || "unknown").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "anon";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jitter = Math.random().toString(36).slice(2, 8);
  return `${vaultPrefix(vaultId)}${stamp}__${safeDevice}__${jitter}.json`;
}

async function fetchLatestSnapshot(
  vaultId: string,
  deviceId: string
): Promise<{ snapshot: Snapshot; allBlobs: { url: string; pathname: string; uploadedAt: Date }[] }> {
  const { blobs } = await list({ prefix: vaultPrefix(vaultId) });
  if (!blobs.length) {
    return { snapshot: emptySnapshot(vaultId, deviceId), allBlobs: [] };
  }
  // sort by pathname desc (ISO timestamp in pathname => lexicographic order works)
  const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
  // Try in order — if a blob is corrupted, fall through to the next.
  for (const b of sorted) {
    try {
      const res = await fetch(b.url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = (await res.json()) as Snapshot;
      if (
        json &&
        typeof json === "object" &&
        json.vaultId === vaultId &&
        json.entries &&
        typeof json.entries === "object"
      ) {
        return { snapshot: json, allBlobs: sorted };
      }
    } catch {
      // try next
    }
  }
  return { snapshot: emptySnapshot(vaultId, deviceId), allBlobs: sorted };
}

async function retentionSweep(
  allBlobs: { url: string; pathname: string }[]
) {
  if (allBlobs.length <= MAX_SNAPSHOTS_KEPT) return;
  const sorted = [...allBlobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
  const toDelete = sorted.slice(MAX_SNAPSHOTS_KEPT);
  if (!toDelete.length) return;
  try {
    await del(toDelete.map((b) => b.url));
  } catch {
    // non-fatal
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "blob_not_configured", message: "BLOB_READ_WRITE_TOKEN missing on server" },
      { status: 503 }
    );
  }

  let body: { vaultId?: string; deviceId?: string; snapshot?: Snapshot };
  try {
    const text = await req.text();
    if (text.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { vaultId, deviceId, snapshot: incoming } = body;
  if (!vaultId || !VAULT_ID_RE.test(vaultId)) {
    return NextResponse.json({ error: "invalid_vault_id" }, { status: 400 });
  }
  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "invalid_device_id" }, { status: 400 });
  }
  if (!incoming || incoming.version !== SCHEMA_VERSION || incoming.vaultId !== vaultId) {
    return NextResponse.json({ error: "invalid_snapshot" }, { status: 400 });
  }

  // First read of latest server state
  const { snapshot: remote, allBlobs } = await fetchLatestSnapshot(vaultId, deviceId);

  // Merge: LWW per-entry, never resurrect tombstones, prefer newer settings
  let merged = mergeSnapshots(remote, incoming, deviceId);
  merged = gcTombstones(merged);

  // Empty guard: if incoming was empty but remote has data, the merge will
  // already contain remote's data — we still write a new snapshot to advance
  // writtenAt but it can't lose anything.
  const remoteLive = liveEntryCount(remote);
  const mergedLive = liveEntryCount(merged);
  if (mergedLive < remoteLive) {
    // Should not happen under LWW unless tombstones, but be paranoid.
    return NextResponse.json(
      {
        error: "merge_reduced_data",
        message: "refusing to write merged snapshot smaller than remote",
        remoteLive,
        mergedLive,
      },
      { status: 409 }
    );
  }

  // No-op short-circuit: if merged equals remote, skip writing
  const remoteFp = dataFingerprint(remote);
  const mergedFp = dataFingerprint(merged);
  if (remoteFp === mergedFp) {
    return NextResponse.json({
      snapshot: remote,
      written: false,
      fingerprint: remoteFp,
    });
  }

  // Write new immutable snapshot
  const pathname = pathnameFor(vaultId, deviceId);
  const json = JSON.stringify(merged);
  try {
    await put(pathname, json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "blob_write_failed", message: String(err) },
      { status: 500 }
    );
  }

  // Retention sweep (best-effort, never fails the request)
  retentionSweep([...allBlobs, { url: "", pathname }]).catch(() => {});

  return NextResponse.json({
    snapshot: merged,
    written: true,
    fingerprint: mergedFp,
  });
}

export async function GET(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "blob_not_configured" },
      { status: 503 }
    );
  }
  const vaultId = req.nextUrl.searchParams.get("vaultId");
  const deviceId = req.nextUrl.searchParams.get("deviceId") || "anon";
  if (!vaultId || !VAULT_ID_RE.test(vaultId)) {
    return NextResponse.json({ error: "invalid_vault_id" }, { status: 400 });
  }
  const { snapshot } = await fetchLatestSnapshot(vaultId, deviceId);
  return NextResponse.json({ snapshot, fingerprint: dataFingerprint(snapshot) });
}
