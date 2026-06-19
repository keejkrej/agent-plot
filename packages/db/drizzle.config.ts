import * as path from "node:path";
import { defineConfig } from "drizzle-kit";

const dataDir = process.env.AGENT_PLOT_DATA_DIR?.trim()
  ? path.resolve(process.env.AGENT_PLOT_DATA_DIR.trim())
  : path.resolve(process.cwd(), "data");
const defaultUrl = path.join(dataDir, "agent-plot.db");
const url = process.env.AGENT_PLOT_DATABASE_URL?.trim() ?? defaultUrl;

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
