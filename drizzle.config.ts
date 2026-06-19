import * as path from "node:path";
import { AGENT_PLOT_HOME } from "./agent/lib/python/paths";
import { defineConfig } from "drizzle-kit";

const defaultUrl = path.join(AGENT_PLOT_HOME, "agent-plot.db");
const url = process.env.AGENT_PLOT_DATABASE_URL?.trim() ?? defaultUrl;

export default defineConfig({
  dialect: "sqlite",
  schema: "./agent/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
