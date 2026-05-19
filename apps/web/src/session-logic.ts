import type { ActivityEntry, ChatMessage } from "./types.js";

export const MAX_VISIBLE_WORK_LOG_ENTRIES = 6;

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

export function formatElapsed(startIso: string, endIso: string | undefined): string | null {
  if (!endIso) return null;
  const startedAt = Date.parse(startIso);
  const endedAt = Date.parse(endIso);
  if (Number.isNaN(startedAt) || Number.isNaN(endedAt) || endedAt < startedAt) {
    return null;
  }
  return formatDuration(endedAt - startedAt);
}

export type MessagesTimelineRow =
  | {
      kind: "work";
      id: string;
      createdAt: string;
      groupedEntries: ActivityEntry[];
    }
  | {
      kind: "message";
      id: string;
      createdAt: string;
      message: ChatMessage;
      showCompletionDivider: boolean;
    }
  | { kind: "working"; id: string; createdAt: string | null };

/** Interleave work groups before user turns, then messages in order. */
export function deriveMessagesTimelineRows(input: {
  messages: ChatMessage[];
  activities: ActivityEntry[];
  isWorking: boolean;
}): MessagesTimelineRow[] {
  const rows: MessagesTimelineRow[] = [];
  const { messages, activities, isWorking } = input;

  let activityCursor = 0;

  const flushActivitiesBefore = (beforeCreatedAt: string) => {
    const group: ActivityEntry[] = [];
    while (activityCursor < activities.length) {
      const a = activities[activityCursor]!;
      if (a.createdAt >= beforeCreatedAt) break;
      group.push(a);
      activityCursor += 1;
    }
    if (group.length > 0) {
      rows.push({
        kind: "work",
        id: `work:${group[0]!.id}`,
        createdAt: group[0]!.createdAt,
        groupedEntries: group,
      });
    }
  };

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    if (message.role === "user") {
      flushActivitiesBefore(message.createdAt);
    }
    const next = messages[i + 1];
    const showCompletionDivider =
      message.role === "assistant" &&
      !message.streaming &&
      Boolean(next && next.role === "user");
    rows.push({
      kind: "message",
      id: message.id,
      createdAt: message.createdAt,
      message,
      showCompletionDivider,
    });
  }

  const remaining = activities.slice(activityCursor);
  if (remaining.length > 0) {
    rows.push({
      kind: "work",
      id: `work:${remaining[0]!.id}`,
      createdAt: remaining[0]!.createdAt,
      groupedEntries: remaining,
    });
  }

  if (isWorking) {
    const lastActivity = activities.at(-1);
    rows.push({
      kind: "working",
      id: "working",
      createdAt: lastActivity?.status === "running" ? lastActivity.createdAt : null,
    });
  }

  return rows;
}
