"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  Calculator,
  Calendar,
  Globe,
  Zap,
  Settings,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  category?: string;
  enabled: boolean;
  parameters?: {
    type: string;
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ToolExecution {
  id: string;
  toolName: string;
  status: "pending" | "running" | "success" | "error";
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime: number;
  endTime?: number;
}

interface MCPToolsPanelProps {
  /** List of available tools */
  tools?: MCPTool[];
  /** Currently executing tools */
  executions?: ToolExecution[];
  /** Callback when tool enabled state changes */
  onToolToggle?: (toolName: string, enabled: boolean) => void;
  /** Callback to refresh tools list */
  onRefresh?: () => void;
  /** Whether the panel is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const toolIconMap: Record<string, React.ElementType> = {
  calculator: Calculator,
  datetime: Calendar,
  web_search: Globe,
  search: Search,
  default: Wrench,
};

function getToolIcon(toolName: string): React.ElementType {
  const lowerName = toolName.toLowerCase();
  for (const [key, icon] of Object.entries(toolIconMap)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }
  return toolIconMap.default;
}

const categoryColors: Record<string, string> = {
  utility: "text-blue-400",
  search: "text-green-400",
  math: "text-purple-400",
  time: "text-orange-400",
  default: "text-[#ffaa00]",
};

function getCategoryColor(category?: string): string {
  if (!category) return categoryColors.default;
  return categoryColors[category.toLowerCase()] || categoryColors.default;
}

// ============================================================================
// Tool Card Component
// ============================================================================

interface ToolCardProps {
  tool: MCPTool;
  execution?: ToolExecution;
  onToggle?: (enabled: boolean) => void;
}

function ToolCard({ tool, execution, onToggle }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getToolIcon(tool.name);
  const isExecuting = execution?.status === "running" || execution?.status === "pending";

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        isExecuting
          ? "border-[#ffaa00] bg-[#ffaa00]/5 shadow-[0_0_10px_rgba(255,170,0,0.1)]"
          : tool.enabled
          ? "border-[#332211] bg-[#1a1a1a]/50"
          : "border-[#222] bg-[#0d0d0d]/50 opacity-60"
      )}
    >
      {/* Tool Header */}
      <div className="flex items-center gap-2 p-3">
        {/* Expand/Collapse */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#99774f] hover:text-[#ffaa00] transition-colors"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse tool details" : "Expand tool details"}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Icon with execution indicator */}
        <div className="relative">
          <Icon
            className={cn(
              "w-5 h-5",
              isExecuting ? "text-[#ffaa00]" : getCategoryColor(tool.category)
            )}
          />
          {isExecuting && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ffaa00] rounded-full animate-ping" />
          )}
        </div>

        {/* Tool Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#ffddaa] truncate">
              {formatToolName(tool.name)}
            </span>
            {tool.category && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#262626] text-[#99774f]">
                {tool.category}
              </span>
            )}
          </div>
          {!isExpanded && (
            <p className="text-xs text-[#665544] truncate mt-0.5">
              {tool.description}
            </p>
          )}
        </div>

        {/* Status/Toggle */}
        <div className="flex items-center gap-2">
          {execution && (
            <ExecutionStatus execution={execution} />
          )}
          {onToggle && (
            <button
              type="button"
              onClick={() => onToggle(!tool.enabled)}
              className={cn(
                "transition-colors",
                tool.enabled ? "text-[#ffaa00]" : "text-[#665544]"
              )}
              aria-label={tool.enabled ? "Disable tool" : "Enable tool"}
            >
              {tool.enabled ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-[#332211] p-3 space-y-3">
          <p className="text-sm text-[#99774f]">{tool.description}</p>

          {/* Parameters */}
          {tool.parameters?.properties && Object.keys(tool.parameters.properties).length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[#665544] uppercase tracking-wider mb-2">
                Parameters
              </h4>
              <div className="space-y-1">
                {Object.entries(tool.parameters.properties).map(([name, param]) => {
                  const isRequired = tool.parameters?.required?.includes(name);
                  return (
                    <div key={name} className="flex items-start gap-2 text-sm">
                      <code className="text-[#ffaa00] bg-[#262626] px-1 rounded text-xs">
                        {name}
                      </code>
                      <span className="text-[#665544]">({param.type})</span>
                      {isRequired && (
                        <span className="text-red-400 text-xs">*required</span>
                      )}
                      {param.description && (
                        <span className="text-[#99774f] text-xs flex-1">
                          - {param.description}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Execution */}
          {execution && (
            <div className="pt-2 border-t border-[#332211]">
              <ExecutionDetails execution={execution} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Execution Status Badge
// ============================================================================

interface ExecutionStatusProps {
  execution: ToolExecution;
}

function ExecutionStatus({ execution }: ExecutionStatusProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-[#99774f]",
      label: "Pending",
      animate: "animate-pulse",
    },
    running: {
      icon: Loader2,
      color: "text-[#ffaa00]",
      label: "Running",
      animate: "animate-spin",
    },
    success: {
      icon: CheckCircle,
      color: "text-green-500",
      label: "Success",
      animate: "",
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
      label: "Error",
      animate: "",
    },
  };

  const config = statusConfig[execution.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1" role="status" aria-live="polite">
      <Icon className={cn("w-4 h-4", config.color, config.animate)} />
      <span className="sr-only">{config.label}</span>
    </div>
  );
}

// ============================================================================
// Execution Details
// ============================================================================

interface ExecutionDetailsProps {
  execution: ToolExecution;
}

function ExecutionDetails({ execution }: ExecutionDetailsProps) {
  const duration = execution.endTime
    ? execution.endTime - execution.startTime
    : Date.now() - execution.startTime;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#665544]">Execution</span>
        <span className="text-[#99774f]">{duration}ms</span>
      </div>

      {execution.arguments && Object.keys(execution.arguments).length > 0 && (
        <div>
          <span className="text-xs text-[#665544]">Arguments:</span>
          <pre className="mt-1 text-xs text-[#ffddaa] bg-[#0d0d0d] rounded p-2 overflow-x-auto">
            {JSON.stringify(execution.arguments, null, 2)}
          </pre>
        </div>
      )}

      {execution.status === "success" && execution.result !== undefined && (
        <div>
          <span className="text-xs text-green-600">Result:</span>
          <pre className="mt-1 text-xs text-green-400 bg-green-950/20 border border-green-900/30 rounded p-2 overflow-x-auto">
            {typeof execution.result === "string"
              ? execution.result
              : JSON.stringify(execution.result, null, 2)}
          </pre>
        </div>
      )}

      {execution.status === "error" && execution.error && (
        <div>
          <span className="text-xs text-red-600">Error:</span>
          <pre className="mt-1 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded p-2 overflow-x-auto">
            {execution.error}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Live Execution Ticker
// ============================================================================

interface ExecutionTickerProps {
  executions: ToolExecution[];
}

export function ExecutionTicker({ executions }: ExecutionTickerProps) {
  const activeExecutions = executions.filter(
    (e) => e.status === "running" || e.status === "pending"
  );

  if (activeExecutions.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-[#ffaa00]/10 border border-[#ffaa00]/30 rounded-lg"
      role="status"
      aria-live="polite"
      aria-label="Active tool executions"
    >
      <Zap className="w-4 h-4 text-[#ffaa00] animate-pulse" />
      <span className="text-sm text-[#ffddaa]">
        {activeExecutions.length === 1
          ? `Executing ${formatToolName(activeExecutions[0].toolName)}...`
          : `Executing ${activeExecutions.length} tools...`}
      </span>
      <div className="flex -space-x-1">
        {activeExecutions.slice(0, 3).map((exec) => {
          const Icon = getToolIcon(exec.toolName);
          return (
            <div
              key={exec.id}
              className="w-6 h-6 rounded-full bg-[#262626] border border-[#ffaa00] flex items-center justify-center"
            >
              <Icon className="w-3 h-3 text-[#ffaa00]" />
            </div>
          );
        })}
        {activeExecutions.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-[#262626] border border-[#ffaa00] flex items-center justify-center text-xs text-[#ffaa00]">
            +{activeExecutions.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Panel Component
// ============================================================================

export function MCPToolsPanel({
  tools = [],
  executions = [],
  onToolToggle,
  onRefresh,
  isLoading = false,
  className,
}: MCPToolsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tools by search query
  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get execution for a tool
  const getExecution = (toolName: string) =>
    executions.find((e) => e.toolName === toolName);

  // Count stats
  const enabledCount = tools.filter((t) => t.enabled).length;
  const activeCount = executions.filter(
    (e) => e.status === "running" || e.status === "pending"
  ).length;

  return (
    <div
      className={cn(
        "rounded-lg border border-[#332211] bg-[#0d0d0d] overflow-hidden",
        className
      )}
      role="region"
      aria-label="MCP Tools Panel"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[#1a1a1a] transition-colors"
        aria-expanded={isExpanded}
        aria-controls="mcp-tools-content"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#ffaa00]" />
          <span className="font-medium text-[#ffddaa]">MCP Tools</span>
          {activeCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffaa00]/20 text-[#ffaa00] text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#665544]">
            {enabledCount}/{tools.length} enabled
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[#99774f]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#99774f]" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div id="mcp-tools-content" className="border-t border-[#332211]">
          {/* Search and Actions */}
          <div className="flex items-center gap-2 p-3 border-b border-[#332211]">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#665544]" />
              <input
                type="search"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-8 pr-3 py-1.5 rounded text-sm",
                  "bg-[#1a1a1a] border border-[#332211]",
                  "text-[#ffddaa] placeholder:text-[#665544]",
                  "focus:outline-none focus:border-[#ffaa00]"
                )}
                aria-label="Search tools"
              />
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className={cn(
                  "p-1.5 rounded border border-[#332211]",
                  "text-[#99774f] hover:text-[#ffaa00] hover:border-[#664422]",
                  "transition-colors disabled:opacity-50"
                )}
                aria-label="Refresh tools list"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            )}
          </div>

          {/* Tool List */}
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-[#99774f]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading tools...
              </div>
            ) : filteredTools.length === 0 ? (
              <div className="text-center py-8 text-[#665544]">
                {searchQuery
                  ? "No tools match your search"
                  : "No tools available"}
              </div>
            ) : (
              filteredTools.map((tool) => (
                <ToolCard
                  key={tool.name}
                  tool={tool}
                  execution={getExecution(tool.name)}
                  onToggle={
                    onToolToggle
                      ? (enabled) => onToolToggle(tool.name, enabled)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// ============================================================================
// Hook for fetching tools
// ============================================================================

export function useMCPTools() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tools");
      if (!response.ok) {
        throw new Error("Failed to fetch tools");
      }

      const data = await response.json();
      setTools(
        data.tools.map((t: { name: string; description: string; category?: string; enabled?: boolean; parameters?: MCPTool["parameters"] }) => ({
          name: t.name,
          description: t.description,
          category: t.category || "utility",
          enabled: t.enabled ?? true,
          parameters: t.parameters,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tools");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  // Add an execution
  const addExecution = useCallback((execution: ToolExecution) => {
    setExecutions((prev) => [...prev, execution]);
  }, []);

  // Update an execution
  const updateExecution = useCallback(
    (id: string, updates: Partial<ToolExecution>) => {
      setExecutions((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    },
    []
  );

  // Clear completed executions
  const clearCompleted = useCallback(() => {
    setExecutions((prev) =>
      prev.filter((e) => e.status === "running" || e.status === "pending")
    );
  }, []);

  // Toggle tool enabled state
  const toggleTool = useCallback(async (toolName: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/tools/${toolName}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setTools((prev) =>
          prev.map((t) => (t.name === toolName ? { ...t, enabled } : t))
        );
      }
    } catch {
      // Revert on error - for now just update locally
      setTools((prev) =>
        prev.map((t) => (t.name === toolName ? { ...t, enabled } : t))
      );
    }
  }, []);

  return {
    tools,
    executions,
    isLoading,
    error,
    fetchTools,
    addExecution,
    updateExecution,
    clearCompleted,
    toggleTool,
  };
}