import { mkdir, readFile, writeFile, copyFile, readdir } from "node:fs/promises";
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
