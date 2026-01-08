/**
 * Server Manager Service
 * Manages multiple LM Studio server configurations and health checks
 */

import { nanoid } from "nanoid";
import { getConfiguredServers, DEFAULT_SERVERS } from "@/lib/config/servers";
import { getLMStudioService } from "./lmstudio-service";
import type { ServerConfig, ServerHealth, Model } from "@/lib/schemas/api";

// In-memory server store (will be replaced with database in Phase 5)
let servers: Map<string, ServerConfig> = new Map();
let initialized = false;

/**
 * Initialize servers from configuration
 */
function ensureInitialized(): void {
  if (initialized) return;

  const configuredServers = getConfiguredServers();
  for (const server of configuredServers) {
    servers.set(server.id, server);
  }
  initialized = true;
}

/**
 * Get all configured servers
 */
export function getAllServers(): ServerConfig[] {
  ensureInitialized();
  return Array.from(servers.values());
}

/**
 * Get a specific server by ID
 */
export function getServerById(id: string): ServerConfig | undefined {
  ensureInitialized();
  return servers.get(id);
}

/**
 * Alias for getServerById (for compatibility)
 */
export const getServer = getServerById;

/**
 * Get a server by URL
 */
export function getServerByUrl(url: string): ServerConfig | undefined {
  ensureInitialized();
  const normalizedUrl = url.replace(/\/$/, "");
  return Array.from(servers.values()).find(
    (s) => s.url.replace(/\/$/, "") === normalizedUrl
  );
}

/**
 * Add a new server
 */
export function addServer(name: string, url: string): ServerConfig {
  ensureInitialized();

  const normalizedUrl = url.replace(/\/$/, "");

  // Check for duplicate URL
  const existing = getServerByUrl(normalizedUrl);
  if (existing) {
    throw new Error(`Server with URL ${normalizedUrl} already exists`);
  }

  const server: ServerConfig = {
    id: nanoid(12),
    name,
    url: normalizedUrl,
    isConnected: false,
  };

  servers.set(server.id, server);
  return server;
}

/**
 * Remove a server by ID
 */
export function removeServer(id: string): boolean {
  ensureInitialized();
  return servers.delete(id);
}

/**
 * Update server connection status
 */
export function updateServerStatus(
  id: string,
  status: Partial<Pick<ServerConfig, "isConnected" | "lastChecked" | "modelCount">>
): ServerConfig | undefined {
  const server = servers.get(id);
  if (!server) return undefined;

  const updated = { ...server, ...status };
  servers.set(id, updated);
  return updated;
}

/**
 * Check health of a specific server
 */
export async function checkServerHealth(id: string): Promise<ServerHealth> {
  const server = getServerById(id);
  if (!server) {
    return {
      isConnected: false,
      error: "Server not found",
      checkedAt: Date.now(),
    };
  }

  const service = getLMStudioService(server.url);
  const result = await service.checkHealth();

  // Update server status
  updateServerStatus(id, {
    isConnected: result.isConnected,
    lastChecked: Date.now(),
  });

  return {
    isConnected: result.isConnected,
    latencyMs: result.latencyMs,
    error: result.error,
    checkedAt: Date.now(),
  };
}

/**
 * Check health of all servers
 */
export async function checkAllServersHealth(): Promise<Map<string, ServerHealth>> {
  ensureInitialized();

  const results = new Map<string, ServerHealth>();
  const serverIds = Array.from(servers.keys());

  // Check all servers in parallel
  const healthChecks = await Promise.all(
    serverIds.map(async (id) => ({
      id,
      health: await checkServerHealth(id),
    }))
  );

  for (const { id, health } of healthChecks) {
    results.set(id, health);
  }

  return results;
}

/**
 * Get models for a specific server
 */
export async function getServerModels(id: string): Promise<Model[]> {
  const server = getServerById(id);
  if (!server) {
    throw new Error("Server not found");
  }

  const service = getLMStudioService(server.url);
  const models = await service.listModels();

  // Update model count
  updateServerStatus(id, {
    modelCount: models.length,
    isConnected: true,
    lastChecked: Date.now(),
  });

  return models;
}

/**
 * Get the first available (connected) server
 */
export function getFirstAvailableServer(): ServerConfig | undefined {
  ensureInitialized();
  return Array.from(servers.values()).find((s) => s.isConnected);
}

/**
 * Reset servers to default configuration
 */
export function resetServers(): void {
  servers.clear();
  for (const server of DEFAULT_SERVERS) {
    servers.set(server.id, server);
  }
}

/**
 * Export server manager singleton for compatibility
 */
export const serverManager = {
  getServer: getServerById,
  getAllServers,
  addServer,
  removeServer,
  checkServerHealth,
  checkAllServersHealth,
  getServerModels,
  getFirstAvailableServer,
  resetServers,
};