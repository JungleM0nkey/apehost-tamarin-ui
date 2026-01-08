/**
 * Tools Index
 * Register all built-in tools
 */

import { registerCalculatorTool } from "./calculator";
import { registerDateTimeTool } from "./datetime";
import { registerWebSearchTool } from "./web-search";
import { toolRegistry } from "@/lib/services/tool-registry";

let initialized = false;

/**
 * Initialize all built-in tools
 * Call this once during app startup
 */
export function initializeTools(): void {
  if (initialized) {
    return;
  }

  // Register built-in tools
  registerCalculatorTool();
  registerDateTimeTool();
  registerWebSearchTool();

  initialized = true;
  // Tools initialized: toolRegistry.getAll().length
}

/**
 * Get list of available tool names
 */
export function getAvailableToolNames(): string[] {
  return toolRegistry.getEnabled().map((t) => t.definition.function.name);
}

// Re-export for convenience
export { toolRegistry } from "@/lib/services/tool-registry";
export { registerCalculatorTool } from "./calculator";
export { registerDateTimeTool } from "./datetime";
export { registerWebSearchTool, configureWebSearch } from "./web-search";