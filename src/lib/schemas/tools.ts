/**
 * Tool Schema Definitions
 * Zod schemas for tool definitions and execution results
 */

import { z } from "zod";

// ============================================================================
// Tool Definition Schemas
// ============================================================================

/**
 * JSON Schema type for tool parameters
 */
export const JSONSchemaPropertySchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z.object({
    type: z.enum(["string", "number", "boolean", "array", "object"]),
    description: z.string().optional(),
    enum: z.array(z.string()).optional(),
    items: z.record(z.unknown()).optional(),
    properties: z.record(z.unknown()).optional(),
    required: z.array(z.string()).optional(),
  }).passthrough()
);

export const ToolParametersSchema = z.object({
  type: z.literal("object"),
  properties: z.record(JSONSchemaPropertySchema),
  required: z.array(z.string()).optional(),
});

export type ToolParameters = z.infer<typeof ToolParametersSchema>;

/**
 * Tool function definition (OpenAI-compatible format)
 */
export const ToolFunctionSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  description: z.string().min(1).max(1024),
  parameters: ToolParametersSchema,
});

export type ToolFunction = z.infer<typeof ToolFunctionSchema>;

/**
 * Tool definition (OpenAI-compatible format)
 */
export const ToolDefinitionSchema = z.object({
  type: z.literal("function"),
  function: ToolFunctionSchema,
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ============================================================================
// Tool Call Schemas
// ============================================================================

/**
 * Tool call from model response
 */
export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(), // JSON string of arguments
  }),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Parsed tool call with typed arguments
 */
export const ParsedToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
});

export type ParsedToolCall = z.infer<typeof ParsedToolCallSchema>;

// ============================================================================
// Tool Execution Schemas
// ============================================================================

/**
 * Tool execution result
 */
export const ToolResultSchema = z.object({
  toolCallId: z.string(),
  name: z.string(),
  result: z.unknown(),
  error: z.string().optional(),
  executionTimeMs: z.number().optional(),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

/**
 * Tool execution status
 */
export const ToolExecutionStatusSchema = z.enum([
  "pending",
  "running",
  "success",
  "error",
  "timeout",
]);

export type ToolExecutionStatus = z.infer<typeof ToolExecutionStatusSchema>;

// ============================================================================
// Tool Message Schemas (for conversation)
// ============================================================================

/**
 * Assistant message with tool calls
 */
export const AssistantToolCallMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().nullable(),
  tool_calls: z.array(ToolCallSchema),
});

export type AssistantToolCallMessage = z.infer<typeof AssistantToolCallMessageSchema>;

/**
 * Tool result message
 */
export const ToolResultMessageSchema = z.object({
  role: z.literal("tool"),
  content: z.string(),
  tool_call_id: z.string(),
  name: z.string().optional(),
});

export type ToolResultMessage = z.infer<typeof ToolResultMessageSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse tool call arguments from JSON string
 */
export function parseToolCallArguments(
  toolCall: ToolCall
): ParsedToolCall | null {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    return {
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: args,
    };
  } catch {
    return null;
  }
}

/**
 * Format tool result for message content
 */
export function formatToolResultContent(result: ToolResult): string {
  if (result.error) {
    return JSON.stringify({ error: result.error });
  }
  return JSON.stringify(result.result);
}

/**
 * Create a tool result message
 */
export function createToolResultMessage(result: ToolResult): ToolResultMessage {
  return {
    role: "tool",
    content: formatToolResultContent(result),
    tool_call_id: result.toolCallId,
    name: result.name,
  };
}