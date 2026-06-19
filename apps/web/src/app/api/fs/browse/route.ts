import { browseFilesystem } from "@agent-plot/server-core";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partialPath = searchParams.get("partialPath") ?? "~";
  try {
    const result = await browseFilesystem(partialPath);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "browse failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
