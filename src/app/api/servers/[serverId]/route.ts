/**
 * Server Detail API Route
 * GET - Get server details with health status
 * DELETE - Remove a server
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getServerById,
  removeServer,
  checkServerHealth,
} from "@/lib/services/server-manager";
import { createApiError, ErrorCodes } from "@/lib/schemas/api";

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

    // Check health
    const health = await checkServerHealth(serverId);

    return NextResponse.json({
      ...server,
      health,
    });
  } catch (error) {
    console.error("Error getting server:", error);
    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to get server details"),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { serverId } = await params;
    const server = getServerById(serverId);

    if (!server) {
      return NextResponse.json(
        createApiError(ErrorCodes.SERVER_NOT_FOUND, `Server ${serverId} not found`),
        { status: 404 }
      );
    }

    const removed = removeServer(serverId);

    if (!removed) {
      return NextResponse.json(
        createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to remove server"),
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error removing server:", error);
    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to remove server"),
      { status: 500 }
    );
  }
}