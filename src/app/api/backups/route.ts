import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAULT_ID_RE = /^[a-f0-9]{32,64}$/;

export async function GET(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "blob_not_configured" }, { status: 503 });
  }
  const vaultId = req.nextUrl.searchParams.get("vaultId");
  if (!vaultId || !VAULT_ID_RE.test(vaultId)) {
    return NextResponse.json({ error: "invalid_vault_id" }, { status: 400 });
  }
  const { blobs } = await list({ prefix: `vaults/${vaultId}/snapshots/` });
  const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
  return NextResponse.json({
    backups: sorted.map((b) => ({
      url: b.url,
      pathname: b.pathname,
      uploadedAt: b.uploadedAt,
      size: b.size,
    })),
  });
}
