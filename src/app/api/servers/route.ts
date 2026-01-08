/**
 * Servers API Route
 * GET - List all servers
 * POST - Add a new server
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllServers, addServer, checkAllServersHealth } from "@/lib/services/server-manager";
import {
  CreateServerRequestSchema,
  ServersListResponseSchema,
  createApiError,
  ErrorCodes,
} from "@/lib/schemas/api";

export async function GET() {
  try {
    const servers = getAllServers();

    // Check health of all servers in background
    checkAllServersHealth().catch(console.error);

    const response = ServersListResponseSchema.parse({ servers });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error listing servers:", error);
    return NextResponse.json(
      createApiError(
        ErrorCodes.INTERNAL_ERROR,
        "Failed to list servers"
      ),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = CreateServerRequestSchema.safeParse(body);
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

    const { name, url } = parseResult.data;

    // Add the server
    const server = addServer(name, url);

    return NextResponse.json(server, { status: 201 });
  } catch (error) {
    console.error("Error adding server:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        createApiError(ErrorCodes.VALIDATION_ERROR, error.message),
        { status: 409 }
      );
    }

    return NextResponse.json(
      createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to add server"),
      { status: 500 }
    );
  }
}