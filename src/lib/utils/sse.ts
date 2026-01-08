/**
 * Server-Sent Events Utilities
 * Helpers for encoding and streaming SSE responses
 */

/**
 * Encode data as an SSE message
 */
export function encodeSSE(
  data: unknown,
  event?: string,
  id?: string
): string {
  let message = "";

  if (id) {
    message += `id: ${id}\n`;
  }

  if (event) {
    message += `event: ${event}\n`;
  }

  const jsonData = typeof data === "string" ? data : JSON.stringify(data);
  message += `data: ${jsonData}\n\n`;

  return message;
}

/**
 * Encode a done signal for SSE
 */
export function encodeSSEDone(): string {
  return "data: [DONE]\n\n";
}

/**
 * Encode an error as an SSE message
 */
export function encodeSSEError(error: string, code?: string): string {
  return encodeSSE({ error, code }, "error");
}

/**
 * Create SSE response headers
 */
export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  };
}

/**
 * Create a streaming SSE response from an async generator
 */
export function createSSEResponse(
  generator: AsyncGenerator<string, void, unknown>,
  signal?: AbortSignal
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          if (signal?.aborted) {
            break;
          }

          // Send chunk as SSE data
          const sseMessage = encodeSSE({ content: chunk }, "chunk");
          controller.enqueue(encoder.encode(sseMessage));
        }

        // Send done signal
        controller.enqueue(encoder.encode(encodeSSEDone()));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(encodeSSEError(errorMessage, "STREAM_ERROR"))
        );
      } finally {
        controller.close();
      }
    },

    cancel() {
      // Stream was cancelled by client
    },
  });

  return new Response(stream, {
    headers: sseHeaders(),
  });
}

/**
 * SSE event types for chat streaming
 */
export const SSEEventTypes = {
  CHUNK: "chunk",
  DONE: "done",
  ERROR: "error",
  TOOL_CALL: "tool_call",
  TOOL_RESULT: "tool_result",
} as const;

export type SSEEventType = (typeof SSEEventTypes)[keyof typeof SSEEventTypes];