export {
  deriveMessagesTimelineRows,
  MAX_VISIBLE_WORK_LOG_ENTRIES,
  type MessagesTimelineRow,
} from "@/session-logic.js";

export function resolveAssistantMessageCopyState(input: {
  text: string;
  streaming?: boolean;
}): { visible: boolean; text: string } {
  const trimmed = input.text.trim();
  if (input.streaming || trimmed.length === 0) {
    return { visible: false, text: trimmed };
  }
  return { visible: true, text: trimmed };
}
