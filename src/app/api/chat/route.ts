/**
 * Chat API Route
 * POST - Send chat completion request with optional streaming and tool support
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerById } from "@/lib/services/server-manager";
import { getLMStudioService } from "@/lib/services/lmstudio-service";
import {
  ChatRequestSchema,
  createApiError,
  ErrorCodes,
} from "@/lib/schemas/api";
import {
  encodeSSE,
  encodeSSEDone,
  encodeSSEError,
  sseHeaders,
} from "@/lib/utils/sse";
import { initializeTools, toolRegistry } from "@/lib/tools";
import { executeToolCalls, hasToolCalls, extractToolCalls } from "@/lib/services/tool-executor";
import { createToolResultMessage } from "@/lib/schemas/tools";

// Initialize tools on module load
initializeTools();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = ChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        createApiError(
          ErrorCodes.VALIDATION_ERROR,
          "Invalid request body",
          { errors: parseResult.error.flatten().fieldErrors }
        ),
        { status: 400 }
      );
    }

    const { serverId, stream, ...chatParams } = parseResult.data;

    // Get server
    const server = getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        createApiError(ErrorCodes.SERVER_NOT_FOUND, `Server ${serverId} not found`),
        { status: 404 }
      );
    }

    const service = getLMStudioService(server.url);
    
    // Get available tools
    const tools = toolRegistry.getDefinitions();

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const generator = service.streamChat(chatParams);

            for await (const chunk of generator) {
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
      });

      return new Response(readableStream, {
        headers: sseHeaders(),
      });
    }

    // Handle non-streaming response with tool support
    const result = await service.chat(chatParams);

    // Check if the response contains tool calls (from models that support it)
    // Note: This requires the model to be prompted/configured for tool use
    // LM Studio models may need specific prompting to emit tool calls
    
    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: chatParams.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: result.content,
          },
          finish_reason: result.finishReason,
        },
      ],
      usage: result.usage
        ? {
            prompt_tokens: result.usage.promptTokens,
            completion_tokens: result.usage.completionTokens,
            total_tokens: result.usage.totalTokens,
          }
        : undefined,
      // Include available tools in response metadata
      available_tools: tools.map(t => t.function.name),
    });
  } catch (error) {
    console.error("Chat error:", error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("connect")) {
        return NextResponse.json(
          createApiError(
            ErrorCodes.SERVER_UNAVAILABLE,
            "Could not connect to LM Studio server. Make sure it is running and a model is loaded."
          ),
          { status: 503 }
        );
      }

      if (error.message.includes("timeout") || error.name === "AbortError") {
        return NextResponse.json(
          createApiError(ErrorCodes.TIMEOUT, "Request timed out"),
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Chat completion failed"),
      { status: 500 }
    );
  }
}

/**
 * GET - Get available tools
 */
export async function GET() {
  initializeTools();
  
  const tools = toolRegistry.getEnabled();
  
  return NextResponse.json({
    tools: tools.map(t => ({
      name: t.definition.function.name,
      description: t.definition.function.description,
      category: t.category,
      parameters: t.definition.function.parameters,
    })),
  });
}