"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  Calculator,
  Calendar,
  Globe,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ToolExecutionData {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime: number;
  endTime?: number;
}

interface ToolExecutionIndicatorProps {
  /** List of tool executions to display */
  executions: ToolExecutionData[];
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const toolIcons: Record<string, React.ElementType> = {
  calculator: Calculator,
  datetime: Calendar,
  web_search: Globe,
  search: Search,
};

function getToolIcon(name: string): React.ElementType {
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(toolIcons)) {
    if (lowerName.includes(key)) return icon;
  }
  return Wrench;
}

// ============================================================================
// Single Execution Item
// ============================================================================

interface ExecutionItemProps {
  execution: ToolExecutionData;
  isLast: boolean;
}

function ExecutionItem({ execution, isLast }: ExecutionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const Icon = getToolIcon(execution.name);
  const isActive = execution.status === "pending" || execution.status === "running";

  // Update elapsed time while running
  useEffect(() => {
    if (!isActive) {
      if (execution.endTime) {
        setElapsedTime(execution.endTime - execution.startTime);
      }
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - execution.startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, execution.startTime, execution.endTime]);

  const statusConfig = {
    pending: {
      icon: Loader2,
      color: "text-[#99774f]",
      bgColor: "bg-[#99774f]/10",
      borderColor: "border-[#99774f]/30",
      label: "Waiting...",
      animate: true,
    },
    running: {
      icon: Loader2,
      color: "text-[#ffaa00]",
      bgColor: "bg-[#ffaa00]/10",
      borderColor: "border-[#ffaa00]/30",
      label: "Executing...",
      animate: true,
    },
    success: {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      label: "Done",
      animate: false,
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      label: "Failed",
      animate: false,
    },
  };

  const config = statusConfig[execution.status];
  const StatusIcon = config.icon;

  const formatToolName = (name: string) =>
    name
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        config.bgColor,
        config.borderColor,
        isActive && "shadow-[0_0_10px_rgba(255,170,0,0.15)]"
      )}
    >
      {/* Main Row */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-2 text-left"
        aria-expanded={isExpanded}
      >
        {/* Tool Icon */}
        <div
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
            isActive ? "bg-[#ffaa00]/20" : "bg-[#262626]"
          )}
        >
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>

        {/* Tool Name & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-[#ffddaa] truncate">
              {formatToolName(execution.name)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <StatusIcon
              className={cn(
                "w-3 h-3",
                config.color,
                config.animate && "animate-spin"
              )}
            />
            <span className={config.color}>{config.label}</span>
            <span className="text-[#665544]">
              {elapsedTime}ms
            </span>
          </div>
        </div>

        {/* Expand Toggle */}
        <span className="text-[#665544]">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-[#332211] p-2 space-y-2">
          {/* Arguments */}
          {execution.arguments && Object.keys(execution.arguments).length > 0 && (
            <div>
              <span className="text-xs text-[#665544] block mb-1">Arguments:</span>
              <pre className="text-xs text-[#99774f] bg-[#0d0d0d] rounded p-2 overflow-x-auto">
                {JSON.stringify(execution.arguments, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {execution.status === "success" && execution.result !== undefined && (
            <div>
              <span className="text-xs text-green-600 block mb-1">Result:</span>
              <pre className="text-xs text-green-400 bg-green-950/20 border border-green-900/30 rounded p-2 overflow-x-auto max-h-32">
                {typeof execution.result === "string"
                  ? execution.result
                  : JSON.stringify(execution.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {execution.status === "error" && execution.error && (
            <div>
              <span className="text-xs text-red-600 block mb-1">Error:</span>
              <pre className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded p-2 overflow-x-auto">
                {execution.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ToolExecutionIndicator({
  executions,
  className,
}: ToolExecutionIndicatorProps) {
  if (executions.length === 0) return null;

  const activeCount = executions.filter(
    (e) => e.status === "running" || e.status === "pending"
  ).length;

  return (
    <div
      className={cn("space-y-2", className)}
      role="region"
      aria-label="Tool executions"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-sm">
        <Wrench className="w-4 h-4 text-[#ffaa00]" />
        <span className="font-medium text-[#ffddaa]">
          Tool Execution
        </span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-[#ffaa00]/20 text-[#ffaa00] text-xs">
            {activeCount} running
          </span>
        )}
      </div>

      {/* Execution List */}
      <div className="space-y-1.5">
        {executions.map((execution, index) => (
          <ExecutionItem
            key={execution.id}
            execution={execution}
            isLast={index === executions.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Inline Version
// ============================================================================

interface ToolExecutionBadgeProps {
  execution: ToolExecutionData;
  onClick?: () => void;
}

export function ToolExecutionBadge({ execution, onClick }: ToolExecutionBadgeProps) {
  const Icon = getToolIcon(execution.name);
  const isActive = execution.status === "pending" || execution.status === "running";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
        "transition-all duration-200",
        isActive
          ? "bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/30"
          : execution.status === "success"
          ? "bg-green-500/10 text-green-400 border border-green-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20"
      )}
    >
      <Icon className="w-3 h-3" />
      <span className="max-w-[100px] truncate">
        {execution.name.replace(/_/g, " ")}
      </span>
      {isActive && (
        <Loader2 className="w-3 h-3 animate-spin" />
      )}
    </button>
  );
}

// ============================================================================
// Floating Indicator
// ============================================================================

interface FloatingToolIndicatorProps {
  executions: ToolExecutionData[];
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

export function FloatingToolIndicator({
  executions,
  position = "bottom-right",
}: FloatingToolIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeExecutions = executions.filter(
    (e) => e.status === "running" || e.status === "pending"
  );

  if (activeExecutions.length === 0) return null;

  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
  };

  return (
    <div
      className={cn(
        "fixed z-50",
        positionClasses[position]
      )}
    >
      {isExpanded ? (
        <div className="w-72 bg-[#0d0d0d] border border-[#ffaa00]/30 rounded-lg shadow-lg shadow-[#ffaa00]/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="w-full flex items-center justify-between p-3 bg-[#ffaa00]/10 hover:bg-[#ffaa00]/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#ffaa00]" />
              <span className="font-medium text-[#ffddaa]">
                {activeExecutions.length} Tool{activeExecutions.length > 1 ? "s" : ""} Running
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#99774f]" />
          </button>
          <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
            {activeExecutions.map((exec, index) => (
              <ExecutionItem
                key={exec.id}
                execution={exec}
                isLast={index === activeExecutions.length - 1}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full",
            "bg-[#ffaa00]/20 border border-[#ffaa00]/30",
            "text-[#ffaa00] shadow-lg shadow-[#ffaa00]/10",
            "hover:bg-[#ffaa00]/30 transition-all duration-200",
            "animate-pulse"
          )}
          aria-label="View running tools"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-medium text-sm">
            {activeExecutions.length} tool{activeExecutions.length > 1 ? "s" : ""}
          </span>
          <div className="flex -space-x-1">
            {activeExecutions.slice(0, 3).map((exec) => {
              const Icon = getToolIcon(exec.name);
              return (
                <div
                  key={exec.id}
                  className="w-5 h-5 rounded-full bg-[#262626] border border-[#ffaa00] flex items-center justify-center"
                >
                  <Icon className="w-3 h-3" />
                </div>
              );
            })}
          </div>
        </button>
      )}
    </div>
  );
}