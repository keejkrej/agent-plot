import { broadcast } from "@agent-plot/ws-hub";
import {
  broadcastActivityEnd,
  broadcastActivityStart,
  broadcastSystemNote,
  getDefaultStore,
  refreshSessionCanvas,
} from "@agent-plot/server-core";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const { activityId } = await broadcastActivityStart(store, id, "Rendering canvas");
  const refreshed = await refreshSessionCanvas(store, id);

  if (refreshed.artifactNote) {
    await broadcastSystemNote(store, id, refreshed.artifactNote.trim());
  }

  if (refreshed.ok) {
    await broadcast(id, { type: "canvas.tree", spec: refreshed.spec });
    await broadcastActivityEnd(store, id, activityId, { detail: "Canvas updated", status: "done" });
    await broadcast(id, { type: "tool.end", name: "json_render" });
    return Response.json({ ok: true, spec: refreshed.spec });
  } else if (refreshed.error) {
    await broadcast(id, { type: "canvas.error", message: refreshed.error });
    await broadcastActivityEnd(store, id, activityId, { detail: refreshed.error, status: "error" });
    return Response.json({ error: refreshed.error }, { status: 500 });
  } else {
    await broadcastActivityEnd(store, id, activityId, { status: "done" });
    return Response.json({ ok: false, reason: "no artifacts" });
  }
}
