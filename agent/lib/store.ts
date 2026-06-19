import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { AGENT_PLOT_HOME, DATA_DIR, SESSIONS_ROOT_PATH } from "#lib/python/paths";
import type {
  ActivitySnapshot,
  ChatMessageRole,
  ChatMessageSnapshot,
  PathAttachment,
  SessionChatHistory,
} from "#lib/contracts";
import { and, eq, isNull, not, sql } from "drizzle-orm";
import * as schema from "#lib/db/schema";
import { createDatabase, type Database, type NewActivity, type NewChatMessage, type SessionContext } from "#lib/db";

function sessionsDir(): string {
  return SESSIONS_ROOT_PATH;
}

export function sessionDir(id: string): string {
  return path.join(sessionsDir(), id);
}

function ensureSessionDir(id: string): void {
  fs.mkdirSync(path.join(sessionDir(id), "artifacts"), { recursive: true });
}

const DEFAULT_CONTEXT_PATH = path.join(AGENT_PLOT_HOME, "default-context.json");

function readDefaultContextFile(): SessionContext {
  try {
    const raw = fs.readFileSync(DEFAULT_CONTEXT_PATH, "utf8");
    return JSON.parse(raw) as SessionContext;
  } catch {
    return {};
  }
}

function writeDefaultContextFile(context: SessionContext): void {
  fs.mkdirSync(path.dirname(DEFAULT_CONTEXT_PATH), { recursive: true });
  fs.writeFileSync(DEFAULT_CONTEXT_PATH, JSON.stringify(context, null, 2));
}

export type CanvasVisibility = {
  table: boolean;
  metrics: boolean;
  bar: boolean;
  hist: boolean;
};

function defaultCanvasVisibility(): CanvasVisibility {
  return { table: true, metrics: true, bar: true, hist: true };
}

