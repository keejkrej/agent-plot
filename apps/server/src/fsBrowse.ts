import { readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FilesystemBrowseEntry, FilesystemBrowseResult } from "@agent-plot/contracts";

function expandHome(inputPath: string): string {
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function resolveBrowseTarget(partialPath: string): string {
  const trimmed = partialPath.trim();
  if (!trimmed) {
    return os.homedir();
  }
  const expanded = expandHome(trimmed);
  if (path.isAbsolute(expanded)) {
    return path.resolve(expanded);
  }
  return path.resolve(process.cwd(), expanded);
}

export async function browseFilesystem(partialPath: string): Promise<FilesystemBrowseResult> {
  const resolvedInputPath = resolveBrowseTarget(partialPath);
  const endsWithSeparator =
    /[\\/]$/.test(partialPath.trim()) || partialPath.trim() === "~" || partialPath.trim() === "~/";
  const parentPath = endsWithSeparator
    ? resolvedInputPath
    : path.dirname(resolvedInputPath);
  const prefix = endsWithSeparator ? "" : path.basename(resolvedInputPath);

  let dirents;
  try {
    dirents = await readdir(parentPath, { withFileTypes: true });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Unable to browse '${parentPath}': ${detail}`);
  }

  const showHidden = endsWithSeparator || prefix.startsWith(".");
  const lowerPrefix = prefix.toLowerCase();

  const entries: FilesystemBrowseEntry[] = [];

  for (const dirent of dirents) {
    if (!dirent.name || dirent.name === "." || dirent.name === "..") continue;
    if (!showHidden && dirent.name.startsWith(".")) continue;

    const isDirectory = dirent.isDirectory();
    const isFile = dirent.isFile();
    if (!isDirectory && !isFile) continue;

    if (prefix && !dirent.name.toLowerCase().startsWith(lowerPrefix)) continue;

    entries.push({
      name: dirent.name,
      fullPath: path.join(parentPath, dirent.name),
      kind: isDirectory ? "directory" : "file",
    });
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return { parentPath, entries };
}

export function parentBrowsePath(currentPath: string): string {
  const resolved = resolveBrowseTarget(currentPath.endsWith("/") ? currentPath : `${currentPath}/`);
  const parent = path.dirname(resolved);
  const withSep = parent.endsWith(path.sep) ? parent : `${parent}${path.sep}`;
  return withSep;
}
