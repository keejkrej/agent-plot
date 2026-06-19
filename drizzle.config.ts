import * as path from "node:path";
import { AGENT_PLOT_HOME } from "./src/lib/python/paths";
import { defineConfig } from "drizzle-kit";

const defaultUrl = path.join(AGENT_PLOT_HOME, "agent-plot.db");
const url = process.env.AGENT_PLOT_DATABASE_URL?.trim() ?? defaultUrl;

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
