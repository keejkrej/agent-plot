import * as fs from "node:fs";
import * as path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { getDefaultStore } from "#lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> },
): Promise<NextResponse> {
  const { id, path: segments } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return new NextResponse("Session not found", { status: 404 });
  }

  const rel = path.join(...segments);
  let abs: string;
  try {
    abs = store.getArtifactPath(id, rel);
  } catch {
    return new NextResponse("Bad artifact path", { status: 400 });
  }

  if (!fs.existsSync(abs)) {
    return new NextResponse("Artifact not found", { status: 404 });
  }

  const data = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mimeType =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
      : ext === ".svg"
        ? "image/svg+xml"
      : ext === ".csv"
        ? "text/csv"
      : ext === ".json"
        ? "application/json"
      : "application/octet-stream";

  return new NextResponse(data, {
    headers: { "Content-Type": mimeType },
  });
}
