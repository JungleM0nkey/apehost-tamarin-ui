/**
 * Agent Management API Route
 * GET - Get agent details
 * PUT - Update agent configuration
 * DELETE - Delete a custom agent
 */

import { NextRequest, NextResponse } from "next/server";
import { agentOrchestrator } from "@/lib/services/agent-orchestrator";
import {
  AgentIdSchema,
  UpdateAgentRequestSchema,
  type AgentDefinition,
} from "@/lib/schemas/agents";
import { createErrorResponse, ErrorCodes } from "@/lib/schemas/api";

interface RouteContext {
  params: Promise<{ agentId: string }>;
}

/**
 * GET /api/agents/[agentId]
 * Get agent details
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { agentId } = await context.params;
    
    const idValidation = AgentIdSchema.safeParse(agentId);
    if (!idValidation.success) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Invalid agent ID"),
        { status: 400 }
      );
    }

    const agent = agentOrchestrator.getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.NOT_FOUND, `Agent not found: ${agentId}`),
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get agent";
    return NextResponse.json(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, message),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[agentId]
 * Update agent configuration
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { agentId } = await context.params;
    
    const idValidation = AgentIdSchema.safeParse(agentId);
    if (!idValidation.success) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Invalid agent ID"),
        { status: 400 }
      );
    }

    const existingAgent = agentOrchestrator.getAgent(agentId);
    if (!existingAgent) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.NOT_FOUND, `Agent not found: ${agentId}`),
        { status: 404 }
      );
    }

    // Prevent modifying preset agents
    if (existingAgent.isPreset) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          "Cannot modify preset agents. Create a custom agent instead."
        ),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = UpdateAgentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          "Invalid agent configuration",
          validationResult.error.flatten().fieldErrors
        ),
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Merge updates with existing agent
    const updatedAgent: AgentDefinition = {
      ...existingAgent,
      ...updates,
      // Merge nested objects
      behavior: {
        ...existingAgent.behavior,
        ...updates.behavior,
      },
      modelConfig: {
        ...existingAgent.modelConfig,
        ...updates.modelConfig,
      },
      // Preserve immutable fields
      id: existingAgent.id,
      createdAt: existingAgent.createdAt,
      isPreset: existingAgent.isPreset,
      // Update timestamp
      updatedAt: Date.now(),
    };

    // Re-register with updates
    agentOrchestrator.registerAgent(updatedAgent);

    return NextResponse.json(updatedAgent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update agent";
    return NextResponse.json(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, message),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[agentId]
 * Delete a custom agent
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { agentId } = await context.params;
    
    const idValidation = AgentIdSchema.safeParse(agentId);
    if (!idValidation.success) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Invalid agent ID"),
        { status: 400 }
      );
    }

    const existingAgent = agentOrchestrator.getAgent(agentId);
    if (!existingAgent) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.NOT_FOUND, `Agent not found: ${agentId}`),
        { status: 404 }
      );
    }

    // Prevent deleting preset agents
    if (existingAgent.isPreset) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          "Cannot delete preset agents"
        ),
        { status: 403 }
      );
    }

    const deleted = agentOrchestrator.unregisterAgent(agentId);
    if (!deleted) {
      return NextResponse.json(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Failed to delete agent"),
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedId: agentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete agent";
    return NextResponse.json(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, message),
      { status: 500 }
    );
  }
}