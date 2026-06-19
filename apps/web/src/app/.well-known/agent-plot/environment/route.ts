import { APP_VERSION } from "@/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    appName: "Agent Plot",
    appVersion: APP_VERSION,
    platform: "web",
  });
}
