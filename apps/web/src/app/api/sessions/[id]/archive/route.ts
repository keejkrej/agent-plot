import { getDefaultStore } from "@agent-plot/server-core/store";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.archiveSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
