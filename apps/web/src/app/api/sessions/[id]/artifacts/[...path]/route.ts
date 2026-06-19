import * as fs from "node:fs";
import { getDefaultStore } from "@agent-plot/server-core/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; path: string[] }> }) {
  const { id, path: pathSegments } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const rel = pathSegments.join("/");
  if (!rel || rel.includes("..")) {
    return Response.json({ error: "bad path" }, { status: 400 });
  }

  let abs: string;
  try {
    abs = store.getArtifactPath(id, rel);
  } catch {
    return Response.json({ error: "bad path" }, { status: 400 });
  }

  if (!fs.existsSync(abs)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const ext = rel.toLowerCase();
  const contentType = ext.endsWith(".png")
    ? "image/png"
    : ext.endsWith(".csv")
      ? "text/csv"
      : "application/octet-stream";

  const file = fs.readFileSync(abs);
  return new Response(file, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}
