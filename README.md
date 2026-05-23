# Lune — Period & Cycle Tracker

A calm, private, cross-device period tracker that syncs through a single passphrase. Built on Next.js 16 + Vercel Blob.

## What's different about it

- **No accounts.** Data is keyed by a passphrase you choose. The same passphrase on any device opens the same data.
- **Never loses data.** All writes are immutable, timestamped snapshots in Vercel Blob. Conflicts are resolved per-entry with last-write-wins. An empty device can't wipe a populated one.
- **Light + dark + custom.** 10 palette presets, full hue/saturation accent picker, four font families, three density modes.
- **Privacy-leaning.** No tracking, no analytics. The passphrase never leaves your device — only the SHA-256 of it (your vault ID) is sent to the server to address blob paths.

## How sync works

1. User picks a passphrase. Client derives `vaultId = sha256("vault-v1:" + passphrase).slice(0,40)`.
2. Every change writes immediately to `localStorage` so the UI is instant and offline-tolerant.
3. After a 1.5s debounce (or on focus/visibility), the client POSTs its full snapshot to `/api/sync`.
4. The server lists `vaults/{vaultId}/snapshots/*.json` (sorted by ISO timestamp in the filename, newest first), reads the latest, and merges:
   - **Per-entry LWW.** For every entry id present in either snapshot, keep the one with the newer `updatedAt`.
   - **Tombstones.** Deleted entries carry `deletedAt`; deletes propagate but stale undeletes can't resurrect them.
   - **Settings.** Newer `settings.updatedAt` wins as a unit.
5. The merged snapshot is written as a new immutable blob at `vaults/{vaultId}/snapshots/{ISO-stamp}__{deviceId}__{jitter}.json`. Old snapshots are retained (default: last 30) as recoverable backups.
6. Two devices writing simultaneously each produce their own snapshot; the next read merges all of them automatically.

### Safety invariants

- **Append-only writes.** Each successful write creates a new pathname; we never overwrite, so a partial or empty payload can't destroy real data.
- **Empty guard.** If the merged snapshot has fewer live entries than the remote, the server returns 409 instead of writing.
- **No-op short-circuit.** If the merge equals the latest remote (by fingerprint), no blob is written.
- **Read robustness.** If the most-recent blob fails to parse, we fall through to the next-most-recent.

## Local dev

```bash
npm install
npm run dev
```

You'll need a Vercel Blob token in `.env.local`:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

Without it, the UI still works (everything saves to localStorage), but `/api/sync` returns 503.

## Deploy

```bash
vercel link
vercel env add BLOB_READ_WRITE_TOKEN
vercel deploy --prod
```

Or provision a Blob store from the Vercel dashboard — the env var lands in your project automatically.
