/**
 * Agents API Route
 * GET - List all agents (presets and custom)
 * POST - Create a new custom agent
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { agentOrchestrator } from "@/lib/services/agent-orchestrator";
import {
  CreateAgentRequestSchema,
  AgentListResponseSchema,
  type AgentDefinition,
} from "@/lib/schemas/agents";
import { createErrorResponse, ErrorCodes } from "@/lib/schemas/api";
import { initializePresetAgents } from "@/lib/agents/presets";

// Initialize preset agents on module load
let presetsInitialized = false;

function ensurePresetsInitialized() {
  if (!presetsInitialized) {
    initializePresetAgents();
    presetsInitialized = true;
  }
}

/**
 * GET /api/agents
 * List all registered agents
 */
export async function GET() {
  try {
    ensurePresetsInitialized();

    const agents = agentOrchestrator.listCustomAgents();
    const presets = agentOrchestrator.listPresets();

    const response = AgentListResponseSchema.parse({
      agents,
      presets,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list agents";
    return NextResponse.json(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, message),
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Create a new custom agent
 */
export async function POST(request: NextRequest) {
  try {
    ensurePresetsInitialized();

    const body = await request.json();
    const validationResult = CreateAgentRequestSchema.safeParse(body);

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

    const agentData = validationResult.data;

    // Generate ID and timestamps
    const agent: AgentDefinition = {
      id: nanoid(),
      name: agentData.name,
      description: agentData.description,
      category: agentData.category || "custom",
      systemPrompt: agentData.systemPrompt,
      tools: agentData.tools || [],
      behavior: {
        maxToolCallsPerTurn: agentData.behavior?.maxToolCallsPerTurn ?? 5,
        maxTurns: agentData.behavior?.maxTurns ?? 10,
        autoContinue: agentData.behavior?.autoContinue ?? true,
        stopOnError: agentData.behavior?.stopOnError ?? false,
        runTimeoutMs: agentData.behavior?.runTimeoutMs ?? 120000,
        requireConfirmation: agentData.behavior?.requireConfirmation ?? false,
      },
      modelConfig: {
        preferredModel: agentData.modelConfig?.preferredModel,
        temperature: agentData.modelConfig?.temperature ?? 0.7,
        maxTokens: agentData.modelConfig?.maxTokens ?? 4096,
        topP: agentData.modelConfig?.topP ?? 0.95,
      },
      planningStrategy: agentData.planningStrategy || "none",
      isPreset: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      icon: agentData.icon || "bot",
    };

    // Register the agent
    agentOrchestrator.registerAgent(agent);

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create agent";
    return NextResponse.json(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, message),
      { status: 500 }
    );
  }
}