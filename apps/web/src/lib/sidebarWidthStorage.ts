export function readSidebarWidth(storageKey: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }
  const width = Number.parseFloat(raw);
  return Number.isFinite(width) && width > 0 ? width : null;
}

export function writeSidebarWidth(storageKey: string, width: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey, String(width));
}
