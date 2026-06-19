// @ts-nocheck
import { eveChannel, defaultEveAuth } from "eve/channels/eve";
import { localDev, placeholderAuth, vercelOidc } from "eve/channels/auth";
import { getDefaultStore } from "../../dist/agent-lib/store.js";

function contextStrings(ctx: Awaited<ReturnType<ReturnType<typeof getDefaultStore>["readDefaultSessionContext"]>>): string[] {
  const parts: string[] = [];
  if (ctx.experimentalGoal) parts.push(`Experimental goal: ${ctx.experimentalGoal}`);
  if (ctx.scientificBackground) parts.push(`Scientific background: ${ctx.scientificBackground}`);
  if (ctx.preferredOutputFormat) parts.push(`Preferred output format: ${ctx.preferredOutputFormat}`);
  if (ctx.dataFolder) {
    parts.push(`Local data folder: ${ctx.dataFolder}`);
    parts.push(`When the user asks about their data, default to reading files from ${ctx.dataFolder}.`);
  }
  return parts;
}

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // This placeholder will not allow browser requests in production.
    // Replace it with your app's auth provider, like Auth.js or Clerk,
    // or use none() for a public demo.
    placeholderAuth(),
  ],
  async onMessage(ctx, _message) {
    const store = getDefaultStore();
    const sessionContext = await store.readDefaultSessionContext();
    const parts = contextStrings(sessionContext);
    return {
      auth: defaultEveAuth(ctx),
      context: parts.length > 0 ? [`## User context\n\n${parts.join("\n\n")}`] : undefined,
    };
  },
});
