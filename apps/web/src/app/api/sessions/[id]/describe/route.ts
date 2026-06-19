import { describeTiff, getDefaultStore } from "@agent-plot/server-core";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const result = await describeTiff(session.dir);
  if (!result.ok) {
    return Response.json({ error: result.stderr }, { status: 500 });
  }

  return Response.json(result.data);
}
