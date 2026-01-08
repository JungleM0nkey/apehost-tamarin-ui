/**
 * Agent Schema Definitions
 * Zod schemas for agent definitions and configurations
 */

import { z } from "zod";
import { ToolDefinitionSchema } from "./tools";
import { MessageSchema } from "./api";

// ============================================================================
// Agent Identity & Metadata
// ============================================================================

export const AgentIdSchema = z.string().min(1).max(64);

export const AgentCategorySchema = z.enum([
  "general",
  "research",
  "coding",
  "analysis",
  "creative",
  "automation",
  "custom",
]);

export type AgentCategory = z.infer<typeof AgentCategorySchema>;

// ============================================================================
// Agent Configuration Schemas
// ============================================================================

/**
 * Agent behavior configuration
 */
export const AgentBehaviorSchema = z.object({
  /** Maximum number of tool calls per turn */
  maxToolCallsPerTurn: z.number().min(1).max(20).default(5),
  /** Maximum total turns in the agent loop */
  maxTurns: z.number().min(1).max(50).default(10),
  /** Whether to continue automatically after tool execution */
  autoContinue: z.boolean().default(true),
  /** Stop on first error or continue with other tools */
  stopOnError: z.boolean().default(false),
  /** Timeout for entire agent run in milliseconds */
  runTimeoutMs: z.number().min(1000).max(600000).default(120000),
  /** Whether to require user confirmation before tool execution */
  requireConfirmation: z.boolean().default(false),
});

export type AgentBehavior = z.infer<typeof AgentBehaviorSchema>;

/**
 * Model configuration for an agent
 */
export const AgentModelConfigSchema = z.object({
  /** Preferred model ID (optional - uses user selection if not set) */
  preferredModel: z.string().optional(),
  /** Temperature for generation */
  temperature: z.number().min(0).max(2).default(0.7),
  /** Maximum tokens to generate per turn */
  maxTokens: z.number().min(1).max(128000).default(4096),
  /** Top-p sampling */
  topP: z.number().min(0).max(1).default(0.95),
});

export type AgentModelConfig = z.infer<typeof AgentModelConfigSchema>;

/**
 * Planning strategy for complex tasks
 */
export const PlanningStrategySchema = z.enum([
  "none",        // No planning - direct tool execution
  "simple",      // Single planning step before execution
  "iterative",   // Plan-execute-revise loop
  "hierarchical" // Break into subtasks with sub-plans
]);

export type PlanningStrategy = z.infer<typeof PlanningStrategySchema>;

// ============================================================================
// Agent Definition Schema
// ============================================================================

/**
 * Complete agent definition
 */
export const AgentDefinitionSchema = z.object({
  /** Unique agent identifier */
  id: AgentIdSchema,
  /** Display name */
  name: z.string().min(1).max(100),
  /** Description of agent's purpose and capabilities */
  description: z.string().max(1000).optional(),
  /** Agent category for organization */
  category: AgentCategorySchema.default("general"),
  /** System prompt that defines agent behavior */
  systemPrompt: z.string().min(1).max(10000),
  /** Tools available to this agent */
  tools: z.array(z.string()).default([]), // Tool names from registry
  /** Behavior configuration */
  behavior: AgentBehaviorSchema.default({}),
  /** Model configuration */
  modelConfig: AgentModelConfigSchema.default({}),
  /** Planning strategy */
  planningStrategy: PlanningStrategySchema.default("none"),
  /** Whether this is a system preset (not user-deletable) */
  isPreset: z.boolean().default(false),
  /** Creation timestamp */
  createdAt: z.number().default(() => Date.now()),
  /** Last update timestamp */
  updatedAt: z.number().default(() => Date.now()),
  /** Icon identifier for UI */
  icon: z.string().default("bot"),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// ============================================================================
// Agent Run Schemas
// ============================================================================

export const AgentRunStatusSchema = z.enum([
  "pending",
  "planning",
  "executing",
  "waiting_confirmation",
  "completed",
  "failed",
  "cancelled",
]);

export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

/**
 * Single step in agent execution
 */
export const AgentStepSchema = z.object({
  /** Step index */
  index: z.number(),
  /** Step type */
  type: z.enum(["thinking", "tool_call", "tool_result", "response", "error"]),
  /** Step content */
  content: z.string(),
  /** Tool name if applicable */
  toolName: z.string().optional(),
  /** Tool arguments if applicable */
  toolArgs: z.record(z.unknown()).optional(),
  /** Tool result if applicable */
  toolResult: z.unknown().optional(),
  /** Error message if applicable */
  error: z.string().optional(),
  /** Timestamp */
  timestamp: z.number(),
  /** Duration in ms */
  durationMs: z.number().optional(),
});

export type AgentStep = z.infer<typeof AgentStepSchema>;

/**
 * Agent run state (for tracking execution)
 */
export const AgentRunSchema = z.object({
  /** Run identifier */
  id: z.string(),
  /** Agent ID */
  agentId: AgentIdSchema,
  /** Current status */
  status: AgentRunStatusSchema,
  /** Initial user input */
  input: z.string(),
  /** Execution steps */
  steps: z.array(AgentStepSchema).default([]),
  /** Final output (if completed) */
  output: z.string().optional(),
  /** Error message (if failed) */
  error: z.string().optional(),
  /** Messages history */
  messages: z.array(MessageSchema).default([]),
  /** Current turn number */
  currentTurn: z.number().default(0),
  /** Total tool calls made */
  totalToolCalls: z.number().default(0),
  /** Start time */
  startedAt: z.number(),
  /** End time (if finished) */
  endedAt: z.number().optional(),
  /** Token usage statistics */
  tokenUsage: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number(),
  }).optional(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const CreateAgentRequestSchema = AgentDefinitionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isPreset: true,
});

export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;

export const UpdateAgentRequestSchema = AgentDefinitionSchema.partial().omit({
  id: true,
  createdAt: true,
  isPreset: true,
});

export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;

export const RunAgentRequestSchema = z.object({
  /** User input/prompt for the agent */
  input: z.string().min(1).max(100000),
  /** Server ID to use for LLM calls */
  serverId: z.string().min(1),
  /** Model to use (overrides agent's preferred model) */
  model: z.string().optional(),
  /** Additional context messages to prepend */
  contextMessages: z.array(MessageSchema).optional(),
  /** Stream the response */
  stream: z.boolean().default(true),
});

export type RunAgentRequest = z.infer<typeof RunAgentRequestSchema>;

export const AgentListResponseSchema = z.object({
  agents: z.array(AgentDefinitionSchema),
  presets: z.array(AgentDefinitionSchema),
});

export type AgentListResponse = z.infer<typeof AgentListResponseSchema>;

// ============================================================================
// SSE Event Types for Agent Streaming
// ============================================================================

export const AgentEventTypeSchema = z.enum([
  "status",     // Status change
  "step",       // New step added
  "thinking",   // Model thinking/reasoning
  "tool_call",  // Tool being called
  "tool_result",// Tool result received
  "content",    // Response content chunk
  "error",      // Error occurred
  "done",       // Run completed
]);

export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentStreamEventSchema = z.object({
  type: AgentEventTypeSchema,
  data: z.union([
    z.object({ status: AgentRunStatusSchema }),
    z.object({ step: AgentStepSchema }),
    z.object({ content: z.string() }),
    z.object({ error: z.string() }),
    z.object({ run: AgentRunSchema }),
  ]),
  timestamp: z.number().default(() => Date.now()),
});

export type AgentStreamEvent = z.infer<typeof AgentStreamEventSchema>;