/**
 * Server Models API Route
 * GET - List available models for a server
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerById, getServerModels } from "@/lib/services/server-manager";
import { createApiError, ErrorCodes, ModelsListResponseSchema } from "@/lib/schemas/api";

interface RouteParams {
  params: Promise<{ serverId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { serverId } = await params;
    const server = getServerById(serverId);

    if (!server) {
      return NextResponse.json(
        createApiError(ErrorCodes.SERVER_NOT_FOUND, `Server ${serverId} not found`),
        { status: 404 }
      );
    }

    const models = await getServerModels(serverId);

    const response = ModelsListResponseSchema.parse({
      models,
      serverId,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error listing models:", error);

    // Check if it's a connection error
    if (error instanceof Error && error.message.includes("fetch")) {
      return NextResponse.json(
        createApiError(
          ErrorCodes.SERVER_UNAVAILABLE,
          "Could not connect to LM Studio server. Make sure it is running."
        ),
        { status: 503 }
      );
    }

    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to list models"),
      { status: 500 }
    );
  }
}