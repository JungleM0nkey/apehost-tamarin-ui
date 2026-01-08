/**
 * Server Configuration
 * Environment-based server configuration with defaults
 */

import { nanoid } from "nanoid";
import type { ServerConfig } from "@/lib/schemas/api";

// Environment variables for server configuration
const LMSTUDIO_SERVERS = process.env.LMSTUDIO_SERVERS;

/**
 * Parse server configuration from environment variable
 * Format: "name1|url1,name2|url2"
 * Example: "Local|http://localhost:1234/v1,Remote|http://192.168.1.100:1234/v1"
 */
function parseServersFromEnv(): ServerConfig[] {
  if (!LMSTUDIO_SERVERS) {
    return [];
  }

  try {
    return LMSTUDIO_SERVERS.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [name, url] = entry.split("|").map((s) => s.trim());
        if (!name || !url) {
          console.warn(`Invalid server entry: ${entry}`);
          return null;
        }
        return {
          id: nanoid(12),
          name,
          url: url.replace(/\/$/, ""), // Remove trailing slash
          isConnected: false,
        };
      })
      .filter((s): s is ServerConfig => s !== null);
  } catch (error) {
    console.error("Failed to parse LMSTUDIO_SERVERS:", error);
    return [];
  }
}

/**
 * Default server configurations when no environment variables are set
 */
export const DEFAULT_SERVERS: ServerConfig[] = [
  {
    id: "local-main",
    name: "Local (Main)",
    url: "http://localhost:1234/v1",
    isConnected: false,
  },
  {
    id: "melmbox",
    name: "Melmbox",
    url: "http://melmbox:1234/v1",
    isConnected: false,
  },
];

/**
 * Get all configured servers
 * Priority: Environment variables > Default servers
 */
export function getConfiguredServers(): ServerConfig[] {
  const envServers = parseServersFromEnv();
  if (envServers.length > 0) {
    return envServers;
  }
  return DEFAULT_SERVERS;
}

/**
 * Server configuration constants
 */
export const ServerConfig = {
  /** Timeout for health checks in milliseconds */
  HEALTH_CHECK_TIMEOUT_MS: 5000,

  /** Timeout for model listing in milliseconds */
  MODELS_TIMEOUT_MS: 10000,

  /** Timeout for chat requests in milliseconds */
  CHAT_TIMEOUT_MS: 120000,

  /** Interval between automatic health checks in milliseconds */
  HEALTH_CHECK_INTERVAL_MS: 30000,

  /** Maximum retries for failed requests */
  MAX_RETRIES: 3,

  /** Base delay for exponential backoff in milliseconds */
  RETRY_BASE_DELAY_MS: 1000,
} as const;