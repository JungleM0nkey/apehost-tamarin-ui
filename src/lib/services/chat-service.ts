/**
 * Chat Service
 * Chat orchestration service with message history management and context windowing
 */

import type { Message } from "@/lib/schemas/api";

/**
 * Approximate token count for a string
 * Uses rough estimate of 4 characters per token
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total tokens for a conversation
 */
export function calculateConversationTokens(messages: Message[]): number {
  return messages.reduce((total, msg) => {
    // Add overhead for message structure (~4 tokens per message)
    return total + estimateTokenCount(msg.content) + 4;
  }, 0);
}

/**
 * Context windowing strategies
 */
export type WindowingStrategy =
  | "truncate-oldest" // Remove oldest messages first
  | "truncate-middle" // Keep system + recent, remove middle
  | "summarize"; // Summarize older messages (requires LLM call)

export interface ContextWindowOptions {
  /** Maximum tokens allowed in context */
  maxTokens: number;
  /** Strategy for reducing context */
  strategy: WindowingStrategy;
  /** Minimum messages to keep (excluding system) */
  minMessages?: number;
  /** Always keep system message */
  keepSystemMessage?: boolean;
}

const DEFAULT_OPTIONS: ContextWindowOptions = {
  maxTokens: 4096,
  strategy: "truncate-oldest",
  minMessages: 2,
  keepSystemMessage: true,
};

/**
 * Apply context windowing to fit messages within token limit
 */
export function applyContextWindow(
  messages: Message[],
  options: Partial<ContextWindowOptions> = {}
): Message[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { maxTokens, strategy, minMessages = 2, keepSystemMessage = true } = opts;

  // Calculate current token count
  let currentTokens = calculateConversationTokens(messages);

  // If we're under the limit, return as-is
  if (currentTokens <= maxTokens) {
    return messages;
  }

  // Separate system message if needed
  const systemMessage = keepSystemMessage && messages[0]?.role === "system"
    ? messages[0]
    : null;
  
  let workingMessages = systemMessage
    ? messages.slice(1)
    : [...messages];

  switch (strategy) {
    case "truncate-oldest":
      return truncateOldest(systemMessage, workingMessages, maxTokens, minMessages);

    case "truncate-middle":
      return truncateMiddle(systemMessage, workingMessages, maxTokens, minMessages);

    case "summarize":
      // For now, fall back to truncate-oldest
      // Full summarization would require async LLM call
      return truncateOldest(systemMessage, workingMessages, maxTokens, minMessages);

    default:
      return truncateOldest(systemMessage, workingMessages, maxTokens, minMessages);
  }
}

/**
 * Truncate oldest messages first
 */
function truncateOldest(
  systemMessage: Message | null,
  messages: Message[],
  maxTokens: number,
  minMessages: number
): Message[] {
  const result: Message[] = [];
  
  // Reserve tokens for system message
  let availableTokens = maxTokens;
  if (systemMessage) {
    availableTokens -= estimateTokenCount(systemMessage.content) + 4;
  }

  // Add messages from newest to oldest until we hit the limit
  const reversed = [...messages].reverse();
  
  for (const msg of reversed) {
    const msgTokens = estimateTokenCount(msg.content) + 4;
    
    if (availableTokens - msgTokens >= 0 || result.length < minMessages) {
      result.unshift(msg);
      availableTokens -= msgTokens;
    } else {
      break;
    }
  }

  // Add system message back at the beginning
  if (systemMessage) {
    result.unshift(systemMessage);
  }

  return result;
}

/**
 * Truncate middle messages, keeping recent context
 */
function truncateMiddle(
  systemMessage: Message | null,
  messages: Message[],
  maxTokens: number,
  minMessages: number
): Message[] {
  if (messages.length <= minMessages * 2) {
    return truncateOldest(systemMessage, messages, maxTokens, minMessages);
  }

  // Reserve tokens for system message
  let availableTokens = maxTokens;
  if (systemMessage) {
    availableTokens -= estimateTokenCount(systemMessage.content) + 4;
  }

  // Keep first few and last few messages
  const keepFirst = Math.floor(minMessages / 2) || 1;
  const keepLast = minMessages - keepFirst;

  const firstMessages = messages.slice(0, keepFirst);
  const lastMessages = messages.slice(-keepLast);

  // Calculate tokens for kept messages
  const keptTokens = [...firstMessages, ...lastMessages].reduce(
    (sum, msg) => sum + estimateTokenCount(msg.content) + 4,
    0
  );

  // If kept messages already exceed limit, fall back to truncate-oldest
  if (keptTokens > availableTokens) {
    return truncateOldest(systemMessage, messages, maxTokens, minMessages);
  }

  // Add a marker for truncated content
  const truncatedMarker: Message = {
    role: "system",
    content: `[${messages.length - keepFirst - keepLast} messages truncated for context window]`,
  };

  const result = [...firstMessages, truncatedMarker, ...lastMessages];

  if (systemMessage) {
    result.unshift(systemMessage);
  }

  return result;
}

/**
 * Prepare messages for API request with context windowing
 */
export function prepareMessagesForRequest(
  systemPrompt: string,
  conversationMessages: Message[],
  maxTokens: number = 4096
): Message[] {
  // Build full message list with system prompt
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...conversationMessages,
  ];

  // Apply context windowing
  return applyContextWindow(messages, {
    maxTokens,
    strategy: "truncate-oldest",
    keepSystemMessage: true,
  });
}

/**
 * Format conversation for display/export
 */
export function formatConversation(messages: Message[]): string {
  return messages
    .map((msg) => {
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");
}

/**
 * Extract title from first user message
 */
export function generateTitle(messages: Message[], maxLength: number = 50): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) {
    return "New Chat";
  }

  const content = firstUserMessage.content.trim();
  if (content.length <= maxLength) {
    return content;
  }

  return content.slice(0, maxLength - 3) + "...";
}