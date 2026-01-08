"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, User, Bot, Wrench } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/store/chat-store";
import { ToolResultList } from "./tool-result";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const getTextContent = (node: React.ReactNode): string => {
      if (typeof node === "string") return node;
      if (typeof node === "number") return String(node);
      if (Array.isArray(node)) return node.map(getTextContent).join("");
      if (node && typeof node === "object" && "props" in node) {
        return getTextContent((node as { props: { children?: React.ReactNode } }).props?.children);
      }
      return "";
    };
    const code = getTextContent(children);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className={cn("overflow-x-auto rounded-lg p-4 bg-[#1a1a1a] border border-[#332211]", className)}>
        <code>{children}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-[#262626] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#332211] border border-[#664422]"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-[#cc9944]" />
        )}
      </button>
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isAssistant = message.role === "assistant";

  // Don't render tool messages as standalone bubbles - they're shown with assistant messages
  if (isTool) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-6",
        isUser ? "bg-transparent" : "bg-[#1a1a1a]/50"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-[#262626] border border-[#664422]"
            : "bg-gradient-to-br from-[#ffaa00] to-[#cc7700] ape-glow"
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-[#cc9944]" />
        ) : (
          <Bot className="w-5 h-5 text-[#0d0d0d]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[#99774f] mb-1">
          {isUser ? "You" : "Assistant"}
        </div>
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[#ffaa00] prose-a:text-[#ffaa00] prose-strong:text-[#ffddaa]">
          {isUser ? (
            <p className="whitespace-pre-wrap text-[#ffddaa]">
              {message.content}
            </p>
          ) : (
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => <>{children}</>,
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;

                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded bg-[#262626] text-[#ffaa00] text-sm border border-[#332211]"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return <CodeBlock className={className}>{children}</CodeBlock>;
                },
              }}
            >
              {message.content || " "}
            </ReactMarkdown>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-[#ffaa00] animate-pulse ml-0.5" />
          )}
        </div>

        {/* Display tool results if present */}
        {isAssistant && message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-4">
            <ToolResultList results={message.toolResults} />
          </div>
        )}

        {/* Show tool call indicator if assistant made tool calls */}
        {isAssistant && message.tool_calls && message.tool_calls.length > 0 && !message.toolResults && (
          <div className="mt-3 flex items-center gap-2 text-sm text-[#99774f]">
            <Wrench className="w-4 h-4 text-[#ffaa00]" />
            <span>Executing {message.tool_calls.length} tool{message.tool_calls.length > 1 ? 's' : ''}...</span>
          </div>
        )}
      </div>
    </div>
  );
});
