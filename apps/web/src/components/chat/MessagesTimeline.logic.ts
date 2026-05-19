import type { ActivityEntry, ChatMessage } from "@/types.js";

export const MAX_VISIBLE_WORK_LOG_ENTRIES = 6;

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
      durationStart: string;
      showCompletionDivider: boolean;
      completionSummary: string | null;
      showAssistantCopyButton: boolean;
      assistantCopyStreaming: boolean;
    }
  | { kind: "working"; id: string; createdAt: string | null };

export function computeMessageDurationStart(
  messages: ReadonlyArray<Pick<ChatMessage, "id" | "role" | "createdAt" | "completedAt">>,
): Map<string, string> {
  const result = new Map<string, string>();
  let lastBoundary: string | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      lastBoundary = message.createdAt;
    }
    result.set(message.id, lastBoundary ?? message.createdAt);
    if (message.role === "assistant" && message.completedAt) {
      lastBoundary = message.completedAt;
    }
  }

  return result;
}

export function deriveTerminalAssistantMessageIds(messages: ReadonlyArray<ChatMessage>): Set<string> {
  const terminalIds = new Set<string>();
  let lastAssistantId: string | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      if (lastAssistantId) {
        terminalIds.add(lastAssistantId);
      }
      lastAssistantId = null;
      continue;
    }
    if (message.role === "assistant") {
      lastAssistantId = message.id;
    }
  }

  if (lastAssistantId) {
    terminalIds.add(lastAssistantId);
  }

  return terminalIds;
}

export function resolveAssistantMessageCopyState({
  text,
  showCopyButton,
  streaming,
}: {
  text: string | null;
  showCopyButton: boolean;
  streaming: boolean;
}): { visible: boolean; text: string | null } {
  const hasText = text !== null && text.trim().length > 0;
  return {
    text: hasText ? text : null,
    visible: showCopyButton && hasText && !streaming,
  };
}

/** Interleave work groups before user turns, then messages in order. */
export function deriveMessagesTimelineRows(input: {
  messages: ChatMessage[];
  activities: ActivityEntry[];
  isWorking: boolean;
}): MessagesTimelineRow[] {
  const rows: MessagesTimelineRow[] = [];
  const { messages, activities, isWorking } = input;

  const durationStartByMessageId = computeMessageDurationStart(messages);
  const terminalAssistantMessageIds = deriveTerminalAssistantMessageIds(messages);

  let activityCursor = 0;

  const flushActivitiesBefore = (beforeCreatedAt: string) => {
    const group: ActivityEntry[] = [];
    while (activityCursor < activities.length) {
      const activity = activities[activityCursor]!;
      if (activity.createdAt >= beforeCreatedAt) break;
      group.push(activity);
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

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]!;
    if (message.role === "user") {
      flushActivitiesBefore(message.createdAt);
    }
    const next = messages[index + 1];
    const showCompletionDivider =
      message.role === "assistant" &&
      !message.streaming &&
      Boolean(next && next.role === "user");

    rows.push({
      kind: "message",
      id: message.id,
      createdAt: message.createdAt,
      message,
      durationStart: durationStartByMessageId.get(message.id) ?? message.createdAt,
      showCompletionDivider,
      completionSummary: null,
      showAssistantCopyButton:
        message.role === "assistant" && terminalAssistantMessageIds.has(message.id),
      assistantCopyStreaming: Boolean(message.streaming),
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
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    rows.push({
      kind: "working",
      id: "working-indicator-row",
      createdAt:
        lastActivity?.status === "running"
          ? lastActivity.createdAt
          : (lastAssistant?.createdAt ?? null),
    });
  }

  return rows;
}
