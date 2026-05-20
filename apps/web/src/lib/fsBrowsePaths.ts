const LAST_BROWSE_PATH_KEY = "agent-plot:last-browse-path";

export function loadLastBrowsePath(): string {
  try {
    return sessionStorage.getItem(LAST_BROWSE_PATH_KEY) ?? "~";
  } catch {
    return "~";
  }
}

export function saveLastBrowsePath(partialPath: string) {
  try {
    sessionStorage.setItem(LAST_BROWSE_PATH_KEY, partialPath);
  } catch {
    /* ignore */
  }
}

/** Path sent to server to list a directory (trailing separator). */
export function directoryBrowseQuery(dirPath: string): string {
  const trimmed = dirPath.trim();
  if (!trimmed || trimmed === "~") return "~/";
  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) return trimmed;
  return `${trimmed}/`;
}

export function parentDirectoryPath(dirPath: string): string {
  const normalized = directoryBrowseQuery(dirPath).replace(/[/\\]+$/, "");
  const idx = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (idx <= 0) return "~/";
  const parent = normalized.slice(0, idx);
  return parent.length ? `${parent}/` : "~/";
}
