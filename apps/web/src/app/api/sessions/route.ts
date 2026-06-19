import { getDefaultStore } from "@agent-plot/server-core/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const store = getDefaultStore();
  const sessions = await store.listSessions({ archived });
  return Response.json({ sessions });
}

export async function POST() {
  const store = getDefaultStore();
  const session = await store.createSession();
  return Response.json({ id: session.id });
}
