/**
 * Tools API Route
 * GET - List available tools
 * POST - Execute a tool
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initializeTools, toolRegistry } from "@/lib/tools";
import { createApiError, ErrorCodes } from "@/lib/schemas/api";

// Initialize tools
initializeTools();

/**
 * GET - List available tools
 * Query params:
 *   - all: boolean - Include disabled tools
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "true";

  const tools = includeAll ? toolRegistry.getAll() : toolRegistry.getEnabled();

  return NextResponse.json({
    tools: tools.map((t) => ({
      name: t.definition.function.name,
      description: t.definition.function.description,
      category: t.category || "utility",
      enabled: t.enabled,
      requiresAuth: t.requiresAuth,
      parameters: t.definition.function.parameters,
    })),
    count: tools.length,
    enabledCount: toolRegistry.getEnabled().length,
    totalCount: toolRegistry.getAll().length,
  });
}

/**
 * POST - Execute a tool directly
 */
const ExecuteToolRequestSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = ExecuteToolRequestSchema.safeParse(body);
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

    const { name, arguments: args } = parseResult.data;

    // Check if tool exists
    const tool = toolRegistry.get(name);
    if (!tool) {
      return NextResponse.json(
        createApiError(ErrorCodes.MODEL_NOT_FOUND, `Tool "${name}" not found`),
        { status: 404 }
      );
    }

    if (!tool.enabled) {
      return NextResponse.json(
        createApiError(ErrorCodes.VALIDATION_ERROR, `Tool "${name}" is disabled`),
        { status: 400 }
      );
    }

    // Execute the tool
    const startTime = Date.now();
    try {
      const result = await tool.handler(args);
      return NextResponse.json({
        name,
        result,
        executionTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      return NextResponse.json({
        name,
        result: null,
        error: error instanceof Error ? error.message : "Execution failed",
        executionTimeMs: Date.now() - startTime,
      });
    }
  } catch (error) {
    console.error("Tool execution error:", error);
    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Tool execution failed"),
      { status: 500 }
    );
  }
}