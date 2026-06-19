"use server";

import * as path from "node:path";
import { getDefaultStore } from "#lib/store";
import { runPythonScript } from "#lib/python";
import { EXAMPLES_DIR, PY_ANALYSIS_ROOT } from "#lib/python/paths";
import type { SessionContext } from "#lib/db/schema";

export async function ensureSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const store = getDefaultStore();
    const existing = await store.getSession(sessionId);
    if (!existing) {
      await store.createSessionWithId(sessionId);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function readSessionContext(sessionId: string): Promise<SessionContext | null> {
  const store = getDefaultStore();
  return store.readSessionContext(sessionId);
}

export async function writeSessionContext(
  sessionId: string,
  context: Partial<SessionContext>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const store = getDefaultStore();
    await store.updateSessionContext(sessionId, context);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function prepareTitanicExample(): Promise<{ ok: boolean; error?: string; folder?: string }> {
  try {
    const script = path.join(
      /* turbopackIgnore: true */
      process.cwd(),
      "examples",
      "titanic",
      "setup.py",
    );
    const result = await runPythonScript(EXAMPLES_DIR, script, [], 120_000);
    if (result.code !== 0) {
      return { ok: false, error: result.stderr || result.stdout || "unknown error" };
    }
    return { ok: true, folder: path.join(EXAMPLES_DIR, "titanic") };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function generateSampleData(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const store = getDefaultStore();
    const session = await store.getSession(sessionId);
    if (!session) {
      return { ok: false, error: "Session not found" };
    }
    const script = path.join(PY_ANALYSIS_ROOT, "scripts", "generate_sample_data.py");
    const result = await runPythonScript(session.dir, script, [session.dir], 120_000);
    if (result.code !== 0) {
      return { ok: false, error: result.stderr || result.stdout || "unknown error" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
