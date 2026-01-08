/**
 * Agent Run API Route
 * POST - Execute an agent with streaming progress
 */

import { NextRequest, NextResponse } from "next/server";
import { agentOrchestrator } from "@/lib/services/agent-orchestrator";
import { AgentIdSchema, RunAgentRequestSchema } from "@/lib/schemas/agents";
import { createErrorResponse, ErrorCodes } from "@/lib/schemas/api";
import { encodeSSE, encodeSSEDone, encodeSSEError, sseHeaders } from "@/lib/utils/sse";

interface RouteContext {
  params: Promise<{ agentId: string }>;
}

/**
 * POST /api/agents/[agentId]/run
 * Execute an agent with streaming progress updates
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { agentId } = await context.params;
    
    // Validate agent ID
    const idValidation = AgentIdSchema.safeParse(agentId);
    if (!idValidation.success) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Invalid agent ID"),
        { status: 400 }
      );
    }

    // Check if agent exists
    const agent = agentOrchestrator.getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.NOT_FOUND, `Agent not found: ${agentId}`),
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = RunAgentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          "Invalid run request",
          validationResult.error.flatten().fieldErrors
        ),
        { status: 400 }
      );
    }

    const runRequest = validationResult.data;

    // Check if streaming is requested
    if (!runRequest.stream) {
      // Non-streaming response - collect all events and return final result
      const events = [];
      for await (const event of agentOrchestrator.runAgent(agentId, runRequest)) {
        events.push(event);
        if (event.type === "done" || event.type === "error") {
          break;
        }
      }

      const lastEvent = events[events.length - 1];
      if (lastEvent?.type === "error" && "error" in lastEvent.data) {
        return NextResponse.json(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, lastEvent.data.error),
          { status: 500 }
        );
      }

      if (lastEvent?.type === "done" && "run" in lastEvent.data) {
        return NextResponse.json(lastEvent.data.run);
      }

      return NextResponse.json(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Agent run failed unexpectedly"),
        { status: 500 }
      );
    }

    // Streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of agentOrchestrator.runAgent(agentId, runRequest)) {
            const sseData = encodeSSE({
              type: event.type,
              data: event.data,
              timestamp: event.timestamp,
            });
            
            controller.enqueue(encoder.encode(sseData));

            // End stream on done or error
            if (event.type === "done" || event.type === "error") {
              controller.enqueue(encoder.encode(encodeSSEDone()));
              break;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Agent execution failed";
          controller.enqueue(encoder.encode(encodeSSEError(errorMessage)));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: sseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run agent";
    return NextResponse.json(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, message),
      { status: 500 }
    );
  }
}