export type SessionListEntry = {
  id: string;
  title: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type Session = {
  id: string;
  dir: string;
};

function sessionTitle(id: string, title?: string | null): string {
  return title?.trim() || `Session ${id.slice(0, 8)}`;
}

export class SessionStore {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? createDatabase();
  }

  async listSessions(options?: { archived?: boolean }): Promise<SessionListEntry[]> {
    const wantArchived = options?.archived === true;
    const rows = await this.db.query.sessions.findMany({
      where: wantArchived ? not(isNull(schema.sessions.archivedAt)) : isNull(schema.sessions.archivedAt),
      orderBy: [sql`${schema.sessions.updatedAt} desc`],
    });
    return rows.map((row) => ({
      id: row.id,
      title: sessionTitle(row.id, row.title),
      updatedAt: row.updatedAt.toISOString(),
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    }));
  }

  async createSession(): Promise<Session> {
    return this.createSessionWithId(randomUUID());
  }

  async createSessionWithId(id: string): Promise<Session> {
    const dir = sessionDir(id);
    ensureSessionDir(id);

    const starterCanvasPath = path.join(process.cwd(), "templates", "starter-canvas.json");
    const destCanvasPath = path.join(dir, "canvas.json");
    if (fs.existsSync(starterCanvasPath) && !fs.existsSync(destCanvasPath)) {
      fs.copyFileSync(starterCanvasPath, destCanvasPath);
    } else if (!fs.existsSync(destCanvasPath)) {
      fs.writeFileSync(destCanvasPath, JSON.stringify({ version: "1", root: { type: "container" } }));
    }

    await this.db.insert(schema.sessions).values({
      id,
      title: "",
      dir,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id, dir };
  }

  async getSession(id: string): Promise<Session | null> {
    const row = await this.db.query.sessions.findFirst({
      where: eq(schema.sessions.id, id),
    });
    if (!row) return null;
    return { id: row.id, dir: row.dir };
  }

  async readSessionContext(sessionId: string): Promise<SessionContext | null> {
    const row = await this.db.query.sessions.findFirst({
      where: eq(schema.sessions.id, sessionId),
      columns: { context: true },
    });
    if (!row) return null;
    return (row.context ?? {}) as SessionContext;
  }

  async updateSessionContext(sessionId: string, context: Partial<SessionContext>): Promise<void> {
    const existing = await this.readSessionContext(sessionId);
    const next: SessionContext = { ...existing, ...context };
    await this.db
      .update(schema.sessions)
      .set({ context: next, updatedAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));
  }

  async readDefaultSessionContext(): Promise<SessionContext> {
    return readDefaultContextFile();
  }

  async updateDefaultSessionContext(context: Partial<SessionContext>): Promise<void> {
    const existing = readDefaultContextFile();
    const next: SessionContext = { ...existing, ...context };
    writeDefaultContextFile(next);
  }

  async getChatMessage(sessionId: string, messageId: string): Promise<ChatMessageSnapshot | null> {
    const row = await this.db.query.chatMessages.findFirst({
      where: and(eq(schema.chatMessages.sessionId, sessionId), eq(schema.chatMessages.id, messageId)),
    });
    if (!row) return null;
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const snapshot: ChatMessageSnapshot = {
      id: row.id,
      role: row.role as ChatMessageRole,
      text: row.content,
      createdAt: new Date(row.createdAt).toISOString(),
    };
    if (metadata.streaming === true) snapshot.streaming = true;
    if (typeof metadata.completedAt === "string") snapshot.completedAt = metadata.completedAt;
    if (Array.isArray(metadata.pathAttachments)) snapshot.pathAttachments = metadata.pathAttachments as PathAttachment[];
    return snapshot;
  }

  async sessionExists(id: string): Promise<boolean> {
    const row = await this.db.query.sessions.findFirst({
      where: eq(schema.sessions.id, id),
      columns: { id: true },
    });
    return row != null;
  }

  async archiveSession(id: string): Promise<Session | null> {
    const session = await this.getSession(id);
    if (!session) return null;
    await this.db
      .update(schema.sessions)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.sessions.id, id));
    return session;
  }

  async unarchiveSession(id: string): Promise<Session | null> {
    const session = await this.getSession(id);
    if (!session) return null;
    await this.db
      .update(schema.sessions)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(schema.sessions.id, id));
    return session;
  }

  async readChatHistory(sessionId: string): Promise<SessionChatHistory> {
    const [messages, activities] = await Promise.all([
      this.db.query.chatMessages.findMany({
        where: eq(schema.chatMessages.sessionId, sessionId),
        orderBy: [schema.chatMessages.createdAt],
      }),
      this.db.query.activities.findMany({
        where: eq(schema.activities.sessionId, sessionId),
        orderBy: [schema.activities.createdAt],
      }),
    ]);

    return {
      messages: messages.map(
        (m): ChatMessageSnapshot => ({
          id: m.id,
          role: m.role as ChatMessageRole,
          text: m.content,
          createdAt: new Date(m.createdAt).toISOString(),
          ...(m.metadata ? (m.metadata as Record<string, unknown>) : {}),
        }),
      ),
      activities: activities.map(
        (a): ActivitySnapshot => ({
          id: a.id,
          label: a.label,
          ...(a.detail ? { detail: a.detail } : {}),
          status: a.status as ActivitySnapshot["status"],
          createdAt: new Date(a.createdAt).toISOString(),
        }),
      ),
    };
  }

  async addChatMessage(
    sessionId: string,
    message: Omit<ChatMessageSnapshot, "id">,
  ): Promise<ChatMessageSnapshot> {
    const id = randomUUID();
    const metadata: Record<string, unknown> = {};
    if (message.streaming === true) metadata.streaming = true;
    if (typeof message.completedAt === "string") metadata.completedAt = message.completedAt;
    if (message.pathAttachments && message.pathAttachments.length > 0) metadata.pathAttachments = message.pathAttachments;

    const dbMessage: NewChatMessage = {
      id,
      sessionId,
      role: message.role,
      content: message.text,
      createdAt: new Date(message.createdAt),
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    };

    await this.db.insert(schema.chatMessages).values(dbMessage);

    await this.touchSession(sessionId);

    const snapshot: ChatMessageSnapshot = {
      id,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
    };
    if (message.streaming === true) snapshot.streaming = true;
    if (typeof message.completedAt === "string") snapshot.completedAt = message.completedAt;
    if (message.pathAttachments && message.pathAttachments.length > 0) snapshot.pathAttachments = message.pathAttachments;
    return snapshot;
  }

  async saveChatMessage(sessionId: string, message: ChatMessageSnapshot): Promise<void> {
    const metadata: Record<string, unknown> = {};
    if (message.streaming === true) metadata.streaming = true;
    if (typeof message.completedAt === "string") metadata.completedAt = message.completedAt;
    if (message.pathAttachments && message.pathAttachments.length > 0) metadata.pathAttachments = message.pathAttachments;

    const dbMessage: NewChatMessage = {
      id: message.id,
      sessionId,
      role: message.role,
      content: message.text,
      createdAt: new Date(message.createdAt),
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    };

    await this.db
      .insert(schema.chatMessages)
      .values(dbMessage)
      .onConflictDoUpdate({
        target: schema.chatMessages.id,
        set: {
          role: dbMessage.role,
          content: dbMessage.content,
          metadata: dbMessage.metadata,
        },
      });

    await this.touchSession(sessionId);
  }

  async addActivity(sessionId: string, activity: Omit<ActivitySnapshot, "id">): Promise<ActivitySnapshot> {
    const id = randomUUID();
    const dbActivity: NewActivity = {
      id,
      sessionId,
      label: activity.label,
      detail: activity.detail ?? null,
      status: activity.status,
      createdAt: new Date(activity.createdAt),
      endedAt: null,
    };
    await this.db.insert(schema.activities).values(dbActivity);
    await this.touchSession(sessionId);
    const snapshot: ActivitySnapshot = {
      id,
      label: activity.label,
      status: activity.status,
      createdAt: activity.createdAt,
    };
    if (typeof activity.detail === "string") snapshot.detail = activity.detail;
    return snapshot;
  }

  async endActivity(
    sessionId: string,
    activityId: string,
    opts?: { detail?: string; status?: "done" | "error" },
  ): Promise<void> {
    await this.db
      .update(schema.activities)
      .set({
        status: opts?.status ?? "done",
        detail: opts?.detail ?? null,
        endedAt: new Date(),
      })
      .where(and(eq(schema.activities.id, activityId), eq(schema.activities.sessionId, sessionId)));
    await this.touchSession(sessionId);
  }

  async saveUpload(sessionId: string, buffer: Uint8Array, originalName: string): Promise<string> {
    const ext = path.extname(originalName).toLowerCase();
    const safe = ext === ".tif" || ext === ".tiff" ? ext : ".tif";
    const filePath = path.join(sessionDir(sessionId), `input${safe}`);
    fs.mkdirSync(sessionDir(sessionId), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  readCanvasTemplate(sessionId: string): string {
    const filePath = path.join(sessionDir(sessionId), "canvas.json");
    return fs.readFileSync(filePath, "utf8");
  }

  writeCanvasTemplate(sessionId: string, json: string): void {
    const filePath = path.join(sessionDir(sessionId), "canvas.json");
    fs.writeFileSync(filePath, json);
  }

  readCanvasVisibility(sessionId: string): CanvasVisibility {
    const filePath = path.join(sessionDir(sessionId), "canvas-prefs.json");
    try {
      return { ...defaultCanvasVisibility(), ...(JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<CanvasVisibility>) };
    } catch {
      return defaultCanvasVisibility();
    }
  }

  writeCanvasVisibility(sessionId: string, visibility: CanvasVisibility): void {
    const filePath = path.join(sessionDir(sessionId), "canvas-prefs.json");
    fs.writeFileSync(filePath, JSON.stringify(visibility, null, 2));
  }

  sessionArtifactsReady(sessionId: string): boolean {
    return fs.existsSync(path.join(sessionDir(sessionId), "artifacts", "stats.csv"));
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.db
      .update(schema.sessions)
      .set({ updatedAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));
  }

  async recordArtifact(
    sessionId: string,
    artifact: { name: string; mimeType: string; size: number; path: string },
  ): Promise<void> {
    const id = randomUUID();
    await this.db.insert(schema.artifacts).values({
      id,
      sessionId,
      name: artifact.name,
      mimeType: artifact.mimeType,
      size: artifact.size,
      path: artifact.path,
      createdAt: new Date(),
    });
  }

  getArtifactPath(sessionId: string, rel: string): string {
    const artifactsRoot = path.join(sessionDir(sessionId), "artifacts");
    const abs = path.join(artifactsRoot, rel);
    if (!abs.startsWith(artifactsRoot)) {
      throw new Error("bad artifact path");
    }
    return abs;
  }
}

let defaultStore: SessionStore | null = null;

export function getDefaultStore(): SessionStore {
  if (!defaultStore) {
    defaultStore = new SessionStore();
  }
  return defaultStore;
}

export function resetDefaultStoreForTests(): void {
  defaultStore = null;
}

export function pathAttachmentsFromEntries(entries?: PathAttachment[]): PathAttachment[] | undefined {
  if (!entries || entries.length === 0) return undefined;
  return entries;
}
