import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type ChatMarkdownProps = {
  text: string;
  isStreaming?: boolean;
  className?: string;
};

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc ps-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal ps-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      className="text-primary underline-offset-2 hover:underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={cn("block font-mono text-xs", className)}>{children}</code>;
    }
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
    );
  },
  pre: ({ children }) => {
    const code = String(children ?? "").trim();
    if (!code) {
      return null;
    }
    return (
      <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 last:mb-0">
        {children}
      </pre>
    );
  },
  h1: ({ children }) => <h1 className="mb-2 font-semibold text-lg">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 font-semibold text-base">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 font-medium text-sm">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-muted-foreground/30 border-s-2 ps-3 text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
};

export default function ChatMarkdown({ text, isStreaming, className }: ChatMarkdownProps) {
  if (!text.trim()) {
    return null;
  }
  return (
    <div
      className={cn(
        "chat-markdown w-full min-w-0 text-sm leading-relaxed text-foreground/80",
        className,
      )}
    >
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
      {isStreaming ? (
        <span className="ms-0.5 inline-block animate-pulse text-muted-foreground">▍</span>
      ) : null}
    </div>
  );
}
