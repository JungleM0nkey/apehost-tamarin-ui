/**
 * API Schema Definitions
 * Zod schemas for all API request/response validation
 */

import { z } from "zod";

// ============================================================================
// Base Schemas
// ============================================================================

export const MessageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// ============================================================================
// Server Schemas
// ============================================================================

export const ServerIdSchema = z.string().min(1).max(64);

export const ServerConfigSchema = z.object({
  id: ServerIdSchema,
  name: z.string().min(1).max(100),
  url: z.string().url(),
  isConnected: z.boolean().default(false),
  lastChecked: z.number().optional(),
  modelCount: z.number().optional(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export const CreateServerRequestSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow http/https, block file:// and other protocols
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: "URL must use http or https protocol" }
  ),
});

export type CreateServerRequest = z.infer<typeof CreateServerRequestSchema>;

export const ServerHealthSchema = z.object({
  isConnected: z.boolean(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
  checkedAt: z.number(),
});

export type ServerHealth = z.infer<typeof ServerHealthSchema>;

export const ServersListResponseSchema = z.object({
  servers: z.array(ServerConfigSchema),
});

// ============================================================================
// Model Schemas
// ============================================================================

export const ModelSchema = z.object({
  id: z.string(),
  object: z.string().default("model"),
  owned_by: z.string().default("lmstudio"),
  created: z.number().optional(),
});

export type Model = z.infer<typeof ModelSchema>;

export const ModelsListResponseSchema = z.object({
  models: z.array(ModelSchema),
  serverId: ServerIdSchema,
});

// ============================================================================
// Chat Schemas
// ============================================================================

export const ChatRequestSchema = z.object({
  serverId: ServerIdSchema,
  model: z.string().min(1),
  messages: z.array(MessageSchema).min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(1).max(128000).default(2048),
  top_p: z.number().min(0).max(1).default(0.95),
  stream: z.boolean().default(true),
  stop: z.array(z.string()).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: MessageSchema,
      finish_reason: z.string().nullable(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ============================================================================
// Error Schemas
// ============================================================================

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// API Response Helpers
// ============================================================================

export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SERVER_NOT_FOUND: "SERVER_NOT_FOUND",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create an error Response object for API routes
 * Maps error codes to appropriate HTTP status codes
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): Response {
  const statusMap: Record<ErrorCode, number> = {
    VALIDATION_ERROR: 400,
    SERVER_NOT_FOUND: 404,
    SERVER_UNAVAILABLE: 503,
    MODEL_NOT_FOUND: 404,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    TIMEOUT: 504,
  };

  const status = statusMap[code] ?? 500;
  const body = createApiError(code, message, details);

  return Response.json(body, { status });
}