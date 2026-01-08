/**
 * useStreamingChat Hook
 * React hook for consuming SSE chat streams from the API
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { Message } from "@/lib/schemas/api";

/**
 * Options for starting a streaming chat session
 */
export interface StreamingChatOptions {
  /** The server ID to send the request to */
  serverId: string;
  /** The model identifier to use for generation */
  model: string;
  /** Array of messages forming the conversation */
  messages: Message[];
  /** Temperature for response randomness (0-2, default: 0.7) */
  temperature?: number;
  /** Maximum tokens to generate (default: 2048) */
  maxTokens?: number;
  /** Top-p (nucleus) sampling parameter (0-1, default: 0.95) */
  topP?: number;
  /** Callback for each content chunk received */
  onChunk?: (content: string, fullContent: string) => void;
  /** Callback when streaming completes successfully */
  onComplete?: (fullContent: string) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * State returned by the streaming chat hook
 */
export interface StreamingChatState {
  /** Whether streaming is currently in progress */
  isStreaming: boolean;
  /** Accumulated content from the stream */
  content: string;
  /** Error if streaming failed */
  error: Error | null;
}

/**
 * Actions for controlling the streaming chat
 */
export interface StreamingChatActions {
  /** Start a new streaming chat session */
  startStreaming: (options: StreamingChatOptions) => Promise<void>;
  /** Stop the current streaming session */
  stopStreaming: () => void;
  /** Reset the state to initial values */
  reset: () => void;
}

/**
 * React hook for handling streaming chat responses via Server-Sent Events.
 * Provides state management and controls for SSE-based chat streaming.
 * 
 * @returns Combined state and action interface for streaming chat
 * 
 * @example
 * ```tsx
 * const { isStreaming, content, startStreaming, stopStreaming } = useStreamingChat();
 * 
 * const handleSend = async () => {
 *   await startStreaming({
 *     serverId: 'server-1',
 *     model: 'llama-3',
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *     onChunk: (chunk, full) => console.log('Received:', chunk),
 *   });
 * };
 * ```
 */
export function useStreamingChat(): StreamingChatState & StreamingChatActions {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stopStreaming();
    setContent("");
    setError(null);
  }, [stopStreaming]);

  const startStreaming = useCallback(
    async (options: StreamingChatOptions) => {
      const {
        serverId,
        model,
        messages,
        temperature = 0.7,
        maxTokens = 2048,
        topP = 0.95,
        onChunk,
        onComplete,
        onError,
      } = options;

      // Reset state
      setContent("");
      setError(null);
      setIsStreaming(true);

      // Create abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serverId,
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            stream: true,
          }),
          signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();

              // Parse SSE event
              if (trimmed.startsWith("event: ")) {
                const eventType = trimmed.slice(7);
                if (eventType === "error") {
                  // Next line should have error data
                  continue;
                }
              }

              if (trimmed.startsWith("data: ")) {
                const data = trimmed.slice(6);

                if (data === "[DONE]") {
                  onComplete?.(fullContent);
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }

                  if (parsed.content) {
                    fullContent += parsed.content;
                    setContent(fullContent);
                    onChunk?.(parsed.content, fullContent);
                  }
                } catch (parseError) {
                  // Skip invalid JSON, but re-throw if it's a real error
                  if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") {
                    if (data.includes("error")) {
                      console.error("Stream error:", parseError);
                    }
                  }
                }
              }
            }
          }

          // Final callback if we didn't get [DONE]
          if (fullContent) {
            onComplete?.(fullContent);
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled, not an error
          return;
        }

        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  return {
    isStreaming,
    content,
    error,
    startStreaming,
    stopStreaming,
    reset,
  };
}

/**
 * Fetch servers from API
 */
export async function fetchServers() {
  const response = await fetch("/api/servers");
  if (!response.ok) {
    throw new Error("Failed to fetch servers");
  }
  const data = await response.json();
  return data.servers;
}

/**
 * Fetch models for a specific server
 */
export async function fetchServerModels(serverId: string) {
  const response = await fetch(`/api/servers/${serverId}/models`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to fetch models");
  }
  const data = await response.json();
  return data.models;
}

/**
 * Check server health
 */
export async function checkServerHealth(serverId: string) {
  const response = await fetch(`/api/servers/${serverId}`);
  if (!response.ok) {
    throw new Error("Failed to check server health");
  }
  return response.json();
}