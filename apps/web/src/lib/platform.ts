export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}
