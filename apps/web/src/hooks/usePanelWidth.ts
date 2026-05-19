import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

export function usePanelWidth(storageKey: string, defaultPx: number, minPx: number, maxPx: number) {
  const [width, setWidth] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const n = raw ? Number.parseInt(raw, 10) : defaultPx;
      if (Number.isFinite(n)) return Math.min(maxPx, Math.max(minPx, n));
    } catch {
      /* ignore */
    }
    return defaultPx;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(width));
    } catch {
      /* ignore */
    }
  }, [storageKey, width]);

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: PointerEvent) => {
        const next = Math.min(maxPx, Math.max(minPx, startWidth + (ev.clientX - startX)));
        setWidth(next);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width, minPx, maxPx],
  );

  return { width, onResizePointerDown };
}
