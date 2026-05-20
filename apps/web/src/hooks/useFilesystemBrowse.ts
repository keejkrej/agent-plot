import type { FilesystemBrowseResult } from "@agent-plot/contracts";
import { useCallback } from "react";

const BROWSE_TIMEOUT_MS = 15_000;

export type BrowseFilesystemFn = (partialPath: string) => Promise<FilesystemBrowseResult>;

export function createBrowseFilesystem(
  sendRequest: (payload: object) => Promise<FilesystemBrowseResult>,
): BrowseFilesystemFn {
  return (partialPath: string) =>
    sendRequest({ type: "fs.browse", partialPath });
}

/** Hook wrapper when sendRequest is already bound to session WS. */
export function useFilesystemBrowse(sendRequest: BrowseFilesystemFn | null) {
  const browse = useCallback(
    async (partialPath: string) => {
      if (!sendRequest) {
        throw new Error("Not connected");
      }
      return sendRequest(partialPath);
    },
    [sendRequest],
  );

  return { browse };
}

export { BROWSE_TIMEOUT_MS };
