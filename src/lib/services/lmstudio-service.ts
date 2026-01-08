/**
 * LM Studio Service
 * Server-side LM Studio API client with retry logic and error handling
 */

import { ServerConfig } from "@/lib/config/servers";
import type { Message, Model, ChatRequest } from "@/lib/schemas/api";

export interface LMStudioError extends Error {
  code: string;
  status?: number;
}

function createLMStudioError(
  message: string,
  code: string,
  status?: number
): LMStudioError {
  const error = new Error(message) as LMStudioError;
  error.code = code;
  error.status = status;
  return error;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = ServerConfig.CHAT_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = ServerConfig.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof Error && "status" in error) {
        const status = (error as LMStudioError).status;
        if (status && status >= 400 && status < 500) {
          throw error;
        }
      }

      // Don't retry on abort
      if (error instanceof Error && error.name === "AbortError") {
        throw createLMStudioError("Request timed out", "TIMEOUT");
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay =
          ServerConfig.RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export class LMStudioService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Check if the server is reachable
   */
  async checkHealth(): Promise<{ isConnected: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();

    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/models`, {
        timeout: ServerConfig.HEALTH_CHECK_TIMEOUT_MS,
      });

      if (!response.ok) {
        return {
          isConnected: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        isConnected: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<Model[]> {
    return withRetry(async () => {
      const response = await fetchWithTimeout(`${this.baseUrl}/models`, {
        timeout: ServerConfig.MODELS_TIMEOUT_MS,
      });

      if (!response.ok) {
        throw createLMStudioError(
          `Failed to fetch models: ${response.statusText}`,
          "SERVER_ERROR",
          response.status
        );
      }

      const data = await response.json();
      return data.data || [];
    });
  }

  /**
   * Send a chat completion request (non-streaming)
   */
  async chat(request: Omit<ChatRequest, "serverId">): Promise<{
    content: string;
    finishReason: string | null;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    return withRetry(async () => {
      const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          stop: request.stop,
          stream: false,
        }),
        timeout: ServerConfig.CHAT_TIMEOUT_MS,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw createLMStudioError(
          `Chat completion failed: ${response.statusText}. ${errorBody}`,
          "CHAT_ERROR",
          response.status
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || "",
        finishReason: choice?.finish_reason || null,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    });
  }

  /**
   * Send a streaming chat completion request
   * Returns an async generator that yields content chunks
   */
  async *streamChat(
    request: Omit<ChatRequest, "serverId">,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        stop: request.stop,
        stream: true,
      }),
      timeout: ServerConfig.CHAT_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw createLMStudioError(
        `Chat completion failed: ${response.statusText}. ${errorBody}`,
        "CHAT_ERROR",
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw createLMStudioError("No response body", "NO_BODY");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        if (signal?.aborted) {
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Service instance cache by URL
const serviceCache = new Map<string, LMStudioService>();

/**
 * Get or create an LMStudioService instance for a given URL
 */
export function getLMStudioService(baseUrl: string): LMStudioService {
  const normalizedUrl = baseUrl.replace(/\/$/, "");

  if (!serviceCache.has(normalizedUrl)) {
    serviceCache.set(normalizedUrl, new LMStudioService(normalizedUrl));
  }

  return serviceCache.get(normalizedUrl)!;
}

/**
 * LMStudio Service Facade
 * Provides a unified interface for calling LMStudio servers by server ID
 */
export const lmstudioService = {
  /**
   * Send a chat completion request with optional tool support
   * Returns a Response object for streaming or non-streaming
   */
  async chatCompletion(
    serverId: string,
    request: {
      model: string;
      messages: Message[];
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      tools?: unknown[];
      stream?: boolean;
    }
  ): Promise<Response> {
    // Get server URL - import dynamically to avoid circular dependency
    const { getServerById } = await import("./server-manager");
    const server = getServerById(serverId);
    
    if (!server) {
      throw createLMStudioError(`Server not found: ${serverId}`, "SERVER_NOT_FOUND", 404);
    }
    
    // Make the request directly and return the Response
    const response = await fetchWithTimeout(`${server.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2048,
        top_p: request.top_p ?? 0.95,
        tools: request.tools,
        stream: request.stream ?? true,
      }),
      timeout: ServerConfig.CHAT_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw createLMStudioError(
        `Chat completion failed: ${response.statusText}. ${errorBody}`,
        "CHAT_ERROR",
        response.status
      );
    }

    return response;
  },
};