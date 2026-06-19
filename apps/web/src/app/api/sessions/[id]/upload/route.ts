import { broadcast } from "@agent-plot/ws-hub";
import {
  broadcastActivityEnd,
  broadcastActivityStart,
  broadcastSystemNote,
  broadcastUser,
  getDefaultStore,
  refreshSessionCanvas,
} from "@agent-plot/server-core";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "invalid multipart form" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return Response.json({ error: "expected file field (binary)" }, { status: 400 });
  }

  const bytes = new Uint8Array(await fileEntry.arrayBuffer());
  const fileName = fileEntry.name || "input.tif";
  await store.saveUpload(id, bytes, fileName);

  let history = await store.readChatHistory(id);
  await broadcastUser(store, id, `[upload] ${fileName}`);
  history = await store.readChatHistory(id);

  const { activityId } = await broadcastActivityStart(store, id, "Building artifacts");

  const refreshed = await refreshSessionCanvas(store, id, { buildIfMissing: true });

  if (refreshed.artifactNote) {
    await broadcastSystemNote(store, id, refreshed.artifactNote.trim());
  }

  if (refreshed.ok) {
    await broadcast(id, { type: "canvas.tree", spec: refreshed.spec });
    await broadcastActivityEnd(store, id, activityId, { detail: "Canvas updated", status: "done" });
    await broadcast(id, { type: "tool.end", name: "json_render" });
  } else if (!refreshed.ok && refreshed.error) {
    await broadcast(id, { type: "canvas.error", message: refreshed.error });
    await broadcastActivityEnd(store, id, activityId, { detail: refreshed.error, status: "error" });
    await broadcastSystemNote(store, id, `Error: ${refreshed.error}`);
  } else {
    await broadcastActivityEnd(store, id, activityId, { status: "done" });
  }

  return Response.json({ ok: true, name: fileName });
}
