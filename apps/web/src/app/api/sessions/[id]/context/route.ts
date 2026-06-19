import type { SessionContext } from "@agent-plot/db";
import { getDefaultStore } from "@agent-plot/server-core";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }
  const context = await store.readSessionContext(id);
  return Response.json(context ?? {});
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const context: Partial<SessionContext> = {};
  if (typeof input.experimentalGoal === "string") context.experimentalGoal = input.experimentalGoal;
  if (typeof input.scientificBackground === "string") context.scientificBackground = input.scientificBackground;
  if (typeof input.preferredOutputFormat === "string") context.preferredOutputFormat = input.preferredOutputFormat;

  await store.updateSessionContext(id, context);
  const updated = await store.readSessionContext(id);
  return Response.json(updated ?? {});
}
