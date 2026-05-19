import type { ChatMessage } from "@/types.js";

export function UserTimelineRow({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-border bg-secondary px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
      </div>
    </div>
  );
}
