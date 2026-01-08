/**
 * Tool Registry
 * Registry for available tools with metadata and handlers
 */

import type {
  ToolDefinition,
  ToolFunction,
  ParsedToolCall,
  ToolResult,
} from "@/lib/schemas/tools";

/**
 * Tool handler function type
 */
export type ToolHandler = (
  args: Record<string, unknown>
) => Promise<unknown> | unknown;

/**
 * Registered tool with handler
 */
export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
  enabled: boolean;
  category?: string;
  requiresAuth?: boolean;
}

/**
 * Tool registry singleton
 */
class ToolRegistryImpl {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a new tool
   */
  register(
    func: ToolFunction,
    handler: ToolHandler,
    options: {
      enabled?: boolean;
      category?: string;
      requiresAuth?: boolean;
    } = {}
  ): void {
    const { enabled = true, category, requiresAuth = false } = options;

    const definition: ToolDefinition = {
      type: "function",
      function: func,
    };

    this.tools.set(func.name, {
      definition,
      handler,
      enabled,
      category,
      requiresAuth,
    });
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists and is enabled
   */
  isAvailable(name: string): boolean {
    const tool = this.tools.get(name);
    return tool !== undefined && tool.enabled;
  }

  /**
   * Enable/disable a tool
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const tool = this.tools.get(name);
    if (tool) {
      tool.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get all registered tools
   */
  getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all enabled tools
   */
  getEnabled(): RegisteredTool[] {
    return Array.from(this.tools.values()).filter((t) => t.enabled);
  }

  /**
   * Get tool definitions for API request (OpenAI format)
   */
  getDefinitions(): ToolDefinition[] {
    return this.getEnabled().map((t) => t.definition);
  }

  /**
   * Alias for getDefinitions (returns only enabled tools)
   */
  getEnabledDefinitions(): ToolDefinition[] {
    return this.getDefinitions();
  }

  /**
   * Get tools by category
   */
  getByCategory(category: string): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.category === category
    );
  }

  /**
   * Execute a tool call
   */
  async execute(call: ParsedToolCall): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(call.name);

    if (!tool) {
      return {
        toolCallId: call.id,
        name: call.name,
        result: null,
        error: `Tool "${call.name}" not found`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    if (!tool.enabled) {
      return {
        toolCallId: call.id,
        name: call.name,
        result: null,
        error: `Tool "${call.name}" is disabled`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    try {
      const result = await tool.handler(call.arguments);
      return {
        toolCallId: call.id,
        name: call.name,
        result,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        toolCallId: call.id,
        name: call.name,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistryImpl();

/**
 * Helper to create a tool definition
 */
export function defineTool(
  name: string,
  description: string,
  parameters: Record<string, {
    type: "string" | "number" | "boolean" | "array" | "object";
    description?: string;
    enum?: string[];
    required?: boolean;
  }>,
  handler: ToolHandler,
  options?: {
    enabled?: boolean;
    category?: string;
    requiresAuth?: boolean;
  }
): void {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const [key, param] of Object.entries(parameters)) {
    properties[key] = {
      type: param.type,
      description: param.description,
      ...(param.enum && { enum: param.enum }),
    };
    if (param.required) {
      required.push(key);
    }
  }

  toolRegistry.register(
    {
      name,
      description,
      parameters: {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      },
    },
    handler,
    options
  );
}