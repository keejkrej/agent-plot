import { mkdir, readFile, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  defaultCanvasVisibility,
  type CanvasVisibility,
} from "./canvasIntent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type Session = {
  id: string;
  dir: string;
};

const REPO_ROOT = path.resolve(__dirname, "../../../");
const ROOT = path.join(REPO_ROOT, "data", "sessions");

export function sessionsRoot() {
  return ROOT;
}

export async function createSession(): Promise<Session> {
  const id = randomUUID();
  const dir = path.join(ROOT, id);
  await mkdir(path.join(dir, "artifacts"), { recursive: true });
  const starter = path.join(__dirname, "starter-canvas.json");
  const canvasDest = path.join(dir, "canvas.json");
  await copyFile(starter, canvasDest);
  return { id, dir };
}

export async function getSession(id: string): Promise<Session | null> {
  const dir = path.join(ROOT, id);
  try {
    await readdir(dir);
    return { id, dir };
  } catch {
    return null;
  }
}

export type SessionMeta = {
  title?: string;
  archivedAt: string | null;
};

const META_FILE = "session-meta.json";

export async function readSessionMeta(session: Session): Promise<SessionMeta> {
  try {
    const raw = await readFile(path.join(session.dir, META_FILE), "utf-8");
    const parsed = JSON.parse(raw) as Partial<SessionMeta>;
    return {
      archivedAt: typeof parsed.archivedAt === "string" ? parsed.archivedAt : null,
      ...(typeof parsed.title === "string" ? { title: parsed.title } : {}),
    };
  } catch {
    return { archivedAt: null };
  }
}

export async function writeSessionMeta(session: Session, meta: SessionMeta): Promise<void> {
  await writeFile(path.join(session.dir, META_FILE), JSON.stringify(meta, null, 2), "utf-8");
}

function sessionTitle(id: string, meta: SessionMeta): string {
  return meta.title?.trim() || `Session ${id.slice(0, 8)}`;
}

export type SessionListEntry = {
  id: string;
  title: string;
  updatedAt: string;
  archivedAt: string | null;
};

export async function listSessions(options?: { archived?: boolean }): Promise<SessionListEntry[]> {
  const wantArchived = options?.archived === true;
  try {
    const names = await readdir(ROOT);
    const entries: SessionListEntry[] = [];
    for (const id of names) {
      const session = await getSession(id);
      if (!session) continue;
      const meta = await readSessionMeta(session);
      const isArchived = meta.archivedAt !== null;
      if (isArchived !== wantArchived) continue;

      let updatedAt = meta.archivedAt ?? new Date(0).toISOString();
      try {
        const st = await stat(session.dir);
        updatedAt = isArchived ? (meta.archivedAt ?? st.mtime.toISOString()) : st.mtime.toISOString();
      } catch {
        /* ignore */
      }
      entries.push({
        id,
        title: sessionTitle(id, meta),
        updatedAt,
        archivedAt: meta.archivedAt,
      });
    }
    entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return entries;
  } catch {
    return [];
  }
}

export async function archiveSession(id: string): Promise<Session | null> {
  const session = await getSession(id);
  if (!session) return null;
  const meta = await readSessionMeta(session);
  if (meta.archivedAt) return session;
  await writeSessionMeta(session, { ...meta, archivedAt: new Date().toISOString() });
  return session;
}

export async function unarchiveSession(id: string): Promise<Session | null> {
  const session = await getSession(id);
  if (!session) return null;
  const meta = await readSessionMeta(session);
  if (!meta.archivedAt) return session;
  await writeSessionMeta(session, { ...meta, archivedAt: null });
  return session;
}

export async function saveUpload(session: Session, buffer: Buffer, originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  const safe = ext === ".tif" || ext === ".tiff" ? ext : ".tif";
  const dest = path.join(session.dir, `input${safe}`);
  await writeFile(dest, buffer);
}

export async function readCanvasTemplate(session: Session): Promise<string> {
  return readFile(path.join(session.dir, "canvas.json"), "utf-8");
}

export async function writeCanvasTemplate(session: Session, json: string) {
  await writeFile(path.join(session.dir, "canvas.json"), json, "utf-8");
}

const PREFS_FILE = "canvas-prefs.json";

export async function readCanvasVisibility(session: Session): Promise<CanvasVisibility> {
  try {
    const raw = await readFile(path.join(session.dir, PREFS_FILE), "utf-8");
    return { ...defaultCanvasVisibility(), ...(JSON.parse(raw) as CanvasVisibility) };
  } catch {
    return defaultCanvasVisibility();
  }
}

export async function writeCanvasVisibility(session: Session, vis: CanvasVisibility) {
  await writeFile(path.join(session.dir, PREFS_FILE), JSON.stringify(vis, null, 2));
}

const CURSOR_AGENT_FILE = "cursor-agent.json";

export async function readSessionAgentId(session: Session): Promise<string | null> {
  try {
    const raw = await readFile(path.join(session.dir, CURSOR_AGENT_FILE), "utf-8");
    const parsed = JSON.parse(raw) as { agentId?: string };
    return typeof parsed.agentId === "string" ? parsed.agentId : null;
  } catch {
    return null;
  }
}

export async function writeSessionAgentId(session: Session, agentId: string) {
  await writeFile(
    path.join(session.dir, CURSOR_AGENT_FILE),
    JSON.stringify({ agentId }, null, 2),
  );
}
