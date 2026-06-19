import * as path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const DB_URL = process.env.AGENT_PLOT_DATABASE_URL?.trim();

function defaultDatabasePath(): string {
  const dataDir = process.env.AGENT_PLOT_DATA_DIR?.trim()
    ? path.resolve(process.env.AGENT_PLOT_DATA_DIR.trim())
    : path.resolve(process.cwd(), "data");
  return path.join(dataDir, "agent-plot.db");
}

export function createDatabase(url = DB_URL ?? defaultDatabasePath()) {
  const sqlite = new Database(url);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  return drizzle(sqlite, { schema });
}

export type Database = ReturnType<typeof createDatabase>;

export {
  type Session,
  type NewSession,
  type ChatMessage,
  type NewChatMessage,
  type Activity,
  type NewActivity,
  type Artifact,
  type NewArtifact,
  type Job,
  type NewJob,
  type Setting,
  type NewSetting,
} from "./schema.js";

export { schema };
