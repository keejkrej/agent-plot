import * as path from "node:path";
import * as fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { AGENT_PLOT_HOME } from "#lib/python/paths";
import * as schema from "./schema";

const DB_URL = process.env.AGENT_PLOT_DATABASE_URL?.trim();

function defaultDatabasePath(): string {
  return path.join(AGENT_PLOT_HOME, "agent-plot.db");
}

export function createDatabase(url = DB_URL ?? defaultDatabasePath()) {
  const parent = path.dirname(url);
  fs.mkdirSync(parent, { recursive: true });
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
  type SessionContext,
} from "./schema.js";

export { schema };
