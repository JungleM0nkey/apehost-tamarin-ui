/**
 * Tool Executor
 * Secure tool execution engine with timeout and sandboxing
 */

import { toolRegistry } from "./tool-registry";
import type {
  ToolCall,
  ParsedToolCall,
  ToolResult,
  ToolResultMessage,
} from "@/lib/schemas/tools";
import {
  parseToolCallArguments,
  createToolResultMessage,
} from "@/lib/schemas/tools";

/**
 * Tool execution options
 */
export interface ExecutionOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum concurrent tool executions (default: 5) */
  maxConcurrent?: number;
  /** Whether to continue on error (default: true) */
  continueOnError?: boolean;
}

const DEFAULT_OPTIONS: Required<ExecutionOptions> = {
  timeout: 30000,
  maxConcurrent: 5,
  continueOnError: true,
};

/**
 * Execute a single tool call with timeout
 */
async function executeWithTimeout(
  call: ParsedToolCall,
  timeout: number
): Promise<ToolResult> {
  const timeoutPromise = new Promise<ToolResult>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Tool "${call.name}" execution timed out after ${timeout}ms`));
    }, timeout);
  });

  const executionPromise = toolRegistry.execute(call);

  try {
    return await Promise.race([executionPromise, timeoutPromise]);
  } catch (error) {
    return {
      toolCallId: call.id,
      name: call.name,
      result: null,
      error: error instanceof Error ? error.message : "Execution failed",
    };
  }
}

/**
 * Execute multiple tool calls
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  options: ExecutionOptions = {}
): Promise<ToolResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: ToolResult[] = [];

  // Parse all tool calls first
  const parsedCalls: (ParsedToolCall | null)[] = toolCalls.map(parseToolCallArguments);

  // Filter out failed parses
  const validCalls: { index: number; call: ParsedToolCall }[] = [];
  parsedCalls.forEach((call, index) => {
    if (call) {
      validCalls.push({ index, call });
    } else {
      results[index] = {
        toolCallId: toolCalls[index].id,
        name: toolCalls[index].function.name,
        result: null,
        error: "Failed to parse tool call arguments",
      };
    }
  });

  // Execute in batches respecting maxConcurrent
  for (let i = 0; i < validCalls.length; i += opts.maxConcurrent) {
    const batch = validCalls.slice(i, i + opts.maxConcurrent);
    
    const batchResults = await Promise.all(
      batch.map(({ call }) => executeWithTimeout(call, opts.timeout))
    );

    // Place results in correct order
    batch.forEach(({ index }, batchIndex) => {
      results[index] = batchResults[batchIndex];
    });

    // Check for errors if not continuing on error
    if (!opts.continueOnError) {
      const hasError = batchResults.some((r) => r.error);
      if (hasError) {
        break;
      }
    }
  }

  return results;
}

/**
 * Execute tool calls and return as messages
 */
export async function executeToolCallsAsMessages(
  toolCalls: ToolCall[],
  options?: ExecutionOptions
): Promise<ToolResultMessage[]> {
  const results = await executeToolCalls(toolCalls, options);
  return results.map(createToolResultMessage);
}

/**
 * Check if a model response contains tool calls
 */
export function hasToolCalls(
  response: { tool_calls?: ToolCall[] } | null | undefined
): boolean {
  return Array.isArray(response?.tool_calls) && response.tool_calls.length > 0;
}

/**
 * Extract tool calls from a model response
 */
export function extractToolCalls(
  response: { tool_calls?: ToolCall[] } | null | undefined
): ToolCall[] {
  if (!response?.tool_calls) {
    return [];
  }
  return response.tool_calls;
}

/**
 * Validate that all requested tools are available
 */
export function validateToolsAvailable(toolCalls: ToolCall[]): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  for (const call of toolCalls) {
    if (!toolRegistry.isAvailable(call.function.name)) {
      missing.push(call.function.name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}