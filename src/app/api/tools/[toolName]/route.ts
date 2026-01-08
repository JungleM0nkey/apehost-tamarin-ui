/**
 * Individual Tool API Route
 * GET - Get tool details
 * PATCH - Update tool settings (enable/disable)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initializeTools, toolRegistry } from "@/lib/tools";
import { createApiError, ErrorCodes } from "@/lib/schemas/api";

// Initialize tools
initializeTools();

interface RouteContext {
  params: Promise<{ toolName: string }>;
}

/**
 * GET /api/tools/[toolName]
 * Get tool details
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { toolName } = await context.params;
    
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return NextResponse.json(
        createApiError(ErrorCodes.NOT_FOUND, `Tool "${toolName}" not found`),
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: tool.definition.function.name,
      description: tool.definition.function.description,
      category: tool.category || "utility",
      enabled: tool.enabled,
      requiresAuth: tool.requiresAuth,
      parameters: tool.definition.function.parameters,
    });
  } catch (error) {
    console.error("Get tool error:", error);
    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to get tool"),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tools/[toolName]
 * Update tool settings
 */
const UpdateToolSchema = z.object({
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { toolName } = await context.params;
    
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return NextResponse.json(
        createApiError(ErrorCodes.NOT_FOUND, `Tool "${toolName}" not found`),
        { status: 404 }
      );
    }

    const body = await request.json();
    const parseResult = UpdateToolSchema.safeParse(body);
    
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

    const { enabled } = parseResult.data;

    if (enabled !== undefined) {
      toolRegistry.setEnabled(toolName, enabled);
    }

    // Get updated tool
    const updatedTool = toolRegistry.get(toolName)!;

    return NextResponse.json({
      name: updatedTool.definition.function.name,
      description: updatedTool.definition.function.description,
      category: updatedTool.category || "utility",
      enabled: updatedTool.enabled,
      requiresAuth: updatedTool.requiresAuth,
      parameters: updatedTool.definition.function.parameters,
    });
  } catch (error) {
    console.error("Update tool error:", error);
    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to update tool"),
      { status: 500 }
    );
  }
}